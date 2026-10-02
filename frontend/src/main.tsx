import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";
import {
  LayoutDashboard, Boxes, Warehouse, PackageCheck, Truck,
  ChartNoAxesCombined, BrainCircuit, FileText, Bell, Settings,
  Search, ChevronDown, ArrowUpRight, AlertTriangle, MoreHorizontal,
  Menu, X, Download, Send, MapPin
} from "lucide-react";
import "./styles.css";
import { apiFetch } from "./api";

const nav: Array<[string, React.ElementType]> = [
  ["Command Center", LayoutDashboard],
  ["Inventory", Boxes],
  ["Warehouses", Warehouse],
  ["Orders", PackageCheck],
  ["Logistics", Truck],
  ["KPI Intelligence", ChartNoAxesCombined],
  ["Demand Forecast", BrainCircuit],
  ["Reports", FileText],
];

type DashboardData = {
  total_orders: number;
  delivered_orders: number;
  revenue: number;
  delivery_sla: number;
  fill_rate: number;
  [key: string]: unknown;
};

type Product = {
  id?: number | string;
  product_id?: number | string;
  sku?: string;
  name?: string;
  product_name?: string;
  category?: string;
  warehouse?: string;
  warehouse_name?: string;
  quantity?: number;
  stock_quantity?: number;
  reorder_level?: number;
  status?: string;
  [key: string]: unknown;
};

type WarehouseData = {
  id: number;
  name: string;
  city: string;
  capacity: number;
  occupied: number;
  utilization: number;
  employees: number;
  daily_orders: number;
};

type OrderData = {
  reference: string;
  customer: string;
  warehouse: string;
  partner: string;
  value: number;
  status: string;
  order_date: string;
};

type Insight = {
  title?: string;
  name?: string;
  description?: string;
  message?: string;
  severity?: string;
  category?: string;
  [key: string]: unknown;
};

type LateDelivery = {
  reference?: string;
  order_reference?: string;
  customer?: string;
  warehouse?: string;
  partner?: string;
  status?: string;
  expected_delivery?: string;
  [key: string]: unknown;
};

function formatINR(value: number) {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function Kpi({
  name, value, delta, tone = "mint",
}: {
  name: string; value: string; delta: string; tone?: string;
}) {
  return (
    <div className="kpi">
      <div>
        <p>{name}</p>
        <h2>{value}</h2>
        <span className={tone}>{delta}</span>
      </div>
      <div className={"orb " + tone}><ArrowUpRight size={19} /></div>
    </div>
  );
}

function PageHero({
  eyebrow, title, sub, action,
}: {
  eyebrow: string; title: string; sub: string; action?: React.ReactNode;
}) {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="sub">{sub}</p>
      </div>
      {action}
    </section>
  );
}

function LoadingMessage({ loading, error, empty }: {
  loading: boolean; error: string; empty?: boolean;
}) {
  if (loading) return <p className="api-message">Loading live data...</p>;
  if (error) return <p className="api-message" role="alert">{error}</p>;
  if (empty) return <p className="api-message">No records found.</p>;
  return null;
}

