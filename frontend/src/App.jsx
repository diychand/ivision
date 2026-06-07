import { useState, useEffect } from "react"

function App() {
  const [status, setStatus] = useState("Checking...")

  useEffect(() => {
    fetch("http://127.0.0.1:8000")
      .then(res => res.json())
      .then(data => setStatus(data.message))
  }, [])

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>iVision</h1>
      <p>Backend status: {status}</p>
    </div>
  )
}

export default App