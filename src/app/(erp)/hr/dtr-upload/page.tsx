export default function DtrUploadPage() {
  const ACCENT = "#7e3af2";

  const formats = [
    { format: "CSV", desc: "Comma-separated values from biometric systems" },
    { format: "XLSX", desc: "Excel spreadsheet export" },
    { format: "JPG", desc: "Scanned or photographed manual timesheets" },
    { format: "PNG", desc: "Digital image of time record sheets" },
  ];

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ marginBottom: "20px" }}>
          <a href="/hr" style={{ fontSize: "13px", color: ACCENT, textDecoration: "none", fontWeight: 500 }}>
            ← HR & Payroll
          </a>
        </div>
        <h1 style={{ margin: "0 0 6px", fontSize: "26px", fontWeight: 700, color: "#111827" }}>DTR Upload</h1>
        <p style={{ margin: "0 0 28px", fontSize: "14px", color: "#6b7280" }}>
          Upload and process Daily Time Records from biometric or manual entry.
        </p>

        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "24px", marginBottom: "20px", borderLeft: `4px solid ${ACCENT}` }}>
          <h2 style={{ margin: "0 0 10px", fontSize: "15px", fontWeight: 700, color: "#111827" }}>How DTR Upload Works</h2>
          <p style={{ margin: 0, fontSize: "14px", color: "#374151", lineHeight: "1.6" }}>
            Daily Time Records can be uploaded as CSV or image files from the HR portal. Uploaded DTRs are attached to employee records and verified by HR supervisors.
          </p>
        </div>

        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden", marginBottom: "20px" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#111827" }}>File Formats Accepted</h2>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "11px 20px", textAlign: "left", fontWeight: 600, color: "#374151", width: "120px" }}>Format</th>
                <th style={{ padding: "11px 20px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {formats.map((row, i) => (
                <tr key={row.format} style={{ borderBottom: i < formats.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                  <td style={{ padding: "12px 20px" }}>
                    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, background: "#ede9fe", color: ACCENT, letterSpacing: "0.03em" }}>
                      {row.format}
                    </span>
                  </td>
                  <td style={{ padding: "12px 20px", color: "#374151" }}>{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "20px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#111827", marginBottom: "4px" }}>View Existing DTR Records</div>
            <div style={{ fontSize: "13px", color: "#6b7280" }}>Browse and manage previously uploaded time records.</div>
          </div>
          <a href="/hr/dtr" style={{ display: "inline-block", padding: "9px 20px", background: ACCENT, color: "#fff", borderRadius: "7px", textDecoration: "none", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap" }}>
            View DTR Records →
          </a>
        </div>

        <div style={{ background: "#faf5ff", border: "1px solid #ddd6fe", borderRadius: "10px", padding: "16px 20px" }}>
          <div style={{ fontSize: "13px", color: "#5b21b6", fontWeight: 500 }}>
            For bulk DTR uploads, coordinate with HR Administration.
          </div>
        </div>
      </div>
    </main>
  );
}