function Dashboard({ data, error }: {
  data: DashboardData | null; error: string;
}) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState("");

  useEffect(() => {
    apiFetch<Insight[] | { insights?: Insight[] }>("/api/v1/insights")
      .then((response) => setInsights(Array.isArray(response) ? response : (response.insights ?? [])))
      .catch((err) => {
        console.error("Insights API error:", err);
        setInsightsError("Insights are temporarily unavailable.");
      })
      .finally(() => setInsightsLoading(false));
  }, []);

  const trend = [
    { day: "Mon", orders: 620 }, { day: "Tue", orders: 720 },
    { day: "Wed", orders: 680 }, { day: "Thu", orders: 850 },
    { day: "Fri", orders: 780 }, { day: "Sat", orders: 940 },
    { day: "Sun", orders: 870 },
  ];

  return (
    <>
      <PageHero
        eyebrow="OPERATIONS OVERVIEW"
        title="Your supply chain, in sync."
        sub="A live view of orders, inventory health, and fulfillment performance."
      />
      {error && <p role="alert" className="api-message">{error}</p>}
      <section className="kpis">
        <Kpi name="Gross merchandise value"
          value={data ? formatINR(data.revenue) : "Loading..."}
          delta={data ? "Live backend data" : "Fetching dashboard"} />
        <Kpi name="Orders processed"
          value={data ? data.total_orders.toLocaleString("en-IN") : "Loading..."}
          delta={data ? `${data.delivered_orders.toLocaleString("en-IN")} delivered` : "Fetching dashboard"}
          tone="blue" />
        <Kpi name="Delivery SLA"
          value={data ? `${data.delivery_sla}%` : "Loading..."}
          delta="Live backend data" />
        <Kpi name="Fill rate"
          value={data ? `${data.fill_rate}%` : "Loading..."}
          delta="Live backend data" tone="purple" />
      </section>

      <div className="grid-2">
        <section className="panel chart">
          <div className="panelhead">
            <div><h3>Order activity</h3><p>Operational trend preview</p></div>
          </div>
          <ResponsiveContainer width="100%" height={270}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="orderFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6d5dfc" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#6d5dfc" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e9eef2" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="orders" stroke="#6d5dfc" fill="url(#orderFill)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </section>
        <section className="panel ai">
          <div className="spark">✦</div>
          <p className="eyebrow">OPERATIONAL INSIGHTS</p>
          <h3>{insights[0]?.title ?? insights[0]?.name ?? "Supply chain insights"}</h3>
          <p>{insights[0]?.description ?? insights[0]?.message ?? (insightsError || (insightsLoading ? "Loading insights..." : "Explore the operational pages for current performance details."))}</p>
          {insights.length > 1 && <p>{insights[1].description ?? insights[1].message ?? insights[1].title ?? ""}</p>}
          <button className="outline" onClick={() => window.dispatchEvent(new CustomEvent("flowops:navigate", { detail: "KPI Intelligence" }))}>
            View insights <ArrowUpRight size={16} />
          </button>
        </section>
      </div>

      <section className="panel tablepanel">
        <div className="panelhead">
          <div><h3>Network performance</h3><p>Key metrics returned by the backend</p></div>
        </div>
        <table>
          <thead><tr><th>Metric</th><th>Current</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>Orders processed</td><td>{data ? data.total_orders.toLocaleString("en-IN") : "—"}</td><td>Live</td></tr>
            <tr><td>Delivered orders</td><td>{data ? data.delivered_orders.toLocaleString("en-IN") : "—"}</td><td>Live</td></tr>
            <tr><td>Delivery SLA</td><td>{data ? `${data.delivery_sla}%` : "—"}</td><td>Live</td></tr>
            <tr><td>Fill rate</td><td>{data ? `${data.fill_rate}%` : "—"}</td><td>Live</td></tr>
          </tbody>
        </table>
      </section>
    </>
  );
}

