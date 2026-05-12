import { useState } from "react";
import API from "../api";
import { UserPlus } from "lucide-react";

export default function UserForm({ refresh }) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    full_name: "",
    role: "sales_personnel",
    password: "",
  });

  const submit = async () => {
    await API.post("/api/users", form);

    alert("User Created");

    setForm({
      username: "",
      email: "",
      full_name: "",
      role: "sales_personnel",
      password: "",
    });

    refresh();
  };

  return (
    <div className="crm-card">
      <div className="crm-card-header">
        <h3 className="crm-card-title">Create Team Member</h3>
        <p className="crm-card-subtitle">
          Add admins or sales personnel without changing backend behavior
        </p>
      </div>

      <div className="crm-card-body">
        <div className="crm-grid-form">
          <div className="crm-field">
            <label className="crm-label">Username</label>
            <input
              className="crm-input"
              placeholder="Enter username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>

          <div className="crm-field">
            <label className="crm-label">Email</label>
            <input
              className="crm-input"
              placeholder="Enter email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="crm-field">
            <label className="crm-label">Full Name</label>
            <input
              className="crm-input"
              placeholder="Enter full name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>

          <div className="crm-field">
            <label className="crm-label">Password</label>
            <input
              type="password"
              className="crm-input"
              placeholder="Enter password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div className="crm-field">
            <label className="crm-label">Role</label>
            <select
              className="crm-select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="sales_personnel">Sales Personnel</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={submit} className="crm-button crm-button-primary">
            <UserPlus size={16} />
            Create User
          </button>
        </div>
      </div>
    </div>
  );
}
