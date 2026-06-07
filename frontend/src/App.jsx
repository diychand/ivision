import { useState, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"))

  const handleLogin = (accessToken) => {
    localStorage.setItem("token", accessToken)
    setToken(accessToken)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("username")
    setToken(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          token ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
        }/>
        <Route path="/register" element={
          token ? <Navigate to="/dashboard" /> : <Register onRegister={() => {}} />
        }/>
        <Route path="/dashboard" element={
          token ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />
        }/>
        <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} />}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App