function Inventory() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch<Product[] | { products?: Product[] }>("/api/v1/products")
      .then((response) => setItems(Array.isArray(response) ? response : (response.products ?? [])))
      .catch((err) => {
        console.error("Products API error:", err);
        setError("Unable to load products. Check your backend connection.");
      })
      .finally(() => setLoading(false));
  }, []);

  const stockOf = (p: Product) => Number(p.quantity ?? p.stock_quantity ?? p.on_hand ?? 0);
  const reorderOf = (p: Product) => Number(p.reorder_level ?? p.reorder_point ?? 0);
  const healthOf = (p: Product) => String(p.status ?? (stockOf(p) <= reorderOf(p) ? "Low stock" : "Healthy"));
  const filtered = items.filter((p) =>
    [p.sku, p.name, p.product_name, p.category, p.warehouse, p.warehouse_name, p.supplier]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(search.toLowerCase()))
  );
  const lowStock = items.filter((p) => stockOf(p) <= reorderOf(p)).length;

  return <>
    <PageHero eyebrow="INVENTORY CONTROL" title="Stock, optimized."
      sub="Monitor inventory health across all fulfillment centers."
      action={<button className="primary">+ Add inventory</button>} />
    <section className="kpis">
      <Kpi name="Total SKUs" value={loading ? "Loading..." : items.length.toLocaleString("en-IN")} delta="Live data" />
      <Kpi name="Low stock SKUs" value={loading ? "Loading..." : lowStock.toLocaleString("en-IN")} delta="Calculated from stock levels" tone="orange" />
      <Kpi name="Inventory value" value="—" delta="Not returned by products endpoint" tone="blue" />
      <Kpi name="Stockout rate" value="—" delta="Not returned by products endpoint" tone="purple" />
    </section>
    <section className="panel tablepanel">
      <div className="toolbar">
        <div className="search"><Search size={17} /><input placeholder="Search by SKU, product or supplier" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>
      <LoadingMessage loading={loading} error={error} empty={!loading && !error && filtered.length === 0} />
      {!loading && !error && filtered.length > 0 && <table>
        <thead><tr>{["SKU", "Product", "Category", "Warehouse", "On hand", "Reorder level", "Health", ""].map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{filtered.map((p, i) => {
          const health = healthOf(p);
          return <tr key={String(p.id ?? p.product_id ?? p.sku ?? i)}>
            <td>{p.sku ?? "—"}</td><td>{p.name ?? p.product_name ?? "—"}</td>
            <td>{p.category ?? "—"}</td><td>{p.warehouse_name ?? p.warehouse ?? "—"}</td>
            <td>{stockOf(p).toLocaleString("en-IN")}</td><td>{p.reorder_level ?? p.reorder_point ?? "—"}</td>
            <td><span className={"badge " + health.toLowerCase().replaceAll(" ", "-")}>{health}</span></td><td><MoreHorizontal size={17} /></td>
          </tr>;
        })}</tbody>
      </table>}
    </section>
  </>;
}

