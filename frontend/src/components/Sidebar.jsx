import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Phone,
  CalendarClock,
  LogOut,
  Menu,
  ChevronLeft,
} from "lucide-react";

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const role = localStorage.getItem("role");

  const isActive = (path) => location.pathname === path;

  const navItem = (path, label, Icon) => {
    const active = isActive(path);

    return (
      <Link
        to={path}
        className={[
          "crm-nav-link",
          active
            ? "bg-[var(--brand-soft)] border-[#c7e0ef] text-[var(--brand-strong)] shadow-sm"
            : "",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
            active
              ? "border-[#c7e0ef] bg-white text-[var(--brand-strong)]"
              : "border-[#e0e8f1] bg-[#f8fbff] text-[#5d7893]",
          ].join(" ")}
        >
          <Icon size={18} />
        </span>

        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-semibold">{label}</div>
            <div className="text-[11px] text-slate-500 truncate">
              {label === "Home"
                ? "Overview and analytics"
                : label === "Leads"
                  ? "Lead pipeline management"
                  : label === "Follow Ups"
                    ? "Activity scheduling"
                    : "User and role management"}
            </div>
          </div>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={[
        "crm-sidebar flex flex-col transition-all duration-300",
        collapsed ? "w-[92px]" : "w-[290px]",
      ].join(" ")}
    >
      <div className="p-5 border-b border-[#e2eaf2]">
        <div className="flex items-center justify-between gap-3">
          {!collapsed ? (
            <div className="crm-sidebar-brand min-w-0">
              <div className="crm-sidebar-brand-mark">C</div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold tracking-[0.02em] text-[var(--text)]">
                  CRM Pro
                </div>
                <div className="text-xs text-slate-500 truncate">
                  Lead and team operations
                </div>
              </div>
            </div>
          ) : (
            <div className="crm-sidebar-brand-mark mx-auto">C</div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dce6f0] bg-white text-slate-500 hover:text-[var(--brand-strong)] hover:border-[#c8d9e8] transition-colors"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-2">
        {navItem("/", "Home", LayoutDashboard)}
        {navItem("/leads", "Leads", Phone)}
        {navItem("/followups", "Follow Ups", CalendarClock)}
        {role === "admin" && navItem("/users", "Members", Users)}
      </div>

      <div className="mt-auto p-4 space-y-3 border-t border-[#e2eaf2]">
        {!collapsed && (
          <div className="rounded-2xl border border-[#dce7f1] bg-[#f8fbff] p-4">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Workspace role
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--text)] capitalize">
                {role || "user"}
              </span>
              <span className="crm-badge crm-badge-info">Active</span>
            </div>
          </div>
        )}

        <Link
          to="/login"
          className="crm-nav-link text-[#c24c4c] hover:bg-[#fff5f5] hover:border-[#f1d2d2]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f1d7d7] bg-[#fff6f6] text-[#cc5a5a]">
            <LogOut size={18} />
          </span>
          {!collapsed && (
            <div>
              <div className="text-sm font-semibold">Logout</div>
              <div className="text-[11px] text-slate-500">Exit current session</div>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
