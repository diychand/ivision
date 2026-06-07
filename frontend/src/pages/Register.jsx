import { useState } from "react"
import axios from "axios"

function Register({ onRegister }) {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleRegister = async () => {
    try {
      await axios.post(
        `http://127.0.0.1:8000/register?username=${username}&email=${email}&password=${password}`
      )
      onRegister()
    } catch (err) {
      setError("Registration failed. Email may already exist.")
    }
  }

  return (
    <div style={{ padding: "40px", maxWidth: "400px", margin: "0 auto" }}>
      <h2>Create iVision Account</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <input
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        style={{ display: "block", width: "100%", padding: "8px", marginBottom: "12px" }}
      />
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
      <button onClick={handleRegister} style={{ padding: "8px 24px" }}>
        Register
      </button>
    </div>
  )
}

export default Register