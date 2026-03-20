# 💰 Finance Tracker

A full-stack personal finance dashboard built with **React + Flask**. Track your income, expenses, and budgets — all in one place.

![Finance Tracker](https://img.shields.io/badge/Status-Active-00d9ff?style=flat)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat&logo=react)
![Flask](https://img.shields.io/badge/Flask-3.0-white?style=flat&logo=flask&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8?style=flat&logo=tailwindcss)

## ✨ Features

- 🔐 **JWT Authentication** — secure register/login with hashed passwords
- 💳 **Transaction Management** — add, edit, delete income & expense entries
- 📊 **Dashboard Analytics** — balance summary, 6-month trend chart, category breakdown
- 🎯 **Budget Tracker** — set monthly category budgets with progress bars
- 📱 **Responsive Design** — works on mobile, tablet, and desktop
- 🌙 **Dark UI** — built with Tailwind CSS dark theme

## 🖼️ Screenshots

| Dashboard | Transactions | Budgets |
|-----------|-------------|---------|
| Balance, charts & recent activity | Filter, add, edit & delete | Set limits with live progress |

## 🛠️ Tech Stack

| Layer     | Technology                                          |
|-----------|-----------------------------------------------------|
| Frontend  | React 18, React Router 6, Recharts, Tailwind CSS 3  |
| Backend   | Python Flask 3, SQLAlchemy, Flask-JWT-Extended      |
| Database  | SQLite (dev) / PostgreSQL (prod)                    |
| Build     | Vite 5                                              |

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend

```bash
cd finance-tracker/backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # fill in JWT_SECRET_KEY
python app.py
```

The API runs at `http://localhost:5000`.

### Frontend

```bash
cd finance-tracker/frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/transactions` | List transactions (filterable) |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/summary` | Monthly income/expense summary + trend |
| GET | `/api/budgets` | List budgets with spent amounts |
| POST | `/api/budgets` | Create/update budget |
| DELETE | `/api/budgets/:id` | Delete budget |
| GET | `/api/categories` | Available categories |

## 🗂️ Project Structure

```
finance-tracker/
├── backend/
│   ├── app.py              # Flask app factory
│   ├── models.py           # SQLAlchemy models (User, Transaction, Budget)
│   ├── auth.py             # Auth routes
│   ├── transactions.py     # Transaction & budget routes
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx
        ├── api/            # Axios client
        ├── context/        # AuthContext (JWT state)
        └── components/
            ├── Dashboard.jsx
            ├── Transactions.jsx
            ├── Budgets.jsx
            └── ...
```

## 🔒 Security

- Passwords hashed with Werkzeug's `pbkdf2:sha256`
- JWT tokens expire after 1 hour (configurable)
- All protected routes require `Authorization: Bearer <token>`
- Input validation on both client and server

## 📄 License

MIT
