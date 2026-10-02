# API overview

All protected endpoints use `Authorization: Bearer <token>`. Obtain the token with `POST /api/v1/auth/token` using form data (`username`, `password`). Interactive OpenAPI documentation is at `/docs`.

| Area | Endpoint | Purpose |
|---|---|---|
| Authentication | `POST /api/v1/auth/token` | Sign in and receive JWT |
| Dashboard | `GET /api/v1/dashboard` | Executive KPIs |
| Inventory | `GET, POST /api/v1/products` | Search and add products |
| Inventory | `DELETE /api/v1/products/{id}` | Admin-only product removal |
| Warehouses | `GET /api/v1/warehouses` | Capacity and utilization |
| Orders | `GET /api/v1/orders` | Paginated order operations view |
| Intelligence | `GET /api/v1/forecast`, `/insights` | 30-day Random Forest demand forecast and root-cause insight |
| Logistics | `GET /api/v1/logistics/late-deliveries` | Late-order detection and delivery SLA |
| AI Assistant | `POST /api/v1/assistant` | Gemini-powered operational Q&A; demo fallback without a key |
| Reports | `GET /api/v1/reports/orders.csv` | Download order export |
