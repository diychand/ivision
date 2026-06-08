import Layout from "../components/Layout"

function Dashboard({ onLogout }) {
  const username = localStorage.getItem("username")

  return (
    <Layout onLogout={onLogout}>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#0f172a", marginBottom: "8px" }}>
          Dashboard
        </h1>
        <p style={{ color: "#64748b", marginBottom: "32px" }}>
          Welcome back, {username}!
        </p>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "32px" }}>
          {[
            { label: "Total Datasets", value: "0", color: "#6366f1" },
            { label: "Trained Models", value: "0", color: "#10b981" },
            { label: "Active Jobs", value: "0", color: "#f59e0b" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}>
              <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "8px" }}>{label}</p>
              <p style={{ fontSize: "36px", fontWeight: "700", color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "#0f172a" }}>
            Recent Activity
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            No activity yet. Upload a dataset to get started!
          </p>
        </div>
      </div>
    </Layout>
  )
}

export default Dashboard