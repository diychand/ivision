function Dashboard() {
  const username = localStorage.getItem("username")

  return (
    <div style={{ padding: "40px" }}>
      <h1>iVision Dashboard</h1>
      <p>Welcome back, {username}!</p>
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(3, 1fr)", 
        gap: "20px",
        marginTop: "30px" 
      }}>
        <div style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3>Datasets</h3>
          <p style={{ fontSize: "32px", fontWeight: "bold" }}>0</p>
          <p style={{ color: "gray" }}>Total datasets</p>
        </div>
        <div style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3>Models</h3>
          <p style={{ fontSize: "32px", fontWeight: "bold" }}>0</p>
          <p style={{ color: "gray" }}>Trained models</p>
        </div>
        <div style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3>Training Jobs</h3>
          <p style={{ fontSize: "32px", fontWeight: "bold" }}>0</p>
          <p style={{ color: "gray" }}>Active jobs</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard