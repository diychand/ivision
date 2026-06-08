import { useState, useEffect } from "react"
import axios from "axios"
import Layout from "../components/Layout"

function Export({ onLogout }) {
  const [models, setModels] = useState([])
  const [exporting, setExporting] = useState({})
  const [exported, setExported] = useState({})

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/models/")
      .then(res => setModels(res.data))
  }, [])

  const handleExport = async (modelId, format) => {
    setExporting(prev => ({ ...prev, [`${modelId}_${format}`]: true }))
    try {
      await axios.post(`http://127.0.0.1:8000/export/${modelId}/${format}`)
      setExported(prev => ({ ...prev, [`${modelId}_${format}`]: true }))
    } catch (err) {
      alert("Export failed: " + err.response?.data?.detail)
    }
    setExporting(prev => ({ ...prev, [`${modelId}_${format}`]: false }))
  }

  const handleDownload = (modelId, format) => {
    window.open(`http://127.0.0.1:8000/export/${modelId}/download/${format}`)
  }

  const ExportCell = ({ modelId, format, color }) => {
    const key = `${modelId}_${format}`
    return (
      <td style={{ padding: "16px 24px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => handleExport(modelId, format)}
            disabled={exporting[key]}
            style={{
              padding: "6px 14px",
              background: exporting[key] ? "#94a3b8" : color,
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: exporting[key] ? "not-allowed" : "pointer",
              fontSize: "13px"
            }}
          >
            {exporting[key] ? "Exporting..." : `Export ${format.toUpperCase()}`}
          </button>
          {exported[key] && (
            <button
              onClick={() => handleDownload(modelId, format)}
              style={{
                padding: "6px 14px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px"
              }}
            >
              ⬇ Download
            </button>
          )}
        </div>
      </td>
    )
  }

  return (
    <Layout onLogout={onLogout}>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#0f172a", marginBottom: "8px" }}>
          Export Models
        </h1>
        <p style={{ color: "#64748b", marginBottom: "32px" }}>
          Export trained models to ONNX or TFLite for edge deployment
        </p>

        {/* Info Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #6366f1" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>ONNX</h3>
            <p style={{ fontSize: "13px", color: "#64748b" }}>Universal format — runs on any device, any language, any framework</p>
          </div>
          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #10b981" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>TFLite</h3>
            <p style={{ fontSize: "13px", color: "#64748b" }}>Optimized for mobile and edge devices — Android, iOS, Raspberry Pi</p>
          </div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>
              Saved Models ({models.length})
            </h2>
          </div>
          {models.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
              No completed models found. Train a model first!
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>Model</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>Version</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>Accuracy</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>ONNX Export</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>TFLite Export</th>
                </tr>
              </thead>
              <tbody>
                {models.map(model => (
                  <tr key={model.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "16px 24px", fontSize: "14px", color: "#0f172a" }}>{model.name}</td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ background: "#6366f120", color: "#6366f1", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "500" }}>
                        {model.version || "v1"}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: "14px", color: "#64748b" }}>
                      {model.accuracy ? (model.accuracy * 100).toFixed(2) + "%" : "-"}
                    </td>
                    <ExportCell modelId={model.id} format="onnx" color="#6366f1" />
                    <ExportCell modelId={model.id} format="tflite" color="#10b981" />
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

export default Export