function Warehouses() {
  const [items, setItems] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    apiFetch<WarehouseData[]>("/api/v1/warehouses")
      .then(setItems)
      .catch((err) => { console.error("Warehouses API error:", err); setError("Unable to load warehouses."); })
      .finally(() => setLoading(false));
  }, []);
  const total = (key: "daily_orders" | "employees") => items.reduce((sum, w) => sum + Number(w[key] || 0), 0);
  const avgUtil = items.length ? items.reduce((sum, w) => sum + Number(w.utilization || 0), 0) / items.length : 0;
  return <>
    <PageHero eyebrow="WAREHOUSE OPERATIONS" title="Every warehouse, in view." sub="Monitor capacity, utilization, and daily fulfillment activity." />
    <section className="kpis">
      <Kpi name="Total warehouses" value={loading ? "Loading..." : String(items.length)} delta="Live data" />
      <Kpi name="Average utilization" value={loading ? "Loading..." : items.length ? `${avgUtil.toFixed(1)}%` : "—"} delta="Live data" tone="blue" />
      <Kpi name="Daily orders" value={loading ? "Loading..." : total("daily_orders").toLocaleString("en-IN")} delta="Live data" />
      <Kpi name="Total employees" value={loading ? "Loading..." : total("employees").toLocaleString("en-IN")} delta="Live data" tone="purple" />
    </section>
    <section className="panel tablepanel">
      <div className="panelhead"><div><h3>Warehouse network</h3><p>Live capacity and operational details</p></div></div>
      <LoadingMessage loading={loading} error={error} empty={!loading && !error && items.length === 0} />
      {!loading && !error && items.length > 0 && <table>
        <thead><tr>{["Warehouse", "City", "Capacity", "Occupied", "Utilization", "Employees", "Daily orders"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{items.map((w) => <tr key={w.id}>
          <td>{w.name}</td><td>{w.city}</td><td>{w.capacity.toLocaleString("en-IN")}</td><td>{w.occupied.toLocaleString("en-IN")}</td>
          <td><span className={"badge " + (w.utilization >= 90 ? "low-stock" : "healthy")}>{w.utilization}%</span></td>
          <td>{w.employees.toLocaleString("en-IN")}</td><td>{w.daily_orders.toLocaleString("en-IN")}</td>
        </tr>)}</tbody>
      </table>}
    </section>
  </>;
}

function Orders() {
  const [items, setItems] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    apiFetch<OrderData[] | { orders?: OrderData[] }>("/api/v1/orders?skip=0&limit=50")
      .then((response) => setItems(Array.isArray(response) ? response : (response.orders ?? [])))
      .catch((err) => { console.error("Orders API error:", err); setError("Unable to load orders."); })
      .finally(() => setLoading(false));
  }, []);
  const filtered = items.filter((o) =>
    [o.reference, o.customer, o.warehouse, o.partner, o.status]
      .some((v) => String(v ?? "").toLowerCase().includes(search.toLowerCase()))
  );
  const delivered = items.filter((o) => o.status?.toLowerCase() === "delivered").length;
  const shipped = items.filter((o) => o.status?.toLowerCase() === "shipped").length;
  return <>
    <PageHero eyebrow="ORDER MANAGEMENT" title="Every order, tracked." sub="Monitor order status and fulfillment across your network." />
    <section className="kpis">
      <Kpi name="Orders loaded" value={loading ? "Loading..." : items.length.toLocaleString("en-IN")} delta="Up to 50 recent orders" />
      <Kpi name="Delivered" value={loading ? "Loading..." : delivered.toLocaleString("en-IN")} delta="Loaded orders" tone="blue" />
      <Kpi name="Shipped" value={loading ? "Loading..." : shipped.toLocaleString("en-IN")} delta="Loaded orders" />
      <Kpi name="Order value" value={loading ? "Loading..." : formatINR(items.reduce((sum, o) => sum + Number(o.value || 0), 0))} delta="Loaded orders" tone="purple" />
    </section>
    <section className="panel tablepanel">
      <div className="toolbar"><div className="search"><Search size={17} /><input placeholder="Search order, customer, warehouse or status" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
      <LoadingMessage loading={loading} error={error} empty={!loading && !error && filtered.length === 0} />
      {!loading && !error && filtered.length > 0 && <table>
        <thead><tr>{["Order", "Customer", "Fulfillment center", "Partner", "Status", "Value", "Order date"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{filtered.map((o) => <tr key={o.reference}>
          <td>{o.reference}</td><td>{o.customer}</td><td>{o.warehouse}</td><td>{o.partner}</td>
          <td><span className={"badge " + o.status.toLowerCase().replaceAll(" ", "-")}>{o.status}</span></td>
          <td>{formatINR(Number(o.value || 0))}</td><td>{o.order_date ? new Date(o.order_date).toLocaleString("en-IN") : "—"}</td>
        </tr>)}</tbody>
      </table>}
    </section>
  </>;
}

function Logistics() {
  const [items, setItems] = useState<LateDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    apiFetch<LateDelivery[] | { deliveries?: LateDelivery[] }>("/api/v1/logistics/late-deliveries")
      .then((response) => setItems(Array.isArray(response) ? response : (response.deliveries ?? [])))
      .catch((err) => { console.error("Late deliveries API error:", err); setError("Unable to load late deliveries."); })
      .finally(() => setLoading(false));
  }, []);
  return <>
    <PageHero eyebrow="LOGISTICS CONTROL" title="Keep deliveries moving." sub="Review late-delivery records returned by the logistics service." />
    <section className="kpis"><Kpi name="Late deliveries returned" value={loading ? "Loading..." : String(items.length)} delta="Live API data" tone="orange" /></section>
    <section className="panel tablepanel">
      <div className="panelhead"><div><h3>Late deliveries</h3><p>Records from the logistics endpoint</p></div></div>
      <LoadingMessage loading={loading} error={error} empty={!loading && !error && items.length === 0} />
      {!loading && !error && items.length > 0 && <table>
        <thead><tr>{["Order reference", "Customer", "Warehouse", "Partner", "Status", "Expected delivery"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{items.map((d, i) => <tr key={String(d.reference ?? d.order_reference ?? i)}>
          <td>{d.reference ?? d.order_reference ?? "—"}</td><td>{d.customer ?? "—"}</td><td>{d.warehouse ?? "—"}</td><td>{d.partner ?? "—"}</td><td>{d.status ?? "Late"}</td><td>{d.expected_delivery ? new Date(d.expected_delivery).toLocaleString("en-IN") : "—"}</td>
        </tr>)}</tbody>
      </table>}
    </section>
  </>;
}

function Analytics({ type }: { type: string }) {
  const isForecast = type === "Forecast";
  const [forecast, setForecast] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isForecast) { setLoading(false); return; }
    apiFetch<unknown[] | { forecast?: unknown[]; data?: unknown[] }>("/api/v1/forecast")
      .then((response) => {
        const rows = Array.isArray(response) ? response : (response.forecast ?? response.data ?? []);
        setForecast(rows);
      })
      .catch((err) => { console.error("Forecast API error:", err); setError("Forecast endpoint could not be loaded; displaying no fabricated forecast."); })
      .finally(() => setLoading(false));
  }, [isForecast]);

  const chartData = forecast.map((row: any, i) => ({
    label: String(row.date ?? row.day ?? row.ds ?? row.period ?? `Point ${i + 1}`),
    value: Number(row.forecast ?? row.prediction ?? row.predicted_demand ?? row.demand ?? row.value ?? row.y ?? 0),
  })).filter((row) => Number.isFinite(row.value));

  const kpis = [
    ["Perfect order rate", "—", "—", "Use KPI endpoint when available"],
    ["Order cycle time", "—", "—", "Use KPI endpoint when available"],
    ["Return rate", "—", "—", "Use KPI endpoint when available"],
    ["Route efficiency", "—", "—", "Use KPI endpoint when available"],
  ];

  return <>
    <PageHero eyebrow={isForecast ? "DEMAND INTELLIGENCE" : "PERFORMANCE ANALYTICS"}
      title={isForecast ? "Demand, ahead of time." : "Metrics that move operations."}
      sub={isForecast ? "Forecast values retrieved from the FastAPI service." : "Operational metrics and performance analysis."}
      action={<button className="primary" onClick={() => isForecast ? window.location.assign("http://127.0.0.1:8000/api/v1/forecast") : window.location.assign("http://127.0.0.1:8000/api/v1/insights")}><Download size={16} /> Open API data</button>} />
    <div className="grid-2">
      <section className="panel chart">
        <div className="panelhead"><div><h3>{isForecast ? "Demand forecast" : "KPI trend"}</h3><p>{isForecast ? "Forecast endpoint data" : "Live operational insight summary"}</p></div></div>
        {isForecast && loading && <p className="api-message">Loading forecast...</p>}
        {isForecast && error && <p role="alert" className="api-message">{error}</p>}
        {isForecast && !loading && !error && chartData.length === 0 && <p className="api-message">No chart-compatible forecast rows returned. Inspect the API response schema to map fields.</p>}
        {isForecast && chartData.length > 0 && <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}><CartesianGrid vertical={false} stroke="#e9eef2" /><XAxis dataKey="label" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Line type="monotone" dataKey="value" stroke="#6d5dfc" strokeWidth={3} dot={{ fill: "#6d5dfc" }} /></LineChart>
        </ResponsiveContainer>}
        {!isForecast && <p className="api-message">Detailed KPI metrics are not exposed by a dedicated KPI endpoint in the current backend routes. Dashboard metrics above use live backend data.</p>}
      </section>
      <section className="panel ai">
        <div className="spark">✦</div><p className="eyebrow">OPERATIONS NOTE</p>
        <h3>{isForecast ? "Plan replenishment using the forecast." : "Review live operational metrics."}</h3>
        <p>{isForecast ? "Use forecast output alongside stock levels and warehouse capacity before making replenishment decisions." : "The Command Center and operational pages display data returned by the current API endpoints."}</p>
      </section>
    </div>
    {!isForecast && <section className="panel tablepanel"><div className="panelhead"><div><h3>Key performance indicators</h3><p>Metrics not available from the current API are intentionally left blank.</p></div></div><table><thead><tr><th>Metric</th><th>Current</th><th>Target</th><th>Notes</th></tr></thead><tbody>{kpis.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></section>}
  </>;
}

