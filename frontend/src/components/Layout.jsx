import { useNavigate, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Database,
  BrainCircuit,
  Rocket,
  LogOut,
  Menu,
  X,
  BarChart2
} from "lucide-react"
import { useState } from "react"


const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Database, label: "Datasets", path: "/datasets" },
  { icon: BrainCircuit, label: "Training", path: "/training" },
  { icon: Rocket, label: "Deploy", path: "/deploy" },
  { icon: BarChart2, label: "Evaluation", path: "/evaluation" },
]

function Layout({ children, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const username = localStorage.getItem("username")
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8f9fa" }}>
      
      {/* Sidebar */}
      <div style={{
        width: collapsed ? "64px" : "240px",
        background: "#0f172a",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease",
        flexShrink: 0
      }}>
        
        {/* Logo */}
        <div style={{
          padding: "20px 16px",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          {!collapsed && (
            <span style={{
              color: "#6366f1",
              fontWeight: "700",
              fontSize: "20px",
              letterSpacing: "-0.5px"
            }}>
              iVision
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center"
            }}
          >
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  marginBottom: "4px",
                  background: active ? "#1e293b" : "none",
                  border: "none",
                  borderRadius: "8px",
                  color: active ? "#6366f1" : "#94a3b8",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: active ? "600" : "400",
                  textAlign: "left",
                  transition: "all 0.15s ease"
                }}
              >
                <Icon size={18} />
                {!collapsed && <span>{label}</span>}
              </button>
              
            )
          })}
        </nav>

        {/* User + Logout */}
        <div style={{
          padding: "12px 8px",
          borderTop: "1px solid #1e293b"
        }}>
          {!collapsed && (
            <div style={{
              padding: "8px 12px",
              color: "#64748b",
              fontSize: "12px",
              marginBottom: "4px"
            }}>
              {username}
            </div>
          )}
          <button
            onClick={onLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              background: "none",
              border: "none",
              borderRadius: "8px",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: "14px",
              textAlign: "left"
            }}
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        overflow: "auto",
        padding: "32px"
      }}>
        {children}
      </div>
    </div>
  )
}

export default Layout