import os
import secrets
import warnings
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db = SQLAlchemy()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)

    jwt_secret = os.environ.get("JWT_SECRET_KEY")
    if not jwt_secret:
        jwt_secret = secrets.token_hex(32)
        warnings.warn(
            "JWT_SECRET_KEY is not set — using a random key. "
            "Tokens will be invalidated on every restart. "
            "Set JWT_SECRET_KEY in your environment for production.",
            stacklevel=2,
        )

    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL", "sqlite:///finance.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = jwt_secret

    db.init_app(app)
    jwt.init_app(app)
    CORS(app)

    from auth import auth_bp
    from transactions import transactions_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(transactions_bp, url_prefix="/api")

    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    application = create_app()
    application.run(debug=False)
