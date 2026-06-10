import { useState, useEffect, useRef, useCallback } from "react"
import axios from "axios"
import Layout from "../components/Layout"

function ImageLabelling({ onLogout }) {
  const [datasets, setDatasets] = useState([])
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [images, setImages] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentImage, setCurrentImage] = useState(null)
  const [annotations, setAnnotations] = useState({})
  const [classes, setClasses] = useState(["object"])
  const [activeClass, setActiveClass] = useState("object")
  const [newClass, setNewClass] = useState("")
  const [drawing, setDrawing] = useState(false)
  const [startPos, setStartPos] = useState(null)
  const [currentBox, setCurrentBox] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [imgDimensions, setImgDimensions] = useState({ w: 640, h: 480 })
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const [yoloModels, setYoloModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(null)
  const [autoLabelling, setAutoLabelling] = useState(false)
  const [autoLabelDone, setAutoLabelDone] = useState(false)
  const [confidence, setConfidence] = useState(0.25)

  useEffect(() => {
  axios.get("http://127.0.0.1:8000/datasets/")
    .then(res => setDatasets(res.data.filter(d => d.name.endsWith(".zip"))))
  // Load detection models
  axios.get("http://127.0.0.1:8000/models/")
    .then(res => {
      const detection = res.data.filter(m => 
        m.model_type === "object_detection" || 
        m.model_type === "detection" ||
        m.name?.toLowerCase().includes("yolo")
      )
      setYoloModels(detection)
      if (detection.length > 0) setSelectedModel(detection[0].id)
    })
}, [])

  const loadDataset = async (dataset) => {
    const res = await axios.get(`http://127.0.0.1:8000/image-labelling/dataset/${dataset.id}`)
    setSelectedDataset(res.data)
    setImages(res.data.images)
    setCurrentIndex(0)
    setAnnotations({})
    setSaved(false)
    // Auto-populate classes from folder names
    const folderClasses = [...new Set(res.data.images.map(i => i.class_hint).filter(Boolean))]
    if (folderClasses.length > 0) setClasses(folderClasses)
    loadImage(res.data.dataset_id, res.data.images[0])
  }

  const loadImage = async (datasetId, imageInfo) => {
    setCurrentImage(null)
    setCurrentBox(null)
    const res = await axios.get(
      `http://127.0.0.1:8000/image-labelling/image/${datasetId}?path=${encodeURIComponent(imageInfo.rel_path)}`
    )
    setCurrentImage(res.data.image_data)
    // Set active class to folder hint if available
    if (imageInfo.class_hint && classes.includes(imageInfo.class_hint)) {
      setActiveClass(imageInfo.class_hint)
    }
  }

  const goToImage = (index) => {
    setCurrentIndex(index)
    setCurrentBox(null)
    loadImage(selectedDataset.dataset_id, images[index])
  }

  // Canvas drawing
  const getCanvasPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const handleMouseDown = (e) => {
    const pos = getCanvasPos(e)
    setDrawing(true)
    setStartPos(pos)
    setCurrentBox({ x: pos.x, y: pos.y, w: 0, h: 0, label: activeClass })
  }

  const handleMouseMove = (e) => {
    if (!drawing || !startPos) return
    const pos = getCanvasPos(e)
    setCurrentBox({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
      label: activeClass
    })
  }

  const handleMouseUp = () => {
    if (!drawing || !currentBox) return
    setDrawing(false)
    if (currentBox.w < 10 || currentBox.h < 10) {
      setCurrentBox(null)
      return
    }
    const filename = images[currentIndex].filename
    const canvas = canvasRef.current
    const boxWithDims = {
      ...currentBox,
      width: canvas.width,
      height: canvas.height
    }
    setAnnotations(prev => ({
      ...prev,
      [filename]: {
        boxes: [...(prev[filename]?.boxes || []), boxWithDims],
        width: canvas.width,
        height: canvas.height
      }
    }))
    setCurrentBox(null)
    setSaved(false)
  }

  const deleteBox = (filename, index) => {
    setAnnotations(prev => ({
      ...prev,
      [filename]: {
        ...prev[filename],
        boxes: prev[filename].boxes.filter((_, i) => i !== index)
      }
    }))
    setSaved(false)
  }

  

  // Draw everything on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !currentImage) return
    const ctx = canvas.getContext("2d")
    const img = new Image()
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      setImgDimensions({ w: img.naturalWidth, h: img.naturalHeight })
      ctx.drawImage(img, 0, 0)
      // Draw saved boxes
      const filename = images[currentIndex]?.filename
      const saved_boxes = annotations[filename]?.boxes || []
      const colors = { circles: "#ef4444", squares: "#3b82f6", triangles: "#10b981" }
      saved_boxes.forEach((box, i) => {
        const color = colors[box.label] || "#6366f1"
        ctx.strokeStyle = color
        ctx.lineWidth = 3
        ctx.strokeRect(box.x, box.y, box.w, box.h)
        ctx.fillStyle = color + "30"
        ctx.fillRect(box.x, box.y, box.w, box.h)
        ctx.fillStyle = color
        ctx.fillRect(box.x, box.y - 20, ctx.measureText(box.label).width + 10, 20)
        ctx.fillStyle = "white"
        ctx.font = "13px sans-serif"
        ctx.fillText(box.label, box.x + 5, box.y - 5)
      })
      // Draw current box being drawn
      if (currentBox && currentBox.w > 0) {
        ctx.strokeStyle = "#f59e0b"
        ctx.lineWidth = 2
        ctx.setLineDash([6, 3])
        ctx.strokeRect(currentBox.x, currentBox.y, currentBox.w, currentBox.h)
        ctx.setLineDash([])
        ctx.fillStyle = "#f59e0b20"
        ctx.fillRect(currentBox.x, currentBox.y, currentBox.w, currentBox.h)
      }
    }
    img.src = currentImage
  }, [currentImage, currentBox, annotations, currentIndex])

  const saveAnnotations = async () => {
    setSaving(true)
    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/image-labelling/save/${selectedDataset.dataset_id}`,
        { annotations }
      )
      setSaved(true)
      alert(`Saved! ${res.data.total_images} images, ${res.data.total_boxes} boxes total.`)
    } catch (err) {
      alert("Save failed")
    }
    setSaving(false)
  }

  const exportYOLO = async () => {
    setExporting(true)
    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/image-labelling/export-yolo/${selectedDataset.dataset_id}`,
        { annotations, classes }
      )
      alert(`YOLO export done! ${res.data.total_files} label files created with classes: ${res.data.classes.join(", ")}`)
    } catch (err) {
      alert("Export failed")
    }
    setExporting(false)
  }

  const runAutoLabel = async () => {
  if (!selectedModel) {
    alert("Select a YOLO model first!")
    return
  }
  setAutoLabelling(true)
  try {
    const res = await axios.post(
      `http://127.0.0.1:8000/image-labelling/auto-label/${selectedDataset.dataset_id}`,
      { model_job_id: selectedModel, confidence }
    )
    // Merge auto annotations with existing ones
    setAnnotations(prev => {
      const merged = { ...prev }
      Object.entries(res.data.auto_annotations).forEach(([filename, data]) => {
        if (!merged[filename] || merged[filename].boxes.length === 0) {
          merged[filename] = data
        }
      })
      return merged
    })
    setAutoLabelDone(true)
    setSaved(false)
    alert(`Auto-labelled ${res.data.labelled_images} images with ${res.data.total_boxes} boxes! Review and correct as needed.`)
  } catch (err) {
    alert("Auto-label failed: " + err.response?.data?.detail)
  }
  setAutoLabelling(false)
}


  const labelColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"]
  const totalBoxes = Object.values(annotations).reduce((sum, v) => sum + (v.boxes?.length || 0), 0)
  const labelledImages = Object.keys(annotations).filter(k => annotations[k].boxes?.length > 0).length

  return (
    <Layout onLogout={onLogout}>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#0f172a", marginBottom: "8px" }}>
          Image Labelling
        </h1>
        <p style={{ color: "#64748b", marginBottom: "32px" }}>
          Draw bounding boxes and export in YOLO format
        </p>

        {!selectedDataset ? (
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "#0f172a" }}>
              Select a ZIP image dataset
            </h2>
            {datasets.length === 0 ? (
              <p style={{ color: "#94a3b8" }}>No ZIP datasets found. Upload one first!</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                {datasets.map(d => (
                  <button key={d.id} onClick={() => loadDataset(d)} style={{
                    padding: "12px 24px", background: "white", border: "1px solid #e2e8f0",
                    borderRadius: "8px", cursor: "pointer", fontSize: "14px",
                    color: "#6366f1", fontWeight: "500"
                  }}>
                    📁 {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "20px" }}>

            {/* Canvas Area */}
            <div>
              {/* Stats bar */}
              <div style={{ background: "white", borderRadius: "12px", padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "16px", display: "flex", gap: "24px", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  📷 Image <strong style={{ color: "#0f172a" }}>{currentIndex + 1}</strong> of <strong style={{ color: "#0f172a" }}>{images.length}</strong>
                </span>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  🏷️ <strong style={{ color: "#0f172a" }}>{labelledImages}</strong> labelled
                </span>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  📦 <strong style={{ color: "#0f172a" }}>{totalBoxes}</strong> boxes total
                </span>
                <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                  <button onClick={() => goToImage(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0} style={{
                      padding: "6px 14px", background: "#f1f5f9", border: "none",
                      borderRadius: "6px", cursor: "pointer", fontSize: "13px", color: "#0f172a"
                    }}>← Prev</button>
                  <button onClick={() => goToImage(Math.min(images.length - 1, currentIndex + 1))}
                    disabled={currentIndex === images.length - 1} style={{
                      padding: "6px 14px", background: "#f1f5f9", border: "none",
                      borderRadius: "6px", cursor: "pointer", fontSize: "13px", color: "#0f172a"
                    }}>Next →</button>
                  <button onClick={() => setSelectedDataset(null)} style={{
                    padding: "6px 14px", background: "#f1f5f9", border: "none",
                    borderRadius: "6px", cursor: "pointer", fontSize: "13px", color: "#64748b"
                  }}>Change Dataset</button>
                </div>
              </div>

              {/* Canvas */}
              <div style={{ background: "#1e293b", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                {!currentImage ? (
                  <div style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                    Loading image...
                  </div>
                ) : (
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{
                      width: "100%", height: "auto", display: "block",
                      cursor: "crosshair", borderRadius: "8px", maxHeight: "500px",
                      objectFit: "contain"
                    }}
                  />
                )}
              </div>

              {/* Hint */}
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#94a3b8", textAlign: "center" }}>
                Click and drag to draw a bounding box • Active class: <strong style={{ color: "#6366f1" }}>{activeClass}</strong>
              </div>

              {/* Boxes for current image */}
              {annotations[images[currentIndex]?.filename]?.boxes?.length > 0 && (
                <div style={{ background: "white", borderRadius: "12px", padding: "16px", marginTop: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "12px" }}>
                    Boxes on this image
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {annotations[images[currentIndex].filename].boxes.map((box, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: labelColors[classes.indexOf(box.label) % labelColors.length] }} />
                        <span style={{ fontSize: "13px", color: "#0f172a", flex: 1 }}>{box.label}</span>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                          {Math.round(box.x)},{Math.round(box.y)} → {Math.round(box.w)}×{Math.round(box.h)}
                        </span>
                        <button onClick={() => deleteBox(images[currentIndex].filename, i)} style={{
                          background: "#fef2f2", color: "#ef4444", border: "none",
                          borderRadius: "4px", padding: "2px 8px", cursor: "pointer", fontSize: "12px"
                        }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Auto-Label Panel */}
<div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
  <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "4px" }}>
    🤖 Auto-Label with AI
  </h3>
  <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
    Use a trained YOLO model to auto-draw boxes
  </p>

  {yoloModels.length === 0 ? (
    <p style={{ fontSize: "12px", color: "#94a3b8" }}>
      No detection models found. Train a YOLO model first!
    </p>
  ) : (
    <>
      <select
        value={selectedModel || ""}
        onChange={e => setSelectedModel(parseInt(e.target.value))}
        style={{
          width: "100%", padding: "8px 10px", borderRadius: "6px",
          border: "1px solid #e2e8f0", fontSize: "13px",
          marginBottom: "10px", color: "#0f172a"
        }}
      >
        {yoloModels.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <span style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>
          Confidence: {confidence}
        </span>
        <input
          type="range" min="0.1" max="0.9" step="0.05"
          value={confidence}
          onChange={e => setConfidence(parseFloat(e.target.value))}
          style={{ flex: 1 }}
        />
      </div>

      <button
        onClick={runAutoLabel}
        disabled={autoLabelling}
        style={{
          width: "100%", padding: "10px",
          background: autoLabelling ? "#94a3b8" : autoLabelDone ? "#10b981" : "#6366f1",
          color: "white", border: "none", borderRadius: "8px",
          cursor: autoLabelling ? "not-allowed" : "pointer",
          fontSize: "13px", fontWeight: "500"
        }}
      >
        {autoLabelling ? "Auto-labelling..." : autoLabelDone ? "✓ Done! Review boxes" : "⚡ Auto-Label All Images"}
      </button>
    </>
  )}
</div>

              {/* Class Selector */}
              <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "12px" }}>
                  Label Classes
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                  {classes.map((cls, i) => (
                    <button key={cls} onClick={() => setActiveClass(cls)} style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "8px 12px", borderRadius: "8px", border: "none", cursor: "pointer",
                      background: activeClass === cls ? "#6366f110" : "#f8fafc",
                      outline: activeClass === cls ? "2px solid #6366f1" : "none",
                      textAlign: "left"
                    }}>
                      <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: labelColors[i % labelColors.length], flexShrink: 0 }} />
                      <span style={{ fontSize: "13px", color: "#0f172a", flex: 1 }}>{cls}</span>
                      {activeClass === cls && <span style={{ fontSize: "11px", color: "#6366f1" }}>active</span>}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input value={newClass} onChange={e => setNewClass(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && newClass) { setClasses(p => [...p, newClass]); setActiveClass(newClass); setNewClass("") }}}
                    placeholder="Add class..." style={{
                      flex: 1, padding: "6px 10px", borderRadius: "6px",
                      border: "1px solid #e2e8f0", fontSize: "13px"
                    }} />
                  <button onClick={() => { if (newClass) { setClasses(p => [...p, newClass]); setActiveClass(newClass); setNewClass("") }}} style={{
                    padding: "6px 12px", background: "#6366f1", color: "white",
                    border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px"
                  }}>Add</button>
                </div>
              </div>

              {/* Image strip */}
              <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "12px" }}>
                  Images ({images.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "200px", overflowY: "auto" }}>
                  {images.map((img, i) => (
                    <button key={i} onClick={() => goToImage(i)} style={{
                      display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px",
                      borderRadius: "6px", border: "none", cursor: "pointer", textAlign: "left",
                      background: i === currentIndex ? "#6366f110" : "transparent",
                      outline: i === currentIndex ? "1px solid #6366f1" : "none"
                    }}>
                      <span style={{ fontSize: "11px", color: "#94a3b8", width: "20px" }}>{i + 1}</span>
                      <span style={{ fontSize: "12px", color: "#0f172a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{img.filename}</span>
                      {annotations[img.filename]?.boxes?.length > 0 && (
                        <span style={{ fontSize: "10px", background: "#10b981", color: "white", padding: "1px 6px", borderRadius: "10px" }}>
                          {annotations[img.filename].boxes.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save + Export */}
              <button onClick={saveAnnotations} disabled={saving || totalBoxes === 0} style={{
                padding: "12px", background: saved ? "#10b981" : "#6366f1",
                color: "white", border: "none", borderRadius: "8px",
                cursor: "pointer", fontSize: "14px", fontWeight: "500"
              }}>
                {saving ? "Saving..." : saved ? "✓ Saved!" : `Save Annotations (${totalBoxes} boxes)`}
              </button>

              <button onClick={exportYOLO} disabled={exporting || totalBoxes === 0} style={{
                padding: "12px", background: exporting ? "#94a3b8" : "#f59e0b",
                color: "white", border: "none", borderRadius: "8px",
                cursor: "pointer", fontSize: "14px", fontWeight: "500"
              }}>
                {exporting ? "Exporting..." : "⬇ Export YOLO Format"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ImageLabelling