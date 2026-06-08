import { useState } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import Datasets from "./pages/Datasets"
import Training from "./pages/Training"
import Evaluation from "./pages/Evaluation"
import Models from "./pages/Models"
import Export from "./pages/Export"
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
        } />
        <Route path="/register" element={
          token ? <Navigate to="/dashboard" /> : <Register onRegister={() => {}} />
        } />
        <Route path="/dashboard" element={
          token ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />
        } />
        <Route path="/datasets" element={
          token ? <Datasets onLogout={handleLogout} /> : <Navigate to="/login" />
        } />
         <Route path="/training" element={
          token ? <Training onLogout={handleLogout} /> : <Navigate to="/login" />
        } />
        <Route path="/evaluation" element={
         token ? <Evaluation onLogout={handleLogout} /> : <Navigate to="/login" />
        } />
        <Route path="/models" element={
         token ? <Models onLogout={handleLogout} /> : <Navigate to="/login" />
        } />
        <Route path="/export" element={
          token ? <Export onLogout={handleLogout} /> : <Navigate to="/login" />
        } />
        <Route path="*" element={
          <Navigate to={token ? "/dashboard" : "/login"} />
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App