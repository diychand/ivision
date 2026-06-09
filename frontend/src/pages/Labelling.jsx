import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import Layout from "../components/Layout"

function Labelling({ onLogout }) {
  const [datasets, setDatasets] = useState([])
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [rows, setRows] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [labels, setLabels] = useState({})
  const [customLabels, setCustomLabels] = useState(["positive", "negative", "neutral"])
  const [newLabel, setNewLabel] = useState("")
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [bulkLabel, setBulkLabel] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [view, setView] = useState("single")
  const [activeRows, setActiveRows] = useState([])
  const [activeMode, setActiveMode] = useState(false)
  const [activeMessage, setActiveMessage] = useState("")

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/datasets/")
      .then(res => setDatasets(res.data.filter(d => d.name.endsWith(".csv"))))
  }, [])

  const handleKeyPress = useCallback((e) => {
    if (!selectedDataset || view !== "single") return
    const num = parseInt(e.key)
    if (num >= 1 && num <= customLabels.length) {
      assignLabel(customLabels[num - 1])
    }
    if (e.key === "ArrowRight") setCurrentIndex(prev => Math.min(rows.length - 1, prev + 1))
    if (e.key === "ArrowLeft") setCurrentIndex(prev => Math.max(0, prev - 1))
  }, [selectedDataset, customLabels, rows, view, currentIndex])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [handleKeyPress])

  const loadDataset = async (dataset) => {
    const res = await axios.get(`http://127.0.0.1:8000/labelling/dataset/${dataset.id}`)
    setSelectedDataset(res.data)
    setRows(res.data.rows)
    setCurrentIndex(0)
    setLabels({})
    setSaved(false)
    setSelectedRows([])
  }

  const assignLabel = (label) => {
    setLabels(prev => ({ ...prev, [currentIndex]: label }))
    if (currentIndex < rows.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const applyBulkLabel = () => {
    if (!bulkLabel) return
    const newLabels = { ...labels }
    selectedRows.forEach(idx => { newLabels[idx] = bulkLabel })
    setLabels(newLabels)
    setSelectedRows([])
    setBulkLabel("")
  }

  const autoLabel = () => {
    const newLabels = { ...labels }
    rows.forEach((text, idx) => {
      if (newLabels[idx]) return
      const lower = text.toLowerCase()
      const positiveWords = ["good", "great", "love", "excellent", "amazing", "best", "happy", "perfect", "fantastic", "wonderful"]
      const negativeWords = ["bad", "terrible", "hate", "worst", "awful", "poor", "disappointed", "broken", "waste", "horrible"]
      const posScore = positiveWords.filter(w => lower.includes(w)).length
      const negScore = negativeWords.filter(w => lower.includes(w)).length
      if (posScore > negScore) newLabels[idx] = "positive"
      else if (negScore > posScore) newLabels[idx] = "negative"
      else newLabels[idx] = "neutral"
    })
    setLabels(newLabels)
  }

  const runActiveLearning = async () => {
    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/labelling/active-learn/${selectedDataset.dataset_id}`,
        { labels, top_n: 10 }
      )
      setActiveRows(res.data.uncertain_indices)
      setActiveMode(true)
      setActiveMessage(res.data.message)
      setView("grid")
    } catch (err) {
      alert("Active learning failed")
    }
  }

  const saveLabels = async () => {
    setSaving(true)
    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/labelling/save/${selectedDataset.dataset_id}`,
        { labels, custom_labels: customLabels }
      )
      setSaved(true)
      alert(`Saved! ${res.data.total_labelled} rows labelled. Ready for training!`)
    } catch (err) {
      alert("Save failed")
    }
    setSaving(false)
  }

  const addCustomLabel = () => {
    if (newLabel && !customLabels.includes(newLabel)) {
      setCustomLabels(prev => [...prev, newLabel])
      setNewLabel("")
    }
  }

  const filteredRows = rows.filter(row =>
    searchTerm === "" || row.toString().toLowerCase().includes(searchTerm.toLowerCase())
  )

  const progress = rows.length > 0 ? Math.round((Object.keys(labels).length / rows.length) * 100) : 0
  const labelColors = { positive: "#10b981", negative: "#ef4444", neutral: "#f59e0b" }
  const getLabelColor = (label) => labelColors[label] || "#6366f1"

  return (
    <Layout onLogout={onLogout}>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#0f172a", marginBottom: "8px" }}>
          Data Labelling
        </h1>
        <p style={{ color: "#64748b", marginBottom: "32px" }}>
          Label your dataset for model training
        </p>

        {!selectedDataset ? (
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "#0f172a" }}>
              Select a CSV dataset to label
            </h2>
            {datasets.length === 0 ? (
              <p style={{ color: "#94a3b8" }}>No CSV datasets found. Upload one first!</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                {datasets.map(d => (
                  <button key={d.id} onClick={() => loadDataset(d)} style={{
                    padding: "12px 24px", background: "white", border: "1px solid #e2e8f0",
                    borderRadius: "8px", cursor: "pointer", fontSize: "14px", color: "#6366f1", fontWeight: "500"
                  }}>
                    {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Progress Bar */}
            <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "14px", color: "#0f172a", fontWeight: "500" }}>
                  {selectedDataset.dataset_name}
                </span>
                <span style={{ fontSize: "14px", color: "#64748b" }}>
                  {Object.keys(labels).length} / {rows.length} labelled ({progress}%)
                </span>
              </div>
              <div style={{ background: "#f1f5f9", borderRadius: "999px", height: "8px", marginBottom: "16px" }}>
                <div style={{
                  background: "#6366f1", borderRadius: "999px", height: "8px",
                  width: `${progress}%`, transition: "width 0.3s ease"
                }} />
              </div>

              {/* Toolbar */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button onClick={() => setView(view === "single" ? "grid" : "single")} style={{
                  padding: "6px 14px", background: "#f1f5f9", border: "none",
                  borderRadius: "6px", cursor: "pointer", fontSize: "13px", color: "#0f172a"
                }}>
                  {view === "single" ? "📋 Grid View" : "📄 Single View"}
                </button>
                <button onClick={autoLabel} style={{
                  padding: "6px 14px", background: "#6366f120", border: "none",
                  borderRadius: "6px", cursor: "pointer", fontSize: "13px", color: "#6366f1", fontWeight: "500"
                }}>
                  ⚡ Auto-Label All
                </button>
                <button onClick={runActiveLearning} style={{
                  padding: "6px 14px", background: "#f59e0b20", border: "none",
                  borderRadius: "6px", cursor: "pointer", fontSize: "13px", color: "#f59e0b", fontWeight: "500"
                }}>
                  🧠 Active Learn
                </button>
                {view === "grid" && (
                  <button onClick={() => setBulkMode(!bulkMode)} style={{
                    padding: "6px 14px", background: bulkMode ? "#6366f1" : "#f1f5f9",
                    color: bulkMode ? "white" : "#0f172a", border: "none",
                    borderRadius: "6px", cursor: "pointer", fontSize: "13px"
                  }}>
                    ✓ Bulk Select
                  </button>
                )}
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search rows..."
                  style={{
                    padding: "6px 12px", borderRadius: "6px", border: "1px solid #e2e8f0",
                    fontSize: "13px", marginLeft: "auto"
                  }}
                />
              </div>
            </div>

            {/* Keyboard shortcut hint */}
            {view === "single" && (
              <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "12px", color: "#64748b" }}>
                ⌨️ Keyboard shortcuts: {customLabels.map((l, i) => (
                  <span key={l} style={{ marginRight: "12px" }}>
                    <strong>{i + 1}</strong> = {l}
                  </span>
                ))} | <strong>← →</strong> navigate
              </div>
            )}

            {/* Bulk Label Bar */}
            {bulkMode && selectedRows.length > 0 && (
              <div style={{
                background: "#6366f1", borderRadius: "8px", padding: "12px 16px",
                marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px"
              }}>
                <span style={{ color: "white", fontSize: "13px" }}>{selectedRows.length} rows selected</span>
                <select value={bulkLabel} onChange={e => setBulkLabel(e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: "6px", border: "none", fontSize: "13px" }}>
                  <option value="">Choose label...</option>
                  {customLabels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <button onClick={applyBulkLabel} style={{
                  padding: "4px 16px", background: "white", color: "#6366f1",
                  border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600"
                }}>Apply</button>
                <button onClick={() => setSelectedRows([])} style={{
                  padding: "4px 16px", background: "none", color: "white",
                  border: "1px solid white", borderRadius: "6px", cursor: "pointer", fontSize: "13px"
                }}>Clear</button>
              </div>
            )}

            {view === "single" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "20px" }}>
                <div style={{ background: "white", borderRadius: "12px", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
                    <span style={{ fontSize: "13px", color: "#94a3b8" }}>Row {currentIndex + 1} of {rows.length}</span>
                    {labels[currentIndex] && (
                      <span style={{
                        background: getLabelColor(labels[currentIndex]) + "20",
                        color: getLabelColor(labels[currentIndex]),
                        padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "500"
                      }}>
                        {labels[currentIndex]}
                      </span>
                    )}
                  </div>
                  <div style={{
                    background: "#f8fafc", borderRadius: "8px", padding: "24px",
                    marginBottom: "32px", fontSize: "18px", color: "#0f172a",
                    lineHeight: "1.6", minHeight: "100px"
                  }}>
                    {rows[currentIndex]}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
                    {customLabels.map((label, i) => (
                      <button key={label} onClick={() => assignLabel(label)} style={{
                        padding: "10px 24px",
                        background: labels[currentIndex] === label ? getLabelColor(label) : "white",
                        color: labels[currentIndex] === label ? "white" : getLabelColor(label),
                        border: `2px solid ${getLabelColor(label)}`,
                        borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "500"
                      }}>
                        [{i + 1}] {label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0} style={{
                        padding: "8px 20px", background: "none", border: "1px solid #e2e8f0",
                        borderRadius: "8px", cursor: "pointer", fontSize: "14px", color: "#64748b"
                      }}>← Previous</button>
                    <button onClick={() => setCurrentIndex(prev => Math.min(rows.length - 1, prev + 1))}
                      disabled={currentIndex === rows.length - 1} style={{
                        padding: "8px 20px", background: "none", border: "1px solid #e2e8f0",
                        borderRadius: "8px", cursor: "pointer", fontSize: "14px", color: "#64748b"
                      }}>Next →</button>
                    <button onClick={() => setSelectedDataset(null)} style={{
                      padding: "8px 20px", background: "none", border: "1px solid #e2e8f0",
                      borderRadius: "8px", cursor: "pointer", fontSize: "14px", color: "#64748b"
                    }}>Change Dataset</button>
                  </div>
                </div>

                {/* Right Panel */}
                <div>
                  <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "16px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "12px" }}>Label Classes</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                      {customLabels.map((label, i) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: getLabelColor(label) }} />
                          <span style={{ fontSize: "13px", color: "#0f172a" }}>{label}</span>
                          <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "auto" }}>[{i + 1}]</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                        placeholder="Add label..." style={{
                          flex: 1, padding: "6px 10px", borderRadius: "6px",
                          border: "1px solid #e2e8f0", fontSize: "13px"
                        }} />
                      <button onClick={addCustomLabel} style={{
                        padding: "6px 12px", background: "#6366f1", color: "white",
                        border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px"
                      }}>Add</button>
                    </div>
                  </div>

                  <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "16px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "12px" }}>Distribution</h3>
                    {customLabels.map(label => {
                      const count = Object.values(labels).filter(l => l === label).length
                      const pct = rows.length > 0 ? Math.round((count / rows.length) * 100) : 0
                      return (
                        <div key={label} style={{ marginBottom: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>{label}</span>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>{count}</span>
                          </div>
                          <div style={{ background: "#f1f5f9", borderRadius: "999px", height: "4px" }}>
                            <div style={{ background: getLabelColor(label), borderRadius: "999px", height: "4px", width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <button onClick={saveLabels} disabled={saving || Object.keys(labels).length === 0} style={{
                    width: "100%", padding: "12px",
                    background: saved ? "#10b981" : "#6366f1",
                    color: "white", border: "none", borderRadius: "8px",
                    cursor: "pointer", fontSize: "14px", fontWeight: "500"
                  }}>
                    {saving ? "Saving..." : saved ? "✓ Saved!" : `Save Labels (${Object.keys(labels).length} labelled)`}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Active Learning Banner */}
                {activeMode && (
                  <div style={{
                    background: "#f59e0b20", border: "1px solid #f59e0b",
                    borderRadius: "8px", padding: "12px 16px", marginBottom: "16px",
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                    <span style={{ fontSize: "13px", color: "#92400e" }}>🧠 {activeMessage}</span>
                    <button onClick={() => { setActiveMode(false); setActiveRows([]) }} style={{
                      padding: "4px 12px", background: "#f59e0b", color: "white",
                      border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px"
                    }}>Show All</button>
                  </div>
                )}

                {/* Grid View */}
                <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                    {(activeMode ? rows.filter((_, i) => activeRows.includes(i)) : filteredRows).map((row) => {
                      const realIdx = rows.indexOf(row)
                      const isSelected = selectedRows.includes(realIdx)
                      const rowLabel = labels[realIdx]
                      return (
                        <div key={realIdx} onClick={() => {
                          if (bulkMode) {
                            setSelectedRows(prev =>
                              prev.includes(realIdx) ? prev.filter(i => i !== realIdx) : [...prev, realIdx]
                            )
                          } else {
                            setCurrentIndex(realIdx)
                            setView("single")
                          }
                        }} style={{
                          padding: "16px", borderRadius: "8px", cursor: "pointer",
                          border: isSelected ? "2px solid #6366f1" : "1px solid #e2e8f0",
                          background: isSelected ? "#6366f110" : "white",
                          transition: "all 0.15s ease"
                        }}>
                          <div style={{ fontSize: "13px", color: "#0f172a", marginBottom: "8px", lineHeight: "1.4" }}>
                            {row.toString().substring(0, 80)}{row.toString().length > 80 ? "..." : ""}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>Row {realIdx + 1}</span>
                            {rowLabel ? (
                              <span style={{
                                background: getLabelColor(rowLabel) + "20",
                                color: getLabelColor(rowLabel),
                                padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "500"
                              }}>{rowLabel}</span>
                            ) : (
                              <span style={{ fontSize: "11px", color: "#94a3b8" }}>unlabelled</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <button onClick={saveLabels} disabled={saving || Object.keys(labels).length === 0} style={{
                    width: "100%", padding: "12px",
                    background: saved ? "#10b981" : "#6366f1",
                    color: "white", border: "none", borderRadius: "8px",
                    cursor: "pointer", fontSize: "14px", fontWeight: "500"
                  }}>
                    {saving ? "Saving..." : saved ? "✓ Saved!" : `Save Labels (${Object.keys(labels).length} labelled)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Labelling