function Reports() {
  const [error, setError] = useState("");
  const downloadReport = async () => {
    try {
      const base = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
      const token = localStorage.getItem("flowops_token");
      const response = await fetch(`${base}/api/v1/reports/orders.csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error(`Report request failed (${response.status})`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "flowops-orders-report.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      setError("");
    } catch (err) {
      console.error("Report download error:", err);
      setError("Could not download the report. Check authentication and backend status.");
    }
  };
  return <>
    <PageHero eyebrow="REPORTING & EXPORTS" title="Reports, ready when you are." sub="Export order records from your authenticated FastAPI backend." action={<button className="primary" onClick={downloadReport}><Download size={16} /> Export orders CSV</button>} />
    <section className="panel ai"><p className="eyebrow">ORDER REPORT</p><h3>Download order data</h3><p>The CSV is generated by the backend report endpoint.</p>{error && <p role="alert">{error}</p>}<button className="outline" onClick={downloadReport}><Download size={16} /> Download orders CSV</button></section>
  </>;
}

function App() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState("");
  const [page, setPage] = useState("Command Center");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiFetch<DashboardData>("/api/v1/dashboard")
      .then((data) => { setDashboardData(data); setDashboardError(""); })
      .catch((err) => { console.error("Dashboard API error:", err); setDashboardError("Unable to load dashboard data. Check your login and backend connection."); });
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const nextPage = (event as CustomEvent<string>).detail;
      if (nav.some(([label]) => label === nextPage)) setPage(nextPage);
    };
    window.addEventListener("flowops:navigate", handler);
    return () => window.removeEventListener("flowops:navigate", handler);
  }, []);

  const content = useMemo(() => {
    switch (page) {
      case "Command Center": return <Dashboard data={dashboardData} error={dashboardError} />;
      case "Inventory": return <Inventory />;
      case "Warehouses": return <Warehouses />;
      case "Orders": return <Orders />;
      case "Logistics": return <Logistics />;
      case "KPI Intelligence": return <Analytics type="Analytics" />;
      case "Demand Forecast": return <Analytics type="Forecast" />;
      case "Reports": return <Reports />;
      default: return <Dashboard data={dashboardData} error={dashboardError} />;
    }
  }, [page, dashboardData, dashboardError]);

  return <div className="app">
    <aside className={open ? "open" : ""}>
      <div className="brand"><span>F</span> flowops<small>AI</small><button className="close" onClick={() => setOpen(false)}><X /></button></div>
      <nav>{nav.map(([label, Icon]) => <button key={label} className={page === label ? "active" : ""} onClick={() => { setPage(label); setOpen(false); }}><Icon size={19} />{label}{label === "Inventory" && <em>18</em>}</button>)}</nav>
      <div className="navfoot">
        <button><Bell size={19} />Notifications <em>3</em></button>
        <button><Settings size={19} />Settings</button>
        <div className="profile"><div>NM</div><span><b>Neeraja M J</b><small>Operations Director</small></span><ChevronDown size={15} /></div>
      </div>
    </aside>
    <main>
      <header>
        <button className="hamb" onClick={() => setOpen(true)}><Menu /></button>
        <div className="crumb">Operations <span>/</span> {page}</div>
        <div className="headright">
          <div className="global-search"><Search size={17} /><span>Search anything</span><kbd>⌘ K</kbd></div>
          <button className="help">?</button><div className="avatar">NM</div>
        </div>
      </header>
      <div className="content">{content}</div>
    </main>
    <button className="ask" onClick={() => setPage("KPI Intelligence")}><BrainCircuit size={18} /> Ask FlowOps AI</button>
  </div>;
}

createRoot(document.getElementById("root")!).render(<App />);
