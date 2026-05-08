"use client";

import { useState, useTransition } from "react";
import { updateGlobalSetting } from "@/actions/master-list";

type Setting = { key: string; value: string | null; label: string; description: string | null };

const ACCENT = "#1d4ed8";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.55rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px",
  fontSize: "0.9rem", boxSizing: "border-box", background: "#fff",
};

export default function GlobalConfigClient({ settings }: { settings: Setting[] }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value ?? ""])),
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [, startTransition] = useTransition();

  function handleSave(key: string) {
    setSaving(key);
    startTransition(async () => {
      const result = await updateGlobalSetting(key, values[key] ?? "");
      setMsgs((prev) => ({ ...prev, [key]: result.success ? { ok: true, text: "Saved" } : { ok: false, text: result.error ?? "Error" } }));
      setSaving(null);
    });
  }

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "760px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Admin</a>
        </div>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Global Configurations</h1>
        <p style={{ margin: "0 0 1.75rem", color: "#6b7280", fontSize: "0.9rem" }}>
          Company-wide settings used across all modules.
        </p>

        {settings.length === 0 ? (
          <div style={{ padding: "2.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No settings found. Run migration <code>017_small_fixes.sql</code> in Supabase to seed defaults.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {settings.map((s) => {
              const msg = msgs[s.key];
              return (
                <div key={s.key} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <div style={{ fontWeight: 700, color: "#111827", fontSize: "0.95rem", marginBottom: "0.15rem" }}>{s.label}</div>
                      {s.description && (
                        <div style={{ fontSize: "0.78rem", color: "#9ca3af", marginBottom: "0.65rem" }}>{s.description}</div>
                      )}
                      <input
                        style={inputStyle}
                        value={values[s.key] ?? ""}
                        onChange={(e) => setValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
                        placeholder="(empty)"
                      />
                      {msg && (
                        <div style={{ marginTop: "0.4rem", fontSize: "0.78rem", color: msg.ok ? "#16a34a" : "#b91c1c" }}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleSave(s.key)}
                      disabled={saving === s.key}
                      style={{
                        marginTop: "1.55rem",
                        padding: "0.5rem 1.1rem", borderRadius: "6px",
                        background: saving === s.key ? "#93c5fd" : ACCENT,
                        color: "#fff", border: "none", fontSize: "0.85rem", fontWeight: 600,
                        cursor: saving === s.key ? "not-allowed" : "pointer", flexShrink: 0,
                      }}
                    >
                      {saving === s.key ? "Saving…" : "Save"}
                    </button>
                  </div>
                  <div style={{ marginTop: "0.65rem", fontSize: "0.7rem", color: "#d1d5db", fontFamily: "monospace" }}>{s.key}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
