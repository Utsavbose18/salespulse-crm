import { useState } from "react";
import API from "../api";
import { saveAuth } from "../auth";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, Users, BarChart3, CalendarRange } from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const submit = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.append("username", form.username);
      params.append("password", form.password);

      const res = await API.post("/api/auth/login", params);
      saveAuth(res.data);
      nav("/");
    } catch (err) {
      setError(
        typeof err.response?.data?.detail === "string"
          ? err.response.data.detail
          : "Unable to sign in. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crm-auth-shell">
      <div className="crm-auth-left">
        <div className="crm-auth-panel">
          <div className="crm-auth-brand">
            <span className="crm-auth-brand-dot" />
            <span>CRM Pro</span>
          </div>

          <div className="crm-section-kicker mb-4">Secure access</div>
          <h1 className="crm-auth-title">Welcome back</h1>
          <p className="crm-auth-subtitle">
            Sign in to access your leads, follow ups, members, and live CRM reporting.
          </p>

          <div className="space-y-4">
            <div className="crm-field">
              <label className="crm-label">Username</label>
              <input
                placeholder="Enter your username"
                className="crm-input"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                className="crm-input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-[#f1d0d0] bg-[#fff5f5] px-4 py-3 text-sm text-[#bc4c4c]">
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={loading}
              className="crm-button crm-button-primary w-full !py-3"
            >
              <span>{loading ? "Signing in..." : "Login to Dashboard"}</span>
              {!loading && <ArrowRight size={16} />}
            </button>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <ShieldCheck size={16} className="text-[var(--brand)]" />
            Secure internal access for CRM users.
          </div>
        </div>
      </div>

      <div className="crm-auth-right">
        <div className="crm-auth-hero">
          <div>
            <div className="crm-auth-hero-chip">Professional lead management</div>

            <h3>Run your sales process with clarity, consistency, and control.</h3>

            <p>
              Track incoming leads, manage follow ups, monitor team activity,
              and keep your pipeline organized with a polished product-grade CRM interface.
            </p>

            <div className="crm-hero-metrics">
              <div className="crm-hero-metric">
                <div className="crm-hero-metric-label flex items-center gap-2">
                  <Users size={15} /> Team visibility
                </div>
                <div className="crm-hero-metric-value">Centralized</div>
              </div>

              <div className="crm-hero-metric">
                <div className="crm-hero-metric-label flex items-center gap-2">
                  <BarChart3 size={15} /> Pipeline health
                </div>
                <div className="crm-hero-metric-value">Measured</div>
              </div>

              <div className="crm-hero-metric">
                <div className="crm-hero-metric-label flex items-center gap-2">
                  <CalendarRange size={15} /> Follow up flow
                </div>
                <div className="crm-hero-metric-value">Organized</div>
              </div>

              <div className="crm-hero-metric">
                <div className="crm-hero-metric-label flex items-center gap-2">
                  <ShieldCheck size={15} /> Workspace feel
                </div>
                <div className="crm-hero-metric-value">Premium</div>
              </div>
            </div>
          </div>

          <div className="crm-card-soft p-5">
            <p className="text-sm leading-7 text-[var(--text-soft)]">
              Built with a bright professional visual system, stronger information hierarchy,
              cleaner spacing, and a more product-style CRM experience across every screen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
