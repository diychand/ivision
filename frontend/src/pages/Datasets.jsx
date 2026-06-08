import { useState, useEffect } from "react"
import axios from "axios"
import Layout from "../components/Layout"

function Datasets({ onLogout }) {
  const [datasets, setDatasets] = useState([])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetchDatasets()
  }, [])

  const fetchDatasets = async () => {
    const res = await axios.get("http://127.0.0.1:8000/datasets/")
    setDatasets(res.data)
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setMessage("")

    const formData = new FormData()
    formData.append("file", file)

    try {
      await axios.post("http://127.0.0.1:8000/datasets/upload", formData)
      setMessage("Dataset uploaded successfully!")
      fetchDatasets()
    } catch (err) {
      setMessage("Upload failed. Try again.")
    }
    setUploading(false)
  }

  return (
    <Layout onLogout={onLogout}>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#0f172a", marginBottom: "8px" }}>
          Datasets
        </h1>
        <p style={{ color: "#64748b", marginBottom: "32px" }}>
          Upload and manage your training datasets
        </p>

        {/* Upload Box */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "32px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: "24px",
          textAlign: "center",
          border: "2px dashed #e2e8f0"
        }}>
          <p style={{ color: "#64748b", marginBottom: "16px" }}>
            Upload a CSV or ZIP file to get started
          </p>
          <label style={{
            background: "#6366f1",
            color: "white",
            padding: "10px 24px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500"
          }}>
            {uploading ? "Uploading..." : "Choose File"}
            <input
              type="file"
              onChange={handleUpload}
              style={{ display: "none" }}
              accept=".csv,.zip"
            />
          </label>
          {message && (
            <p style={{ marginTop: "12px", color: message.includes("success") ? "#10b981" : "#ef4444" }}>
              {message}
            </p>
          )}
        </div>

        {/* Datasets Table */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflow: "hidden"
        }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>
              Your Datasets ({datasets.length})
            </h2>
          </div>
          {datasets.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
              No datasets yet. Upload your first dataset above!
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>Name</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>Size</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map(dataset => (
                  <tr key={dataset.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "16px 24px", fontSize: "14px", color: "#0f172a" }}>
                      {dataset.name}
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: "14px", color: "#64748b" }}>
                      {(dataset.file_size / 1024).toFixed(2)} KB
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

export default Datasets