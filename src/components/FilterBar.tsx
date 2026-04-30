"use client";

import { useRouter, usePathname } from "next/navigation";

export type FilterField =
  | { type: "text";   name: string; placeholder: string }
  | { type: "select"; name: string; placeholder: string; options: { value: string; label: string }[] };

interface FilterBarProps {
  fields:  FilterField[];
  values:  Record<string, string>;
  accent?: string;
}

export default function FilterBar({ fields, values, accent = "#1a56db" }: FilterBarProps) {
  const router   = useRouter();
  const pathname = usePathname();

  function buildParams(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    for (const f of fields) {
      const v = overrides[f.name] ?? values[f.name] ?? "";
      if (v) p.set(f.name, v);
    }
    return p;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const overrides: Record<string, string> = {};
    for (const f of fields) {
      overrides[f.name] = (data.get(f.name) as string) ?? "";
    }
    router.push(`${pathname}?${buildParams(overrides).toString()}`);
  }

  function handleSelectChange(name: string, value: string) {
    const overrides = { ...values, [name]: value };
    router.push(`${pathname}?${buildParams(overrides).toString()}`);
  }

  const hasFilters = fields.some((f) => values[f.name]);

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1.25rem" }}>
      {fields.map((f) => {
        if (f.type === "text") {
          return (
            <input
              key={f.name}
              name={f.name}
              defaultValue={values[f.name] ?? ""}
              placeholder={f.placeholder}
              style={{
                padding: "0.45rem 0.75rem", borderRadius: "6px",
                border: "1px solid #d1d5db", fontSize: "0.85rem",
                minWidth: "200px", outline: "none", background: "#fff",
              }}
            />
          );
        }
        return (
          <select
            key={f.name}
            name={f.name}
            value={values[f.name] ?? ""}
            onChange={(e) => handleSelectChange(f.name, e.target.value)}
            style={{
              padding: "0.45rem 0.75rem", borderRadius: "6px",
              border: "1px solid #d1d5db", fontSize: "0.85rem",
              background: "#fff", cursor: "pointer",
            }}
          >
            <option value="">{f.placeholder}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        );
      })}

      <button
        type="submit"
        style={{
          padding: "0.45rem 1rem", borderRadius: "6px", border: "none",
          background: accent, color: "#fff", fontSize: "0.85rem",
          fontWeight: 600, cursor: "pointer",
        }}
      >
        Search
      </button>

      {hasFilters && (
        <a
          href={pathname}
          style={{ fontSize: "0.82rem", color: "#6b7280", textDecoration: "none", padding: "0.45rem 0.25rem" }}
        >
          Clear
        </a>
      )}
    </form>
  );
}
