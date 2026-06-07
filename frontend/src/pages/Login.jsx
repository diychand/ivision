import { useState } from "react"
import axios from "axios"

function Login({ onLogin }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleLogin = async () => {
    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/login?email=${email}&password=${password}`
      )
      localStorage.setItem("token", res.data.access_token)
      localStorage.setItem("username", res.data.username)
      onLogin(res.data.username)
    } catch (err) {
      setError("Invalid email or password")
    }
  }

  return (
    <div style={{ padding: "40px", maxWidth: "400px", margin: "0 auto" }}>
      <h2>Login to iVision</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <input
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ display: "block", width: "100%", padding: "8px", marginBottom: "12px" }}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ display: "block", width: "100%", padding: "8px", marginBottom: "12px" }}
      />
      <button onClick={handleLogin} style={{ padding: "8px 24px" }}>
        Login
      </button>
    </div>
  )
}

export default Login