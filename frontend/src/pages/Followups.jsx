import { useEffect, useState, useRef } from "react";
import API from "../api";
import {
  PhoneCall,
  FileText,
  MessageSquare,
  Mail,
  Video,
  BookOpen,
  BadgeCheck,
  Newspaper,
  CalendarClock,
} from "lucide-react";

const CHECKLIST_FIELDS = [
  { key: "initial_call", label: "Initial Call", icon: <PhoneCall size={14} /> },
  { key: "call_script", label: "Call Script", icon: <FileText size={14} /> },
  { key: "sms", label: "SMS", icon: <MessageSquare size={14} /> },
  { key: "whatsapp", label: "WhatsApp", icon: <MessageSquare size={14} /> },
  { key: "email", label: "Email", icon: <Mail size={14} /> },
  { key: "video_content", label: "Video Content", icon: <Video size={14} /> },
  { key: "case_study", label: "Case Study", icon: <BookOpen size={14} /> },
  { key: "testimonial", label: "Testimonial", icon: <BadgeCheck size={14} /> },
  { key: "newsletter", label: "Newsletter", icon: <Newspaper size={14} /> },
];

const FU_STATUS_OPTIONS = ["Pending", "Completed", "Rescheduled"];

function StatusBadge({ status }) {
  const styles = {
    Pending: "bg-[#fff6e8] text-[#b67b16] border-[#f1ddb3]",
    Completed: "bg-[#eaf8f2] text-[#137550] border-[#ccebdc]",
    Rescheduled: "bg-[#eaf4fb] text-[#2f7fb0] border-[#cfe2f1]",
  };

  return (
    <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold whitespace-nowrap ${styles[status] ?? "bg-[#f4f7fb] text-slate-500 border-[#dfe8f1]"}`}>
      {status}
    </span>
  );
}

function CheckCell({ checked, editable, onChange }) {
  if (!editable) {
    return (
      <td className="px-1 py-2 text-center align-middle">
        {checked ? (
          <span className="inline-flex w-5 h-5 rounded-md bg-[#eaf8f2] border border-[#cdebdc] items-center justify-center mx-auto text-emerald-600">
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : (
          <span className="inline-block w-5 h-5 rounded-md border border-[#dfe8f1] bg-[#f8fbff] mx-auto" />
        )}
      </td>
    );
  }

  return (
    <td className="px-1 py-2 text-center align-middle">
      <button
        onClick={onChange}
        className={[
          "w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto transition-all duration-100 cursor-pointer hover:scale-105 active:scale-95",
          checked
            ? "bg-emerald-500 border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
            : "bg-white border-[#bccfe0] hover:border-emerald-500 hover:bg-[#f2fcf7]",
        ].join(" ")}
      >
        {checked && (
          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </td>
  );
}

function ProgressPill({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const trackColor = pct === 100 ? "#22a06b" : pct >= 55 ? "#d99218" : "#2f7fb0";

  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 bg-[#edf3f8] rounded-full h-2 overflow-hidden">
        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: trackColor }} />
      </div>
      <span className="text-[11px] text-slate-500 tabular-nums w-8 text-right shrink-0">
        {done}/{total}
      </span>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="crm-card-soft w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#dce6f0] bg-white text-slate-500 hover:text-[var(--brand-strong)]"
        >
          ✕
        </button>
        <h3 className="text-lg font-semibold mb-5 text-[var(--text)]">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function Followups() {
  const currentUserRef = useRef(null);
  const [allLeads, setAllLeads] = useState([]);
  const [fuLeads, setFuLeads] = useState([]);
  const [fuStatuses, setFuStatuses] = useState([]);
  const [allStatuses, setAllStatuses] = useState([]);
  const [fuEntries, setFuEntries] = useState([]);
  const [vaMap, setVaMap] = useState({});
  const [rowEditMap, setRowEditMap] = useState({});
  const [rowSaving, setRowSaving] = useState({});
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [modalLead, setModalLead] = useState(null);
  const [form, setForm] = useState({ follow_up_date: "", notes: "", status: "Pending" });
  const [formErr, setFormErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadMe = async () => {
    try {
      const res = await API.get("/api/auth/me");
      currentUserRef.current = res.data;
    } catch (_) {}
  };

  const loadStatuses = async () => {
    try {
      const res = await API.get("/api/leads/lead-statuses");
      const statuses = res.data ?? [];
      setAllStatuses(statuses);
      const fuSts = statuses.filter((s) => s.name.toLowerCase().includes("follow"));
      setFuStatuses(fuSts);
      return fuSts;
    } catch (_) {
      return [];
    }
  };

  const loadLeads = async (fuSts) => {
    try {
      const res = await API.get("/api/leads/?page_size=100");
      const leads = res.data.leads ?? [];
      setAllLeads(leads);
      const fuStatusIds = new Set((fuSts ?? fuStatuses).map((s) => s.id));
      setFuLeads(leads.filter((l) => fuStatusIds.has(l.lead_status_id)));
    } catch (_) {}
  };

  const loadFuEntries = async () => {
    try {
      const res = await API.get("/api/followups/?skip=0&limit=100");
      setFuEntries(res.data.followups ?? []);
    } catch (_) {}
  };

  const loadValueAdders = async (leadIds) => {
    const unique = [...new Set(leadIds)];
    if (!unique.length) return;

    const results = await Promise.allSettled(unique.map((id) => API.get(`/api/value-adders/${id}`)));
    setVaMap((prev) => {
      const next = { ...prev };
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          const list = r.value.data.value_adders ?? [];
          if (list.length > 0) next[unique[i]] = list[0];
        }
      });
      return next;
    });
  };

  useEffect(() => {
    (async () => {
      await loadMe();
      const fuSts = await loadStatuses();
      await Promise.all([loadLeads(fuSts), loadFuEntries()]);
    })();
  }, []);

  useEffect(() => {
    const ids = fuLeads.map((l) => l.id);
    if (ids.length) loadValueAdders(ids);
  }, [fuLeads]);

  const leadById = (id) => allLeads.find((l) => l.id === id);
  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const latestFuEntry = (leadId) => {
    const entries = fuEntries.filter((e) => e.lead_id === leadId);
    if (!entries.length) return null;
    return entries.sort((a, b) => new Date(b.follow_up_date) - new Date(a.follow_up_date))[0];
  };

  const isOverdue = (lead) => {
    const entry = latestFuEntry(lead.id);
    return entry && entry.status !== "Completed" && new Date(entry.follow_up_date) < new Date();
  };

  const getChecklistValues = (leadId) => {
    const row = rowEditMap[leadId];
    if (row?.active) return row.draft;
    const va = vaMap[leadId];
    if (!va) return Object.fromEntries(CHECKLIST_FIELDS.map((f) => [f.key, false]));
    return Object.fromEntries(CHECKLIST_FIELDS.map((f) => [f.key, !!va[f.key]]));
  };

  const getProgress = (leadId) => {
    const vals = getChecklistValues(leadId);
    const done = CHECKLIST_FIELDS.filter((f) => vals[f.key]).length;
    return { done, total: CHECKLIST_FIELDS.length };
  };

  const startRowEdit = (lead) => {
    const va = vaMap[lead.id];
    const draft = Object.fromEntries(CHECKLIST_FIELDS.map((f) => [f.key, va ? !!va[f.key] : false]));
    setRowEditMap((p) => ({ ...p, [lead.id]: { active: true, draft } }));
  };

  const toggleDraft = (leadId, field) => {
    setRowEditMap((p) => ({
      ...p,
      [leadId]: {
        ...p[leadId],
        draft: { ...p[leadId].draft, [field]: !p[leadId].draft[field] },
      },
    }));
  };

  const cancelRowEdit = (leadId) => {
    setRowEditMap((p) => {
      const next = { ...p };
      delete next[leadId];
      return next;
    });
  };

  const saveRowEdit = async (lead) => {
    const draft = rowEditMap[lead.id]?.draft;
    if (!draft) return;

    setRowSaving((p) => ({ ...p, [lead.id]: true }));
    try {
      const va = vaMap[lead.id];
      let saved;
      if (!va) {
        const res = await API.post("/api/value-adders/", { lead_id: lead.id, ...draft });
        saved = res.data;
      } else {
        const res = await API.put(`/api/value-adders/${va.id}`, draft);
        saved = res.data;
      }
      setVaMap((p) => ({ ...p, [lead.id]: saved }));
      setRowEditMap((p) => {
        const next = { ...p };
        delete next[lead.id];
        return next;
      });
    } catch (e) {
      console.error("Checklist save error", e);
    } finally {
      setRowSaving((p) => ({ ...p, [lead.id]: false }));
    }
  };

  const openScheduleModal = (lead) => {
    setModalLead(lead);
    const latest = latestFuEntry(lead.id);
    setForm({
      follow_up_date: latest?.follow_up_date?.slice(0, 16) ?? "",
      notes: latest?.notes ?? "",
      status: latest?.status ?? "Pending",
    });
    setFormErr("");
    setShowModal(true);
  };

  const saveForm = async () => {
    if (!form.follow_up_date) {
      setFormErr("Please set a follow-up date.");
      return;
    }

    setSubmitting(true);
    setFormErr("");
    try {
      const body = {
        lead_id: modalLead.id,
        follow_up_date: new Date(form.follow_up_date).toISOString(),
        notes: form.notes || null,
        status: form.status,
      };
      await API.post("/api/followups/", body);
      setShowModal(false);
      await loadFuEntries();
    } catch (err) {
      const d = err.response?.data?.detail;
      setFormErr(typeof d === "string" ? d : JSON.stringify(d ?? "Save failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const quickFuStatus = async (entryId, newStatus) => {
    try {
      await API.put(`/api/followups/${entryId}`, { status: newStatus });
      await loadFuEntries();
    } catch (_) {}
  };

  const overdueCount = fuLeads.filter(isOverdue).length;
  const completedCount = fuLeads.filter((l) => {
    const e = latestFuEntry(l.id);
    return e?.status === "Completed";
  }).length;
  const pendingCount = fuLeads.filter((l) => {
    const e = latestFuEntry(l.id);
    return !e || e.status === "Pending";
  }).length;

  const filtered = fuLeads.filter((lead) => {
    const q = search.toLowerCase();
    return !q || lead.name.toLowerCase().includes(q) || lead.phone_number?.toLowerCase().includes(q) || String(lead.id).includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="crm-page-header">
        <div>
          <div className="crm-section-kicker mb-3">Follow up operations</div>
          <h2 className="crm-page-title">Follow Ups and Checklist</h2>
          <p className="crm-page-subtitle">
            {fuLeads.length} leads in follow up flow
            {fuStatuses.length > 0 && <span className="ml-1">({fuStatuses.map((s) => s.name).join(", ")})</span>}
          </p>
        </div>
      </div>

      <div className="crm-summary-grid">
        <div className="crm-summary-card">
          <div className="crm-summary-label">Pending</div>
          <div className="crm-summary-value">{pendingCount}</div>
          <div className="crm-summary-subvalue">Leads waiting for action</div>
        </div>
        <div className="crm-summary-card">
          <div className="crm-summary-label">Completed</div>
          <div className="crm-summary-value">{completedCount}</div>
          <div className="crm-summary-subvalue">Follow ups already closed</div>
        </div>
        <div className="crm-summary-card">
          <div className="crm-summary-label">Overdue</div>
          <div className="crm-summary-value">{overdueCount}</div>
          <div className="crm-summary-subvalue">Items past scheduled date</div>
        </div>
        <div className="crm-summary-card">
          <div className="crm-summary-label">Checklist fields</div>
          <div className="crm-summary-value">{CHECKLIST_FIELDS.length}</div>
          <div className="crm-summary-subvalue">Touchpoints tracked for each lead</div>
        </div>
      </div>

      <div className="crm-card">
        <div className="crm-card-body">
          <div className="crm-toolbar-group w-full">
            <input
              className="crm-input text-sm flex-1 min-w-[220px]"
              placeholder="Search by name, phone, or lead ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="crm-button crm-button-ghost text-sm" onClick={() => setSearch("")}>Clear</button>
            )}
          </div>
        </div>
      </div>

      <div className="crm-card-soft overflow-x-auto rounded-[20px]">
        <table className="crm-table min-w-[1450px]">
          <thead>
            <tr>
              <th>Lead ID</th>
              <th>Lead Name</th>
              <th>Phone</th>
              <th>Scheduled</th>
              <th>Status</th>
              <th>Notes</th>
              {CHECKLIST_FIELDS.map((f) => (
                <th key={f.key} title={f.label} className="px-1 py-3 text-center min-w-[54px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[var(--brand-strong)]">{f.icon}</span>
                    <span className="text-[11px] text-slate-500 font-semibold leading-tight text-center">
                      {f.label.split(" ").map((w, i) => (
                        <span key={i} className="block">{w}</span>
                      ))}
                    </span>
                  </div>
                </th>
              ))}
              <th>Progress</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6 + CHECKLIST_FIELDS.length + 2} className="crm-empty-state">
                  {fuLeads.length === 0
                    ? fuStatuses.length === 0
                      ? 'No follow-up statuses found. Add a status containing the word "Follow" in the Leads page.'
                      : "No leads currently have a follow-up status."
                    : "No results match your search."}
                </td>
              </tr>
            )}

            {filtered.map((lead) => {
              const overdue = isOverdue(lead);
              const isEditing = !!rowEditMap[lead.id]?.active;
              const isSaving = !!rowSaving[lead.id];
              const vals = getChecklistValues(lead.id);
              const { done, total } = getProgress(lead.id);
              const latestEntry = latestFuEntry(lead.id);

              return (
                <tr key={lead.id} className={overdue ? "bg-[#fff7f7]" : ""}>
                  <td>
                    <span className="inline-flex rounded-xl border border-[#dfe8f1] bg-[#f8fbff] px-2 py-1 text-xs font-mono text-slate-500">#{lead.id}</span>
                  </td>
                  <td className="font-semibold text-[var(--text)] whitespace-nowrap">{lead.name}</td>
                  <td className="whitespace-nowrap">{lead.phone_number ?? "—"}</td>
                  <td className="whitespace-nowrap">
                    {latestEntry ? (
                      <>
                        <span className={overdue ? "text-rose-500 font-semibold" : "text-[var(--text-soft)]"}>{fmtDate(latestEntry.follow_up_date)}</span>
                        {overdue && <div className="text-[10px] text-rose-500 mt-0.5">Overdue</div>}
                      </>
                    ) : (
                      <button onClick={() => openScheduleModal(lead)} className="crm-table-action">+ Schedule</button>
                    )}
                  </td>
                  <td>{latestEntry ? <StatusBadge status={latestEntry.status} /> : <span className="text-xs text-slate-400">Not scheduled</span>}</td>
                  <td className="max-w-[160px]"><span className="text-xs text-[var(--text-soft)] block truncate" title={latestEntry?.notes ?? ""}>{latestEntry?.notes || "—"}</span></td>

                  {CHECKLIST_FIELDS.map((f) => (
                    <CheckCell key={f.key} checked={!!vals[f.key]} editable={isEditing} onChange={() => toggleDraft(lead.id, f.key)} />
                  ))}

                  <td><ProgressPill done={done} total={total} /></td>

                  <td>
                    {isEditing ? (
                      <div className="flex gap-2 items-center whitespace-nowrap">
                        <button onClick={() => saveRowEdit(lead)} disabled={isSaving} className="crm-button crm-button-primary !px-3 !py-2 text-xs disabled:opacity-60">
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                        <button onClick={() => cancelRowEdit(lead.id)} disabled={isSaving} className="crm-button crm-button-ghost !px-3 !py-2 text-xs">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 whitespace-nowrap">
                        <button onClick={() => startRowEdit(lead)} className="crm-table-action">Edit</button>
                        <button onClick={() => openScheduleModal(lead)} className="crm-table-action">Schedule</button>
                        {latestEntry && latestEntry.status !== "Completed" && (
                          <button onClick={() => quickFuStatus(latestEntry.id, "Completed")} className="crm-table-action">Done</button>
                        )}
                        {latestEntry && latestEntry.status === "Pending" && (
                          <button onClick={() => quickFuStatus(latestEntry.id, "Rescheduled")} className="crm-table-action">Reschedule</button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 px-1">
        {CHECKLIST_FIELDS.map((f) => (
          <span key={f.key} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-[var(--brand-strong)]">{f.icon}</span>
            {f.label}
          </span>
        ))}
      </div>

      {showModal && modalLead && (
        <Modal title={`Schedule Follow Up - ${modalLead.name}`} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="crm-label">Date and Time *</label>
              <input
                type="datetime-local"
                className="crm-input"
                value={form.follow_up_date}
                onChange={(e) => setForm((p) => ({ ...p, follow_up_date: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="crm-label">Status</label>
              <select className="crm-select" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                {FU_STATUS_OPTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="crm-label">Notes</label>
              <textarea
                className="crm-textarea"
                rows={3}
                placeholder="What's planned for this follow up?"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            {formErr && (
              <p className="text-xs text-rose-500 bg-[#fff5f5] border border-[#f1d5d5] rounded-xl px-3 py-2">
                {formErr}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowModal(false)} className="crm-button crm-button-ghost text-sm">Cancel</button>
            <button onClick={saveForm} disabled={submitting} className="crm-button crm-button-primary text-sm disabled:opacity-50">
              <CalendarClock size={15} />
              {submitting ? "Saving..." : "Save Follow Up"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
