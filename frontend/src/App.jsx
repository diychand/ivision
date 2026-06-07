import { useState } from "react"
import Login from "./pages/Login"
import Register from "./pages/Register"

function App() {
  const [page, setPage] = useState("login")
  const [user, setUser] = useState(null)

  if (user) {
    return (
      <div style={{ padding: "40px" }}>
        <h1>Welcome to iVision, {user}!</h1>
        <p>You are logged in.</p>
        <button onClick={() => {
          localStorage.removeItem("token")
          localStorage.removeItem("username")
          setUser(null)
        }}>
          Logout
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ padding: "20px", borderBottom: "1px solid #ddd", display: "flex", gap: "16px" }}>
        <button onClick={() => setPage("login")}>Login</button>
        <button onClick={() => setPage("register")}>Register</button>
      </div>

      {page === "login" && (
        <Login onLogin={(username) => setUser(username)} />
      )}
      {page === "register" && (
        <Register onRegister={() => setPage("login")} />
      )}
    </div>
  )
}

export default App