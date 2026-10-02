# FlowOps AI — Supply Chain Analytics

An enterprise-style supply chain operations platform for inventory, fulfillment, warehouse, and delivery intelligence.

## Quick start

```bash
docker compose up --build
```

Open `http://localhost:5173` for the dashboard and `http://localhost:8000/docs` for the API. The API seeds 10,000 simulated orders on first startup.

## Architecture

`React + TypeScript` client → `FastAPI` REST API → `PostgreSQL`. The backend has JWT authentication, role-aware endpoints, SQLAlchemy entities, reporting exports and a deterministic forecasting service. The dashboard uses a local demo fallback so it remains useful while the API is booting.

## Features

- Executive dashboard with SLA, fill rate, utilization, and revenue KPIs
- Inventory search/filtering with low-stock and overstock flags
- Warehouse, order, logistics, forecasting, RCA, reporting and administration views
- Role-ready authentication (`admin`, `warehouse_manager`, `logistics_manager`, `operations_analyst`)
- CSV report export, OpenAPI docs, Docker Compose, environment-based configuration
- A real `RandomForestRegressor` demand model trained on daily historical order data, returning a 30-day forecast
- Gemini-ready AI assistant endpoint with a safe demo fallback when no API key is configured

## Demo credentials

`admin@flowops.ai` / `FlowOps!2026`

## Local development

```bash
cd backend && python -m venv .venv && .venv\\Scripts\\activate && pip install -r requirements.txt && uvicorn app.main:app --reload
cd frontend && npm install && npm run dev
```

## AWS deployment

Set `DATABASE_URL`, `SECRET_KEY`, and `CORS_ORIGINS` as environment variables. Run the compose stack on EC2 behind an ALB or reverse proxy; use RDS PostgreSQL for production. Build the frontend image and serve it through CloudFront/S3 or the included Nginx container. Never use the demonstration secret or credentials in production.

To enable live Gemini analysis, add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) to the API environment. The application degrades to a deterministic demo insight if no key is supplied, so credentials are never exposed in the browser.
