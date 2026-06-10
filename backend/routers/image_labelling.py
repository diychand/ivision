from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Dataset
from models import TrainingJob
import zipfile
import os
import json
import base64


router = APIRouter(prefix="/image-labelling")

ANNOTATIONS_DIR = "annotations"
TEMP_DIR = "temp_images"
os.makedirs(ANNOTATIONS_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)


@router.get("/dataset/{dataset_id}")
def get_image_list(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if not dataset.file_path.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only ZIP datasets supported")

    extract_path = f"{TEMP_DIR}/label_{dataset_id}"
    if not os.path.exists(extract_path):
        os.makedirs(extract_path)
        with zipfile.ZipFile(dataset.file_path, "r") as z:
            z.extractall(extract_path)

    images = []
    for root, dirs, files in os.walk(extract_path):
        for file in files:
            if file.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, extract_path)
                folder = os.path.basename(os.path.dirname(full_path))
                images.append({
                    "filename": file,
                    "rel_path": rel_path.replace("\\", "/"),
                    "class_hint": folder if folder != f"label_{dataset_id}" else ""
                })

    return {
        "dataset_id": dataset_id,
        "dataset_name": dataset.name,
        "images": images,
        "total": len(images)
    }


@router.get("/image/{dataset_id}")
def get_image(dataset_id: int, path: str):
    extract_path = f"{TEMP_DIR}/label_{dataset_id}"
    full_path = os.path.join(extract_path, path)

    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Image not found")

    with open(full_path, "rb") as f:
        data = base64.b64encode(f.read()).decode("utf-8")

    ext = full_path.split(".")[-1].lower()
    mime = "image/jpeg" if ext in ["jpg", "jpeg"] else f"image/{ext}"
    return {"image_data": f"data:{mime};base64,{data}"}


@router.post("/save/{dataset_id}")
def save_annotations(dataset_id: int, payload: dict, db: Session = Depends(get_db)):
    annotations = payload.get("annotations", {})
    output_path = f"{ANNOTATIONS_DIR}/dataset_{dataset_id}_annotations.json"
    with open(output_path, "w") as f:
        json.dump(annotations, f, indent=2)
    return {
        "message": "Annotations saved",
        "path": output_path,
        "total_images": len(annotations),
        "total_boxes": sum(len(v.get("boxes", [])) for v in annotations.values())
    }


@router.post("/export-yolo/{dataset_id}")
def export_yolo(dataset_id: int, payload: dict):
    annotations = payload.get("annotations", {})
    classes = payload.get("classes", [])

    yolo_dir = f"{ANNOTATIONS_DIR}/yolo_{dataset_id}"
    os.makedirs(yolo_dir, exist_ok=True)

    # Write classes.txt
    with open(f"{yolo_dir}/classes.txt", "w") as f:
        f.write("\n".join(classes))

    # Write one .txt per image
    for filename, data in annotations.items():
        boxes = data.get("boxes", [])
        img_w = data.get("width", 640)
        img_h = data.get("height", 640)
        lines = []
        for box in boxes:
            label = box.get("label", "")
            if label not in classes:
                classes.append(label)
            class_id = classes.index(label)
            # Convert to YOLO format (normalized center x, y, w, h)
            cx = (box["x"] + box["w"] / 2) / img_w
            cy = (box["y"] + box["h"] / 2) / img_h
            nw = box["w"] / img_w
            nh = box["h"] / img_h
            lines.append(f"{class_id} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")
        txt_name = filename.rsplit(".", 1)[0] + ".txt"
        with open(f"{yolo_dir}/{txt_name}", "w") as f:
            f.write("\n".join(lines))

    # Update classes.txt with any new ones
    with open(f"{yolo_dir}/classes.txt", "w") as f:
        f.write("\n".join(classes))

    return {
        "message": "YOLO export complete",
        "path": yolo_dir,
        "classes": classes,
        "total_files": len(annotations)
    }


@router.get("/download/{dataset_id}")
def download_annotations(dataset_id: int):
    output_path = f"{ANNOTATIONS_DIR}/dataset_{dataset_id}_annotations.json"
    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="No annotations saved yet")
    return FileResponse(
        output_path,
        media_type="application/json",
        filename=f"annotations_dataset_{dataset_id}.json"
    )
@router.post("/auto-label/{dataset_id}")
def auto_label_images(dataset_id: int, payload: dict, db: Session = Depends(get_db)):
    model_job_id = payload.get("model_job_id")
    confidence = payload.get("confidence", 0.25)

    if not model_job_id:
        raise HTTPException(status_code=400, detail="No model selected")

    # Find the YOLO model
    job = db.query(TrainingJob).filter(TrainingJob.id == model_job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Model not found")
    if not job.model_path or not os.path.exists(job.model_path):
        raise HTTPException(status_code=400, detail="Model file not found")

    extract_path = f"{TEMP_DIR}/label_{dataset_id}"
    if not os.path.exists(extract_path):
        raise HTTPException(status_code=400, detail="Images not found. Open Image Labelling page first.")

    try:
        from ultralytics import YOLO
        import torch

        # Try loading as YOLO model first
        try:
            model = YOLO(job.model_path)
            # Test it's actually a YOLO model
            _ = model.names
            is_yolo = True
        except Exception:
            is_yolo = False

        if not is_yolo:
            raise HTTPException(
                status_code=400,
                detail="This model is not a YOLO detection model. Train a YOLO model first using Object Detection on a labelled ZIP dataset."
            )

        extract_path = f"{TEMP_DIR}/label_{dataset_id}"
        if not os.path.exists(extract_path):
            raise HTTPException(status_code=400, detail="Images not found. Open Image Labelling page first.")

        auto_annotations = {}
        image_files = []
        for root, dirs, files in os.walk(extract_path):
            for file in files:
                if file.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
                    image_files.append((file, os.path.join(root, file)))

        for filename, full_path in image_files:
            results = model.predict(full_path, conf=confidence, verbose=False)
            boxes = []
            for result in results:
                img_h, img_w = result.orig_shape
                for box in result.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    cls_id = int(box.cls[0])
                    conf_score = float(box.conf[0])
                    label = model.names[cls_id]
                    boxes.append({
                        "x": x1, "y": y1,
                        "w": x2 - x1, "h": y2 - y1,
                        "label": label,
                        "confidence": round(conf_score, 3),
                        "width": img_w,
                        "height": img_h
                    })
            if boxes:
                auto_annotations[filename] = {
                    "boxes": boxes,
                    "width": img_w,
                    "height": img_h,
                    "auto_labelled": True
                }

        return {
            "status": "success",
            "auto_annotations": auto_annotations,
            "total_images": len(image_files),
            "labelled_images": len(auto_annotations),
            "total_boxes": sum(len(v["boxes"]) for v in auto_annotations.values())
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))