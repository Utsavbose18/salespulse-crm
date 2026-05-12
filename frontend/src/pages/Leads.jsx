import { useEffect, useState, useRef } from "react";
import API from "../api";
import { Funnel, Plus, Settings2, Users, CircleDot, TrendingUp } from "lucide-react";

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
      <div
        className={`crm-card-soft ${wide ? "w-full max-w-5xl" : "w-full max-w-2xl"} max-h-[92vh] overflow-y-auto p-6 relative`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#dce6f0] bg-white text-slate-500 hover:text-[var(--brand-strong)]"
        >
          ✕
        </button>
        <h3 className="text-xl font-semibold mb-5 text-[var(--text)]">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function DropdownManager({ label, items, onAdd, onDelete }) {
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onAdd(newName.trim());
      setNewName("");
    } catch (err) {
      setError(err.response?.data?.detail || "Already exists or error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#deebf4] bg-[#fbfdff] p-4 space-y-3">
      <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-[0.16em]">
        {label}
      </h4>

      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
        {items.length === 0 && <p className="text-xs text-slate-400 italic">No items yet.</p>}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl border border-[#e6eef5] bg-white px-3 py-2 group"
          >
            <span className="text-sm font-medium text-[var(--text)]">{item.name}</span>
            <button
              onClick={() => onDelete(item.id)}
              className="text-xs text-slate-400 group-hover:text-rose-500 transition-colors ml-4"
              title={`Disable ${item.name}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-rose-500">{error}</p>}

      <div className="flex gap-2">
        <input
          className="crm-input flex-1 text-sm py-1.5"
          placeholder={`New ${label} name...`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={loading || !newName.trim()}
          className="crm-button crm-button-primary text-sm px-4 disabled:opacity-50"
        >
          {loading ? "..." : "Add"}
        </button>
      </div>
    </div>
  );
}

export default function Leads() {
  const [currentUser, setCurrentUser] = useState(null);
  const currentUserRef = useRef(null);

  const [sources, setSources] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [types, setTypes] = useState([]);
  const [salespersons, setSalespersons] = useState([]);
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showDropdownMgr, setShowDropdownMgr] = useState(false);
  const [editLead, setEditLead] = useState(null);

  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    phone_number: "",
    email: "",
    date_of_inquiry: new Date().toISOString().slice(0, 10),
    purpose_of_inquiry: "",
    lead_source_id: "",
    lead_status_id: "",
    lead_type_id: "",
    remarks: "",
    salesperson_id: "",
  });

  const loadMe = async () => {
    try {
      const res = await API.get("/api/auth/me");
      const user = res.data;
      currentUserRef.current = user;
      setCurrentUser(user);
      return user;
    } catch (_) {
      return null;
    }
  };

  const loadDropdowns = async () => {
    const [srcRes, stRes, tyRes] = await Promise.all([
      API.get("/api/leads/lead-sources"),
      API.get("/api/leads/lead-statuses"),
      API.get("/api/leads/lead-types"),
    ]);
    setSources(srcRes.data);
    setStatuses(stRes.data);
    setTypes(tyRes.data);
    return { sources: srcRes.data, statuses: stRes.data, types: tyRes.data };
  };

  const loadSalespersons = async () => {
    try {
      const res = await API.get("/api/users/?page_size=200");
      setSalespersons(res.data.users ?? res.data);
    } catch (_) {}
  };

  const loadLeads = async () => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (filterSource) params.append("lead_source_id", filterSource);
    if (filterStatus) params.append("lead_status_id", filterStatus);
    if (filterType) params.append("lead_type_id", filterType);
    params.append("page_size", "100");
    const res = await API.get(`/api/leads/?${params.toString()}`);
    setLeads(res.data.leads);
    setTotal(res.data.total);
  };

  useEffect(() => {
    (async () => {
      await loadMe();
      await loadDropdowns();
      await loadSalespersons();
      await loadLeads();
    })();
  }, []);

  useEffect(() => {
    loadLeads();
  }, [search, filterSource, filterStatus, filterType]);

  const isAdmin = currentUser?.role === "admin";

  const getName = (arr, id) => arr.find((x) => x.id === id)?.name ?? String(id ?? "—");
  const getSPName = (id) => {
    const u = salespersons.find((x) => x.id === id);
    return u ? u.full_name : id ? String(id) : "—";
  };

  const updateField = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  const openCreate = () => {
    const me = currentUserRef.current;
    setEditLead(null);
    setForm({
      name: "",
      age: "",
      gender: "",
      phone_number: "",
      email: "",
      date_of_inquiry: new Date().toISOString().slice(0, 10),
      purpose_of_inquiry: "",
      lead_source_id: sources[0]?.id ?? "",
      lead_status_id: statuses[0]?.id ?? "",
      lead_type_id: types[0]?.id ?? "",
      remarks: "",
      salesperson_id: me?.id ?? "",
    });
    setShowLeadModal(true);
  };

  const openEdit = (lead) => {
    setEditLead(lead);
    setForm({
      name: lead.name,
      age: lead.age ?? "",
      gender: lead.gender ?? "",
      phone_number: lead.phone_number,
      email: lead.email ?? "",
      date_of_inquiry: lead.date_of_inquiry,
      purpose_of_inquiry: lead.purpose_of_inquiry ?? "",
      lead_source_id: lead.lead_source_id,
      lead_status_id: lead.lead_status_id,
      lead_type_id: lead.lead_type_id,
      remarks: lead.remarks ?? "",
      salesperson_id: lead.salesperson_id ?? "",
    });
    setShowLeadModal(true);
  };

  const deleteLead = async (lead) => {
    if (!lead) return;
    const confirmDelete = window.confirm(`Delete lead ${lead.name}?`);
    if (!confirmDelete) return;
    await API.delete(`/api/leads/${lead.id}`);
    await loadLeads();
  };

  const saveLead = async () => {
    try {
      const me = currentUserRef.current;
      const spId = isAdmin ? (form.salesperson_id ? Number(form.salesperson_id) : null) : me?.id ?? null;

      const payload = {
        name: form.name,
        phone_number: form.phone_number,
        date_of_inquiry: form.date_of_inquiry,
        lead_source_id: Number(form.lead_source_id),
        lead_status_id: Number(form.lead_status_id),
        lead_type_id: Number(form.lead_type_id),
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        email: form.email || null,
        purpose_of_inquiry: form.purpose_of_inquiry || null,
        remarks: form.remarks || null,
        salesperson_id: spId,
      };

      if (editLead) {
        await API.put(`/api/leads/${editLead.id}`, payload);
      } else {
        await API.post("/api/leads/", payload);
      }

      setShowLeadModal(false);
      loadLeads();
    } catch (err) {
      alert(
        typeof err.response?.data?.detail === "string"
          ? err.response.data.detail
          : JSON.stringify(err.response?.data?.detail || "Error saving lead")
      );
    }
  };

  const addSource = async (n) => {
    await API.post("/api/leads/lead-sources", { name: n });
    await loadDropdowns();
  };
  const delSource = async (id) => {
    await API.delete(`/api/leads/lead-sources/${id}`);
    await loadDropdowns();
  };
  const addStatus = async (n) => {
    await API.post("/api/leads/lead-statuses", { name: n });
    await loadDropdowns();
  };
  const delStatus = async (id) => {
    await API.delete(`/api/leads/lead-statuses/${id}`);
    await loadDropdowns();
  };
  const addType = async (n) => {
    await API.post("/api/leads/lead-types", { name: n });
    await loadDropdowns();
  };
  const delType = async (id) => {
    await API.delete(`/api/leads/lead-types/${id}`);
    await loadDropdowns();
  };

  const interestedCount = leads.filter((l) => getName(statuses, l.lead_status_id).toLowerCase().includes("interest")).length;
  const convertedCount = leads.filter((l) => getName(statuses, l.lead_status_id).toLowerCase().includes("convert")).length;
  const assignedCount = leads.filter((l) => l.salesperson_id).length;

  return (
    <div className="space-y-6">
      <div className="crm-page-header">
        <div>
          <div className="crm-section-kicker mb-3">Pipeline management</div>
          <h2 className="crm-page-title">Leads</h2>
          <p className="crm-page-subtitle">Track inquiries, maintain status flow, and keep ownership clear across your CRM</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <button onClick={() => setShowDropdownMgr(true)} className="crm-button crm-button-ghost text-sm">
              <Settings2 size={16} />
              Manage Dropdowns
            </button>
          )}
          <button onClick={openCreate} className="crm-button crm-button-primary text-sm">
            <Plus size={16} />
            New Lead
          </button>
        </div>
      </div>

      <div className="crm-summary-grid">
        <div className="crm-summary-card">
          <div className="crm-summary-label flex items-center gap-2"><Funnel size={16} /> Total leads</div>
          <div className="crm-summary-value">{total}</div>
          <div className="crm-summary-subvalue">All records matching current workspace data</div>
        </div>
        <div className="crm-summary-card">
          <div className="crm-summary-label flex items-center gap-2"><TrendingUp size={16} /> Interested</div>
          <div className="crm-summary-value">{interestedCount}</div>
          <div className="crm-summary-subvalue">Leads currently showing strong intent</div>
        </div>
        <div className="crm-summary-card">
          <div className="crm-summary-label flex items-center gap-2"><CircleDot size={16} /> Converted</div>
          <div className="crm-summary-value">{convertedCount}</div>
          <div className="crm-summary-subvalue">Records already moved to success outcome</div>
        </div>
        <div className="crm-summary-card">
          <div className="crm-summary-label flex items-center gap-2"><Users size={16} /> Assigned</div>
          <div className="crm-summary-value">{assignedCount}</div>
          <div className="crm-summary-subvalue">Leads already mapped to a salesperson</div>
        </div>
      </div>

      <div className="crm-card">
        <div className="crm-card-body space-y-4">
          <div className="crm-toolbar">
            <div>
              <h3 className="crm-card-title">Lead Directory</h3>
              <p className="crm-card-subtitle">Filter by search, source, status, or type without changing any backend logic</p>
            </div>
            <div className="crm-badge crm-badge-neutral">{total} total records</div>
          </div>

          <div className="crm-toolbar-group w-full">
            <input
              className="crm-input text-sm flex-1 min-w-[220px]"
              placeholder="Search name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="crm-select text-sm min-w-[170px]" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
              <option value="">All Sources</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select className="crm-select text-sm min-w-[170px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select className="crm-select text-sm min-w-[170px]" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {(search || filterSource || filterStatus || filterType) && (
              <button
                className="crm-button crm-button-ghost text-sm"
                onClick={() => {
                  setSearch("");
                  setFilterSource("");
                  setFilterStatus("");
                  setFilterType("");
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="crm-card-soft overflow-x-auto">
        <table className="crm-table min-w-[1280px]">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Gender</th>
              <th>Age</th>
              <th>Inquiry Date</th>
              <th>Purpose</th>
              <th>Source</th>
              <th>Status</th>
              <th>Type</th>
              {isAdmin && <th>Salesperson</th>}
              <th>Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 14 : 13} className="crm-empty-state">
                  No leads found.
                </td>
              </tr>
            )}

            {leads.map((l) => (
              <tr key={l.id}>
                <td>#{l.id}</td>
                <td className="font-semibold text-[var(--text)] whitespace-nowrap">{l.name}</td>
                <td className="whitespace-nowrap">{l.phone_number}</td>
                <td>{l.email ?? "—"}</td>
                <td className="capitalize">{l.gender ?? "—"}</td>
                <td>{l.age ?? "—"}</td>
                <td className="whitespace-nowrap">{l.date_of_inquiry}</td>
                <td className="max-w-[180px] truncate" title={l.purpose_of_inquiry ?? ""}>{l.purpose_of_inquiry ?? "—"}</td>
                <td><span className="crm-badge">{getName(sources, l.lead_source_id)}</span></td>
                <td><span className="crm-badge crm-badge-info">{getName(statuses, l.lead_status_id)}</span></td>
                <td><span className="crm-badge crm-badge-success">{getName(types, l.lead_type_id)}</span></td>
                {isAdmin && <td className="whitespace-nowrap">{getSPName(l.salesperson_id)}</td>}
                <td className="max-w-[180px] truncate" title={l.remarks ?? ""}>{l.remarks ?? "—"}</td>
                <td className="whitespace-nowrap">
                  <button onClick={() => openEdit(l)} className="crm-table-action">Edit</button>
                  <button onClick={() => deleteLead(l)} className="crm-table-action crm-table-danger ml-3">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showLeadModal && (
        <Modal
          wide
          title={editLead ? `Edit Lead - ${editLead.name}` : "Create New Lead"}
          onClose={() => setShowLeadModal(false)}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="crm-label">Name *</label>
              <input className="crm-input" placeholder="Full name" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="crm-label">Phone *</label>
              <input className="crm-input" placeholder="Phone number" value={form.phone_number} onChange={(e) => updateField("phone_number", e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="crm-label">Email</label>
              <input className="crm-input" placeholder="Email address" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="crm-label">Date of Inquiry *</label>
              <input type="date" className="crm-input" value={form.date_of_inquiry} onChange={(e) => updateField("date_of_inquiry", e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="crm-label">Age</label>
              <input type="number" className="crm-input" placeholder="Age" value={form.age} onChange={(e) => updateField("age", e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="crm-label">Gender</label>
              <select className="crm-select" value={form.gender} onChange={(e) => updateField("gender", e.target.value)}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="crm-label">Purpose of Inquiry</label>
              <input className="crm-input" placeholder="Describe inquiry purpose" value={form.purpose_of_inquiry} onChange={(e) => updateField("purpose_of_inquiry", e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="crm-label">Lead Source *</label>
              <select className="crm-select" value={form.lead_source_id} onChange={(e) => updateField("lead_source_id", e.target.value)}>
                <option value="">Select Source</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="crm-label">Lead Status *</label>
              <select className="crm-select" value={form.lead_status_id} onChange={(e) => updateField("lead_status_id", e.target.value)}>
                <option value="">Select Status</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="crm-label">Lead Type *</label>
              <select className="crm-select" value={form.lead_type_id} onChange={(e) => updateField("lead_type_id", e.target.value)}>
                <option value="">Select Type</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="crm-label">
                Salesperson
                {!isAdmin && <span className="ml-1.5 text-xs text-slate-500">(auto-assigned to you)</span>}
              </label>

              {isAdmin ? (
                <select className="crm-select" value={form.salesperson_id} onChange={(e) => updateField("salesperson_id", e.target.value)}>
                  <option value="">Unassigned</option>
                  {salespersons.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>
                  ))}
                </select>
              ) : (
                <input className="crm-input opacity-70 cursor-not-allowed" value={currentUser?.full_name ?? "Loading..."} readOnly />
              )}
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="crm-label">Remarks</label>
              <textarea className="crm-textarea" rows={3} placeholder="Optional notes" value={form.remarks} onChange={(e) => updateField("remarks", e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowLeadModal(false)} className="crm-button crm-button-ghost">Cancel</button>
            <button onClick={saveLead} className="crm-button crm-button-primary">{editLead ? "Save Changes" : "Submit Lead"}</button>
          </div>
        </Modal>
      )}

      {showDropdownMgr && isAdmin && (
        <Modal title="Manage Dropdown Options" onClose={() => setShowDropdownMgr(false)}>
          <p className="text-sm text-slate-500 mb-4">
            Add or disable values for Lead Source, Status, and Type. Disabled items stay available in historical records.
          </p>
          <div className="space-y-4">
            <DropdownManager label="Lead Source" items={sources} onAdd={addSource} onDelete={delSource} />
            <DropdownManager label="Lead Status" items={statuses} onAdd={addStatus} onDelete={delStatus} />
            <DropdownManager label="Lead Type" items={types} onAdd={addType} onDelete={delType} />
          </div>
          <div className="flex justify-end mt-6">
            <button onClick={() => setShowDropdownMgr(false)} className="crm-button crm-button-primary">Done</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
