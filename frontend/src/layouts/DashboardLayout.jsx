import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="crm-shell flex min-h-screen bg-transparent">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className="flex-1 crm-main">
        <div className="crm-topbar">
          <div>
            <div className="crm-section-kicker mb-3">Lead CRM Workspace</div>
            <div className="crm-topbar-title">Professional sales operations dashboard</div>
            <div className="crm-topbar-subtitle">
              Manage leads, follow ups, team visibility, and conversion performance in one clean workspace
            </div>
          </div>

          <div className="crm-badge crm-badge-info px-4 py-2">
            Product CRM Experience
          </div>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
