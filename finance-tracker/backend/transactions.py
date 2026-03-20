from datetime import datetime, date as date_type
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import extract
from app import db
from models import Transaction, Budget

transactions_bp = Blueprint("transactions", __name__)

CATEGORIES = {
    "income": ["Salary", "Freelance", "Investment", "Gift", "Other"],
    "expense": [
        "Food",
        "Transport",
        "Housing",
        "Entertainment",
        "Health",
        "Shopping",
        "Education",
        "Utilities",
        "Other",
    ],
}


@transactions_bp.route("/categories", methods=["GET"])
def get_categories():
    return jsonify(CATEGORIES)


# ── Transactions ──────────────────────────────────────────────────────────────

@transactions_bp.route("/transactions", methods=["GET"])
@jwt_required()
def get_transactions():
    user_id = int(get_jwt_identity())
    month = request.args.get("month", type=int)
    year = request.args.get("year", type=int)
    category = request.args.get("category")
    type_ = request.args.get("type")

    query = Transaction.query.filter_by(user_id=user_id)

    if month and year:
        query = query.filter(
            extract("month", Transaction.date) == month,
            extract("year", Transaction.date) == year,
        )
    if category:
        query = query.filter_by(category=category)
    if type_:
        query = query.filter_by(type=type_)

    transactions = query.order_by(Transaction.date.desc(), Transaction.created_at.desc()).all()
    return jsonify([t.to_dict() for t in transactions])


@transactions_bp.route("/transactions", methods=["POST"])
@jwt_required()
def add_transaction():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    if not data or not all(k in data for k in ("amount", "type", "category", "date")):
        return jsonify({"error": "Missing required fields"}), 400

    if data["type"] not in ("income", "expense"):
        return jsonify({"error": "type must be 'income' or 'expense'"}), 400

    try:
        amount = float(data["amount"])
        if amount <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "amount must be a positive number"}), 400

    try:
        txn_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "date must be in YYYY-MM-DD format"}), 400

    transaction = Transaction(
        user_id=user_id,
        amount=amount,
        type=data["type"],
        category=data["category"],
        description=data.get("description", ""),
        date=txn_date,
    )
    db.session.add(transaction)
    db.session.commit()
    return jsonify(transaction.to_dict()), 201


@transactions_bp.route("/transactions/<int:transaction_id>", methods=["PUT"])
@jwt_required()
def update_transaction(transaction_id):
    user_id = int(get_jwt_identity())
    transaction = Transaction.query.filter_by(
        id=transaction_id, user_id=user_id
    ).first_or_404()

    data = request.get_json() or {}

    if "amount" in data:
        try:
            amount = float(data["amount"])
            if amount <= 0:
                raise ValueError
            transaction.amount = amount
        except (TypeError, ValueError):
            return jsonify({"error": "amount must be a positive number"}), 400

    if "type" in data:
        if data["type"] not in ("income", "expense"):
            return jsonify({"error": "type must be 'income' or 'expense'"}), 400
        transaction.type = data["type"]

    if "category" in data:
        transaction.category = data["category"]
    if "description" in data:
        transaction.description = data["description"]

    if "date" in data:
        try:
            transaction.date = datetime.strptime(data["date"], "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "date must be in YYYY-MM-DD format"}), 400

    db.session.commit()
    return jsonify(transaction.to_dict())


@transactions_bp.route("/transactions/<int:transaction_id>", methods=["DELETE"])
@jwt_required()
def delete_transaction(transaction_id):
    user_id = int(get_jwt_identity())
    transaction = Transaction.query.filter_by(
        id=transaction_id, user_id=user_id
    ).first_or_404()
    db.session.delete(transaction)
    db.session.commit()
    return jsonify({"message": "Transaction deleted"})


# ── Summary ───────────────────────────────────────────────────────────────────

@transactions_bp.route("/summary", methods=["GET"])
@jwt_required()
def get_summary():
    user_id = int(get_jwt_identity())
    now = date_type.today()
    month = request.args.get("month", type=int, default=now.month)
    year = request.args.get("year", type=int, default=now.year)

    monthly = Transaction.query.filter(
        Transaction.user_id == user_id,
        extract("month", Transaction.date) == month,
        extract("year", Transaction.date) == year,
    ).all()

    income = sum(t.amount for t in monthly if t.type == "income")
    expenses = sum(t.amount for t in monthly if t.type == "expense")

    by_category = {}
    for t in monthly:
        by_category[t.category] = round(by_category.get(t.category, 0) + t.amount, 2)

    # Last 6 months trend
    trend = []
    base = year * 12 + month
    for i in range(5, -1, -1):
        total = base - i
        m = (total - 1) % 12 + 1
        y = (total - 1) // 12
        txns = Transaction.query.filter(
            Transaction.user_id == user_id,
            extract("month", Transaction.date) == m,
            extract("year", Transaction.date) == y,
        ).all()
        trend.append(
            {
                "month": m,
                "year": y,
                "income": round(sum(t.amount for t in txns if t.type == "income"), 2),
                "expenses": round(sum(t.amount for t in txns if t.type == "expense"), 2),
            }
        )

    return jsonify(
        {
            "income": round(income, 2),
            "expenses": round(expenses, 2),
            "balance": round(income - expenses, 2),
            "by_category": by_category,
            "trend": trend,
        }
    )


# ── Budgets ───────────────────────────────────────────────────────────────────

@transactions_bp.route("/budgets", methods=["GET"])
@jwt_required()
def get_budgets():
    user_id = int(get_jwt_identity())
    now = date_type.today()
    month = request.args.get("month", type=int, default=now.month)
    year = request.args.get("year", type=int, default=now.year)

    budgets = Budget.query.filter_by(
        user_id=user_id, month=month, year=year
    ).all()

    result = []
    for b in budgets:
        spent = (
            db.session.query(db.func.sum(Transaction.amount))
            .filter(
                Transaction.user_id == user_id,
                Transaction.type == "expense",
                Transaction.category == b.category,
                extract("month", Transaction.date) == month,
                extract("year", Transaction.date) == year,
            )
            .scalar()
            or 0
        )
        d = b.to_dict()
        d["spent"] = round(float(spent), 2)
        result.append(d)

    return jsonify(result)


@transactions_bp.route("/budgets", methods=["POST"])
@jwt_required()
def set_budget():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    if not data or not all(k in data for k in ("category", "limit", "month", "year")):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        limit = float(data["limit"])
        if limit <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "limit must be a positive number"}), 400

    existing = Budget.query.filter_by(
        user_id=user_id,
        category=data["category"],
        month=int(data["month"]),
        year=int(data["year"]),
    ).first()

    if existing:
        existing.limit = limit
        db.session.commit()
        return jsonify(existing.to_dict())

    budget = Budget(
        user_id=user_id,
        category=data["category"],
        limit=limit,
        month=int(data["month"]),
        year=int(data["year"]),
    )
    db.session.add(budget)
    db.session.commit()
    return jsonify(budget.to_dict()), 201


@transactions_bp.route("/budgets/<int:budget_id>", methods=["DELETE"])
@jwt_required()
def delete_budget(budget_id):
    user_id = int(get_jwt_identity())
    budget = Budget.query.filter_by(id=budget_id, user_id=user_id).first_or_404()
    db.session.delete(budget)
    db.session.commit()
    return jsonify({"message": "Budget deleted"})
