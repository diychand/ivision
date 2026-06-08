import { useState, useEffect } from "react"
import axios from "axios"
import Layout from "../components/Layout"

function Evaluation({ onLogout }) {
  const [jobs, setJobs] = useState([])
  const [evaluation, setEvaluation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    const res = await axios.get("http://127.0.0.1:8000/training/jobs")
    setJobs(res.data.filter(j => j.status === "completed" && j.model_path))
  }

  const evaluate = async (jobId) => {
    setLoading(true)
    setError("")
    setEvaluation(null)
    try {
      const res = await axios.get(`http://127.0.0.1:8000/evaluation/job/${jobId}`)
      setEvaluation(res.data)
    } catch (err) {
      setError("Evaluation failed. Make sure the job is completed.")
    }
    setLoading(false)
  }

  const MetricCard = ({ label, value, color }) => (
    <div style={{
      background: "white",
      borderRadius: "12px",
      padding: "20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      textAlign: "center"
    }}>
      <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "8px" }}>{label}</p>
      <p style={{ fontSize: "28px", fontWeight: "700", color }}>{(value * 100).toFixed(2)}%</p>
    </div>
  )

  return (
    <Layout onLogout={onLogout}>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#0f172a", marginBottom: "8px" }}>
          Model Evaluation
        </h1>
        <p style={{ color: "#64748b", marginBottom: "32px" }}>
          Evaluate trained models with detailed metrics
        </p>

        {/* Job Selection */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: "24px"
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "#0f172a" }}>
            Select a completed job to evaluate
          </h2>
          {jobs.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>No completed jobs with saved models found.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {jobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => evaluate(job.id)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: "white",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#6366f1",
                    fontWeight: "500"
                  }}
                >
                  {job.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "40px", color: "#6366f1" }}>
            Evaluating model...
          </div>
        )}

        {error && (
          <div style={{ color: "#ef4444", padding: "16px", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {evaluation && (
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "20px", color: "#0f172a" }}>
              Results for: {evaluation.job_name}
            </h2>

            {/* Metric Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
              <MetricCard label="Accuracy" value={evaluation.accuracy} color="#6366f1" />
              <MetricCard label="Precision" value={evaluation.precision} color="#10b981" />
              <MetricCard label="Recall" value={evaluation.recall} color="#f59e0b" />
              <MetricCard label="F1 Score" value={evaluation.f1} color="#ef4444" />
            </div>

            {/* Confusion Matrix */}
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}>
              <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "#0f172a" }}>
                Confusion Matrix
              </h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "8px 16px", color: "#64748b", fontSize: "13px" }}>Actual \ Predicted</th>
                      {evaluation.classes.map(cls => (
                        <th key={cls} style={{ padding: "8px 16px", color: "#64748b", fontSize: "13px" }}>{cls}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evaluation.confusion_matrix.map((row, i) => (
                      <tr key={i}>
                        <td style={{ padding: "8px 16px", fontWeight: "500", color: "#0f172a", fontSize: "13px" }}>
                          {evaluation.classes[i]}
                        </td>
                        {row.map((val, j) => (
                          <td key={j} style={{
                            padding: "8px 16px",
                            textAlign: "center",
                            background: i === j ? "#6366f120" : "#f8fafc",
                            color: i === j ? "#6366f1" : "#64748b",
                            fontWeight: i === j ? "600" : "400",
                            fontSize: "14px",
                            border: "1px solid #f1f5f9"
                          }}>
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Evaluation