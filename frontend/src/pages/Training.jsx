import { useState, useEffect } from "react"
import axios from "axios"
import Layout from "../components/Layout"

function Training({ onLogout }) {
  const [jobs, setJobs] = useState([])
  const [datasets, setDatasets] = useState([])
  const [form, setForm] = useState({
    name: "",
    dataset_id: "",
    model_type: "classification",
    epochs: 10
  })
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetchJobs()
    fetchDatasets()
    const interval = setInterval(fetchJobs, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchJobs = async () => {
    const res = await axios.get("http://127.0.0.1:8000/training/jobs")
    setJobs(res.data)
  }

  const fetchDatasets = async () => {
    const res = await axios.get("http://127.0.0.1:8000/datasets/")
    setDatasets(res.data)
  }

  const startTraining = async () => {
    try {
      await axios.post(
        `http://127.0.0.1:8000/training/start?name=${form.name}&dataset_id=${form.dataset_id}&model_type=${form.model_type}&epochs=${form.epochs}`
      )
      setMessage("Training started!")
      fetchJobs()
    } catch (err) {
      setMessage("Failed to start training.")
    }
  }

  const getStatusColor = (status) => {
    if (status === "completed") return "#10b981"
    if (status === "training") return "#6366f1"
    return "#f59e0b"
  }

  return (
    <Layout onLogout={onLogout}>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#0f172a", marginBottom: "8px" }}>
          Training
        </h1>
        <p style={{ color: "#64748b", marginBottom: "32px" }}>
          Configure and launch model training jobs
        </p>

        {/* Training Form */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: "24px"
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px", color: "#0f172a" }}>
            New Training Job
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ fontSize: "13px", color: "#64748b", display: "block", marginBottom: "6px" }}>
                Job Name
              </label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Image Classifier v1"
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "14px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "13px", color: "#64748b", display: "block", marginBottom: "6px" }}>
                Dataset
              </label>
              <select
                value={form.dataset_id}
                onChange={e => setForm({ ...form, dataset_id: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "14px" }}
              >
                <option value="">Select dataset</option>
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "13px", color: "#64748b", display: "block", marginBottom: "6px" }}>
                Model Type
              </label>
              <select
                value={form.model_type}
                onChange={e => setForm({ ...form, model_type: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "14px" }}
              >
                <option value="classification">Classification</option>
                <option value="detection">Object Detection</option>
                <option value="nlp">NLP / Text</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "13px", color: "#64748b", display: "block", marginBottom: "6px" }}>
                Epochs
              </label>
              <input
                type="number"
                value={form.epochs}
                onChange={e => setForm({ ...form, epochs: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "14px" }}
              />
            </div>
          </div>
          <button
            onClick={startTraining}
            style={{
              background: "#6366f1",
              color: "white",
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            Start Training
          </button>
          {message && (
            <span style={{ marginLeft: "16px", color: "#10b981", fontSize: "14px" }}>{message}</span>
          )}
        </div>

        {/* Jobs Table */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflow: "hidden"
        }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>
              Training Jobs ({jobs.length})
            </h2>
          </div>
          {jobs.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
              No training jobs yet. Start your first job above!
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>Name</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>Model</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>Status</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>Accuracy</th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "13px", color: "#64748b" }}>Loss</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "16px 24px", fontSize: "14px", color: "#0f172a" }}>{job.name}</td>
                    <td style={{ padding: "16px 24px", fontSize: "14px", color: "#64748b" }}>{job.model_type}</td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{
                        background: getStatusColor(job.status) + "20",
                        color: getStatusColor(job.status),
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "500"
                      }}>
                        {job.status}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: "14px", color: "#64748b" }}>
                      {job.accuracy ? (job.accuracy * 100).toFixed(2) + "%" : "-"}
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: "14px", color: "#64748b" }}>
                      {job.loss ? job.loss.toFixed(4) : "-"}
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

export default Training