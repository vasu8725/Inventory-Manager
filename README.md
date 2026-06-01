# Inventory & Order Management System

A full-stack containerized system for managing products, customers, orders, and inventory. Built with React, FastAPI, and PostgreSQL.

---

## Live Links

|             | URL                                                 |
| ----------- | --------------------------------------------------- |
| Frontend    | https://inventory-manager-kappa-nine.vercel.app     |
| Backend API | https://inventory-manager-be.onrender.com           |
| API Docs    | https://inventory-manager-be.onrender.com/docs      |
| Docker Hub  | https://hub.docker.com/r/vasu8725/inventory-backend |

> Backend is on Render's free tier — first request after inactivity may take ~50 seconds to wake up.

---

## Tech Stack

| Layer            | Technology                              |
| ---------------- | --------------------------------------- |
| Frontend         | React + Vite, Tailwind CSS              |
| Backend          | Python 3.11, FastAPI                    |
| Database         | PostgreSQL (production), SQLite (local) |
| ORM              | SQLAlchemy + Pydantic v2                |
| Containerization | Docker + Docker Compose                 |
| Hosting          | Vercel (frontend), Render (backend)     |

---

## Features

- Product, customer, and order management with full CRUD
- Customer email must be unique and in a valid format (validated via email-validator)
- Customer phone numbers are validated as real, dialable numbers (validated via phonenumbers)
- Dashboard with totals and low-stock alerts
- Auto stock deduction on order creation, restored on cancellation
- Orders cannot be cancelled after 7 days
- Products with active orders cannot be deleted
- Soft delete on products — deleted products show as `[Deleted]` in order history
- Order status lifecycle: `ACTIVE → SETTLED/CANCELLED`
- Background cronjob auto-settles eligible orders every 24 hours
- Unit price snapshotted at order time — unaffected by future price changes
- SQLite locally (zero setup), PostgreSQL in Docker and production

---

## Running Locally

### With Docker

```bash
git clone https://github.com/vasu8725/Inventory-Manager.git
cd Inventory-Manager

# Create .env file
DATABASE_URL=postgresql://postgres:password@db:5432/inventory_db
FRONTEND_URL=http://localhost:5173

docker-compose up --build
```

| Service      | URL                        |
| ------------ | -------------------------- |
| Frontend     | http://localhost:5173      |
| Backend      | http://localhost:8000      |
| Swagger Docs | http://localhost:8000/docs |

### Without Docker (SQLite — no setup needed)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
```

---

## API Endpoints

| Method         | Endpoint              | Description                   |
| -------------- | --------------------- | ----------------------------- |
| GET/POST       | `/api/products`       | List / create products        |
| GET/PUT/DELETE | `/api/products/{id}`  | Get / update / delete product |
| GET/POST       | `/api/customers`      | List / create customers       |
| GET/DELETE     | `/api/customers/{id}` | Get / delete customer         |
| GET/POST       | `/api/orders`         | List / create orders          |
| GET/DELETE     | `/api/orders/{id}`    | Get / cancel order            |
| GET            | `/api/dashboard`      | Summary stats                 |
| GET            | `/health`             | Health check                  |

---

## Docker Hub

```bash
docker pull vasu8725/inventory-backend:latest
```

---

## License

Built as a technical assessment. All rights reserved.
