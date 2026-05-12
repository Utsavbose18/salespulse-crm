import { useEffect, useState } from "react";
import API from "../api";
import UserForm from "../components/UserForm";
import { Users as UsersIcon, Shield, UserCheck } from "lucide-react";

export default function Users() {
  const [users, setUsers] = useState([]);

  const loadUsers = () => {
    API.get("/api/users").then((res) => setUsers(res.data.users));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const activeUsers = users.filter((u) => u.is_active).length;
  const adminUsers = users.filter((u) => u.role === "admin").length;

  return (
    <div className="crm-page space-y-6">
      <div className="crm-page-header">
        <div>
          <div className="crm-section-kicker mb-3">Team management</div>
          <h2 className="crm-page-title">Members</h2>
          <p className="crm-page-subtitle">
            Manage your CRM team, roles, visibility, and lead ownership structure
          </p>
        </div>

        <div className="crm-badge crm-badge-info px-4 py-2">
          Total Members: {users.length}
        </div>
      </div>

      <div className="crm-summary-grid">
        <div className="crm-summary-card">
          <div className="crm-summary-label flex items-center gap-2">
            <UsersIcon size={16} /> Total members
          </div>
          <div className="crm-summary-value">{users.length}</div>
          <div className="crm-summary-subvalue">All CRM users in the workspace</div>
        </div>

        <div className="crm-summary-card">
          <div className="crm-summary-label flex items-center gap-2">
            <UserCheck size={16} /> Active members
          </div>
          <div className="crm-summary-value">{activeUsers}</div>
          <div className="crm-summary-subvalue">Currently active team accounts</div>
        </div>

        <div className="crm-summary-card">
          <div className="crm-summary-label flex items-center gap-2">
            <Shield size={16} /> Admin accounts
          </div>
          <div className="crm-summary-value">{adminUsers}</div>
          <div className="crm-summary-subvalue">Administrative access holders</div>
        </div>

        <div className="crm-summary-card">
          <div className="crm-summary-label">Sales personnel</div>
          <div className="crm-summary-value">{Math.max(users.length - adminUsers, 0)}</div>
          <div className="crm-summary-subvalue">Users handling lead activity</div>
        </div>
      </div>

      <UserForm refresh={loadUsers} />

      <div className="crm-card">
        <div className="crm-card-header">
          <h3 className="crm-card-title">Team Directory</h3>
          <p className="crm-card-subtitle">
            Current users, role assignment, lead ownership, and account status
          </p>
        </div>

        <div className="crm-card-body crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Leads</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold text-[var(--text)]">{u.full_name}</td>
                  <td>{u.username}</td>
                  <td>
                    <span className="crm-badge crm-badge-info">{u.role}</span>
                  </td>
                  <td>{u.lead_count || 0}</td>
                  <td>
                    <span
                      className={
                        u.is_active
                          ? "crm-badge crm-badge-success"
                          : "crm-badge crm-badge-danger"
                      }
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan="5" className="crm-empty-state">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
