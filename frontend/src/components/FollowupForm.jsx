import { useState } from "react";
import API from "../api";
import { CalendarPlus } from "lucide-react";

export default function FollowupForm({ refresh }) {
  const [form, setForm] = useState({
    lead_id: "",
    follow_up_date: "",
    notes: "",
    status: "Pending",
  });

  const submit = async () => {
    await API.post("/api/followups", {
      lead_id: parseInt(form.lead_id),
      follow_up_date: form.follow_up_date,
      notes: form.notes,
      status: form.status,
    });

    alert("Followup Created");

    setForm({
      lead_id: "",
      follow_up_date: "",
      notes: "",
      status: "Pending",
    });

    refresh();
  };

  return (
    <div className="crm-card">
      <div className="crm-card-header">
        <h3 className="crm-card-title">Create Follow Up</h3>
        <p className="crm-card-subtitle">
          Schedule and manage next actions for your leads
        </p>
      </div>

      <div className="crm-card-body">
        <div className="crm-grid-form">
          <div className="crm-field">
            <label className="crm-label">Lead ID</label>
            <input
              className="crm-input"
              placeholder="Enter lead ID"
              value={form.lead_id}
              onChange={(e) => setForm({ ...form, lead_id: e.target.value })}
            />
          </div>

          <div className="crm-field">
            <label className="crm-label">Follow Up Date</label>
            <input
              type="datetime-local"
              className="crm-input"
              value={form.follow_up_date}
              onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
            />
          </div>

          <div className="crm-field crm-field-full">
            <label className="crm-label">Notes</label>
            <textarea
              className="crm-textarea"
              placeholder="Enter notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="crm-field">
            <label className="crm-label">Status</label>
            <select
              className="crm-select"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option>Pending</option>
              <option>Completed</option>
              <option>Rescheduled</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={submit} className="crm-button crm-button-primary">
            <CalendarPlus size={16} />
            Create Followup
          </button>
        </div>
      </div>
    </div>
  );
}
