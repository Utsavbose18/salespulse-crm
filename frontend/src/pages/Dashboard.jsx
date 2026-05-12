import { useEffect, useState } from "react";
import API from "../api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Activity, PhoneCall, CalendarClock, CheckCircle2 } from "lucide-react";

const PALETTE = [
  "#2f7fb0", "#22a06b", "#dc5b5b", "#d99218",
  "#8b6ad9", "#17a2b8", "#ef8f3f", "#84b547",
  "#d35d8f", "#5a6fd6",
];
const color = (i) => PALETTE[i % PALETTE.length];

function StatCard({ label, value, sub, accent, icon: Icon }) {
  return (
    <div className="crm-stat-card flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <div className="crm-stat-label">{label}</div>
        {Icon && (
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dce7f1] bg-[#f8fbff] text-[var(--brand-strong)]">
            <Icon size={18} />
          </span>
        )}
      </div>
      <div className={`crm-stat-value ${accent ?? ""}`}>{value ?? 0}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-extrabold text-slate-500 uppercase tracking-[0.16em] mb-3">
      {children}
    </p>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="crm-card">
      <div className="crm-card-header">
        <h3 className="crm-card-title">{title}</h3>
        {subtitle && <p className="crm-card-subtitle">{subtitle}</p>}
      </div>
      <div className="crm-card-body">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  contentStyle: {
    background: "#ffffff",
    border: "1px solid #dbe5f0",
    borderRadius: 14,
    boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
    fontSize: 12,
    color: "#10243e",
  },
  labelStyle: { color: "#37506c", fontWeight: 700 },
};

export default function Dashboard() {
  const [dash, setDash] = useState(null);
  const [trend, setTrend] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [dashRes, trendRes, fuRes] = await Promise.all([
          API.get("/api/dashboard/"),
          API.get("/api/dashboard/trend?days=30"),
          API.get("/api/followups/?skip=0&limit=100"),
        ]);

        setDash(dashRes.data);
        setTrend(trendRes.data.trend ?? []);

        const fuData = fuRes.data;
        setFollowups(Array.isArray(fuData) ? fuData : fuData.followups ?? []);
      } catch (err) {
        console.error("Dashboard error:", err);
        setError("Failed to load dashboard data. Check your connection.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="crm-card p-10 text-center">
        <h2 className="text-2xl font-semibold text-[var(--text)]">Loading Dashboard...</h2>
        <p className="text-slate-500 mt-2">Fetching KPI metrics and chart insights</p>
      </div>
    );
  }

  if (error || !dash) {
    return (
      <div className="crm-card p-10 text-center">
        <h2 className="text-xl font-semibold text-[#c44e4e]">Dashboard Error</h2>
        <p className="text-slate-500 mt-2">{error ?? "No data returned."}</p>
      </div>
    );
  }

  const kpi = dash.kpi;

  const totalFU = followups.length;
  const pendingFU = followups.filter((f) => f.status === "Pending").length;
  const completedFU = followups.filter((f) => f.status === "Completed").length;
  const rescheduled = followups.filter((f) => f.status === "Rescheduled").length;
  const overdueCount = followups.filter(
    (f) => f.status !== "Completed" && f.follow_up_date && new Date(f.follow_up_date) < new Date()
  ).length;

  const pieStatusData = (dash.leads_by_status ?? [])
    .filter((d) => d.count > 0)
    .map((d) => ({ name: d.status, value: d.count }));

  const pieSourceData = (dash.leads_by_source ?? [])
    .filter((d) => d.count > 0)
    .map((d) => ({ name: d.source, value: d.count }));

  const typeBarData = (dash.leads_by_type ?? [])
    .filter((d) => d.count > 0)
    .map((d) => ({ name: d.lead_type, count: d.count }));

  const fuBarData = [
    { name: "Pending", count: pendingFU, fill: "#d99218" },
    { name: "Completed", count: completedFU, fill: "#22a06b" },
    { name: "Rescheduled", count: rescheduled, fill: "#2f7fb0" },
  ].filter((d) => d.count > 0);

  const trendData = trend.map((t) => ({
    date: t.date?.slice(5),
    leads: t.count,
  }));

  const spPerf = dash.salesperson_performance ?? [];

  return (
    <div className="space-y-6">
      <div className="crm-page-header">
        <div>
          <div className="crm-section-kicker mb-3">Performance overview</div>
          <h2 className="crm-page-title">CRM Dashboard</h2>
          <p className="crm-page-subtitle">
            Live metrics for {kpi.total_leads} leads and {totalFU} follow ups across the workspace
          </p>
        </div>
        <div className="crm-badge crm-badge-success text-sm px-4 py-2">
          Conversion Rate: {kpi.conversion_rate}%
        </div>
      </div>

      <div>
        <SectionLabel>Leads Overview</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
          <StatCard label="Total Leads" value={kpi.total_leads} icon={PhoneCall} />
          <StatCard label="Interested" value={kpi.interested} icon={Activity} />
          <StatCard label="Booked" value={kpi.booked} icon={CalendarClock} />
          <StatCard
            label="Converted"
            value={kpi.converted}
            accent="text-emerald-600"
            sub={`${kpi.conversion_rate}% rate`}
            icon={CheckCircle2}
          />
          <StatCard label="Cancelled" value={kpi.cancelled} accent="text-rose-500" />
        </div>
      </div>

      <div>
        <SectionLabel>Follow Ups Overview</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Follow Ups" value={totalFU} />
          <StatCard label="Pending" value={pendingFU} accent="text-amber-600" />
          <StatCard label="Completed" value={completedFU} accent="text-emerald-600" />
          <StatCard label="Overdue" value={overdueCount} accent="text-rose-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Leads by Status" subtitle="Distribution across all active statuses">
          {pieStatusData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No leads yet.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieStatusData}
                    dataKey="value"
                    outerRadius={108}
                    innerRadius={56}
                    paddingAngle={3}
                    label={({ percent }) => (percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : "")}
                    labelLine={false}
                  >
                    {pieStatusData.map((_, i) => (
                      <Cell key={i} fill={color(i)} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v} leads`, n]} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ color: "#37506c", fontSize: 12 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Leads by Source" subtitle="Which channels are generating the most leads">
          {pieSourceData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No data yet.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieSourceData}
                    dataKey="value"
                    outerRadius={108}
                    innerRadius={56}
                    paddingAngle={3}
                    label={({ percent }) => (percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : "")}
                    labelLine={false}
                  >
                    {pieSourceData.map((_, i) => (
                      <Cell key={i} fill={color(i + 2)} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v} leads`, n]} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ color: "#37506c", fontSize: 12 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Leads by Type" subtitle="Hot, warm, and cold breakdown">
          {typeBarData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No data yet.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={typeBarData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4edf6" />
                  <XAxis dataKey="name" tick={{ fill: "#67809b", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#67809b", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${v} leads`, "Count"]} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {typeBarData.map((_, i) => (
                      <Cell key={i} fill={color(i + 4)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Follow Up Status" subtitle="Pending, completed, and rescheduled">
          {fuBarData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No follow ups yet.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={fuBarData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4edf6" />
                  <XAxis dataKey="name" tick={{ fill: "#67809b", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#67809b", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${v}`, "Count"]} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {fuBarData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="30 Day Lead Trend" subtitle="Daily new leads over the past month">
          {trendData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No trend data.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4edf6" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#67809b", fontSize: 10 }}
                    interval={Math.floor(trendData.length / 6)}
                  />
                  <YAxis tick={{ fill: "#67809b", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${v} leads`, "New"]} />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    stroke="#2f7fb0"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Status Breakdown" subtitle="Lead count and share per active status">
        <table className="crm-table min-w-full">
          <thead>
            <tr>
              <th>Status</th>
              <th>Leads</th>
              <th>Share</th>
              <th className="w-40">Bar</th>
            </tr>
          </thead>
          <tbody>
            {pieStatusData.length === 0 && (
              <tr>
                <td colSpan={4} className="crm-empty-state">No leads yet.</td>
              </tr>
            )}
            {pieStatusData.map((row, i) => {
              const pct = kpi.total_leads > 0 ? ((row.value / kpi.total_leads) * 100).toFixed(1) : 0;
              return (
                <tr key={row.name}>
                  <td className="font-semibold text-[var(--text)]">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: color(i) }}
                      />
                      {row.name}
                    </div>
                  </td>
                  <td>{row.value}</td>
                  <td>{pct}%</td>
                  <td>
                    <div className="w-full bg-[#edf3f8] rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${pct}%`, background: color(i) }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ChartCard>

      {spPerf.length > 0 && (
        <ChartCard title="Salesperson Performance" subtitle="Conversion rates ranked highest to lowest">
          <table className="crm-table min-w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Total Leads</th>
                <th>Converted</th>
                <th>Conversion Rate</th>
                <th className="w-36">Bar</th>
              </tr>
            </thead>
            <tbody>
              {spPerf.map((sp, i) => (
                <tr key={sp.salesperson_id}>
                  <td className="font-semibold text-[var(--text)]">{sp.full_name}</td>
                  <td>{sp.total_leads}</td>
                  <td className="text-emerald-600 font-semibold">{sp.converted}</td>
                  <td>
                    <span
                      className={[
                        "font-semibold",
                        sp.conversion_rate >= 50
                          ? "text-emerald-600"
                          : sp.conversion_rate >= 25
                            ? "text-amber-600"
                            : "text-[var(--text-soft)]",
                      ].join(" ")}
                    >
                      {sp.conversion_rate}%
                    </span>
                  </td>
                  <td>
                    <div className="w-full bg-[#edf3f8] rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${Math.min(sp.conversion_rate, 100)}%`, background: color(i) }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartCard>
      )}
    </div>
  );
}
