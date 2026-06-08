import { useState, useEffect } from "react"
import axios from "axios"
import Layout from "../components/Layout"

function Models({ onLogout }) {
  const [models, setModels] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [newVersion, setNewVersion] = useState("")

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    const res = await axios.get("http://127.0.0.1:8000/models/")
    setModels(res.data)
  }

  const updateVersion = async (jobId) => {
    await axios.put(`http://127.0.0.1:8000/models/${jobId}/version?version=${newVersion}`)
    setEditingId(null)
    fetchModels()
  }

  const deleteModel = async (jobId) => {
    if (window.confirm("Are you sure you want to delete this model?")) {
      await axios.delete(`http://127.0.0.1:8000/models/${jobId}`)
      fetchModels()
    }
  }

  return (
    <Layout onLogout={onLogout}>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#0f172a", marginBottom: "8px" }}>
          Models
        </h1>
        <p style={{ color: "#64748b", marginBottom: "32px" }}>
          Manage and version your trained models
        </p>

        <div style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflow: "hidden"
        }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>
              Saved Models ({models.length})
            </h2>
          </div>
          {models.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
              No saved models yet. Complete a training job first!
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>Name</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>Type</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>Version</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>Accuracy</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {models.map(model => (
                  <tr key={model.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "16px 24px", fontSize: "14px", color: "#0f172a" }}>{model.name}</td>
                    <td style={{ padding: "16px 24px", fontSize: "14px", color: "#64748b" }}>{model.model_type}</td>
                    <td style={{ padding: "16px 24px" }}>
                      {editingId === model.id ? (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input
                            value={newVersion}
                            onChange={e => setNewVersion(e.target.value)}
                            placeholder="e.g. v2"
                            style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", width: "80px" }}
                          />
                          <button
                            onClick={() => updateVersion(model.id)}
                            style={{ padding: "4px 12px", background: "#6366f1", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{ padding: "4px 12px", background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span style={{
                          background: "#6366f120",
                          color: "#6366f1",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "500"
                        }}>
                          {model.version || "v1"}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: "14px", color: "#64748b" }}>
                      {model.accuracy ? (model.accuracy * 100).toFixed(2) + "%" : "-"}
                    </td>
                    <td style={{ padding: "16px 24px", display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => { setEditingId(model.id); setNewVersion(model.version || "v1") }}
                        style={{ padding: "4px 12px", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", fontSize: "13px", color: "#6366f1" }}
                      >
                        Edit Version
                      </button>
                      <button
                        onClick={() => deleteModel(model.id)}
                        style={{ padding: "4px 12px", border: "1px solid #fee2e2", borderRadius: "6px", cursor: "pointer", fontSize: "13px", color: "#ef4444" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default Models