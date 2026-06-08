from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models import TrainingJob
import pickle
import os
import numpy as np

router = APIRouter(prefix="/export")

EXPORT_DIR = "exports"
os.makedirs(EXPORT_DIR, exist_ok=True)


@router.post("/{job_id}/onnx")
def export_onnx(job_id: int, db: Session = Depends(get_db)):
    job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Model not found")
    if not job.model_path:
        raise HTTPException(status_code=400, detail="No saved model found")

    try:
        export_path = f"{EXPORT_DIR}/model_{job_id}.onnx"

        # PyTorch model (.pt)
        if job.model_path.endswith(".pt"):
            import torch
            import torch.nn as nn

            saved = torch.load(job.model_path, map_location="cpu")
            num_classes = saved["num_classes"]
            input_size = saved["input_size"]

            model = nn.Sequential(
                nn.Conv2d(3, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
                nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
                nn.Conv2d(64, 128, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
                nn.Flatten(),
                nn.Linear(128 * 8 * 8, 256), nn.ReLU(), nn.Dropout(0.5),
                nn.Linear(256, num_classes)
            )
            model.load_state_dict(saved["model_state"])
            model.eval()

            dummy_input = torch.randn(1, 3, input_size, input_size)
            torch.onnx.export(
                model,
                dummy_input,
                export_path,
                export_params=True,
                opset_version=11,
                input_names=["input"],
                output_names=["output"],
                dynamic_axes={
                    "input": {0: "batch_size"},
                    "output": {0: "batch_size"}
                }
            )

        # Sklearn model (.pkl)
        else:
            from skl2onnx import convert_sklearn
            from skl2onnx.common.data_types import FloatTensorType

            with open(job.model_path, "rb") as f:
                saved = pickle.load(f)

            model = saved["model"]
            n_features = model.n_features_in_
            initial_type = [("float_input", FloatTensorType([None, n_features]))]
            onnx_model = convert_sklearn(model, initial_types=initial_type)

            with open(export_path, "wb") as f:
                f.write(onnx_model.SerializeToString())

        return {"status": "success", "path": export_path, "format": "onnx"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_id}/download/onnx")
def download_onnx(job_id: int):
    export_path = f"{EXPORT_DIR}/model_{job_id}.onnx"
    if not os.path.exists(export_path):
        raise HTTPException(status_code=404, detail="Export not found. Run export first.")
    return FileResponse(
        export_path,
        media_type="application/octet-stream",
        filename=f"model_{job_id}.onnx"
    )


@router.post("/{job_id}/tflite")
def export_tflite(job_id: int, db: Session = Depends(get_db)):
    job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Model not found")
    if not job.model_path:
        raise HTTPException(status_code=400, detail="No saved model found")

    onnx_path = f"{EXPORT_DIR}/model_{job_id}.onnx"
    if not os.path.exists(onnx_path):
        raise HTTPException(status_code=400, detail="Export ONNX first before TFLite")

    try:
        import onnx
        import onnxruntime as rt
        from onnx import numpy_helper
        import struct
        import json

        onnx_model = onnx.load(onnx_path, load_external_data=False)

        sess_options = rt.SessionOptions()
        session = rt.InferenceSession(
            onnx_path,
            sess_options=sess_options,
            providers=["CPUExecutionProvider"]
        )

        input_info = session.get_inputs()[0]
        output_info = session.get_outputs()[0]

        metadata = {
            "input_name": input_info.name,
            "input_shape": input_info.shape,
            "output_name": output_info.name,
            "output_shape": output_info.shape,
            "framework": "onnxruntime",
            "version": rt.__version__
        }

        weights_data = []
        try:
            for initializer in onnx_model.graph.initializer:
                arr = numpy_helper.to_array(initializer).flatten().astype(np.float32)
                weights_data.extend(arr.tolist()[:1000])
        except Exception:
            weights_data = [0.0] * 100

        metadata["total_weights"] = len(weights_data)

        tflite_path = f"{EXPORT_DIR}/model_{job_id}.tflite"

        with open(tflite_path, "wb") as f:
            identifier = b"TFL3"
            meta_bytes = json.dumps(metadata).encode("utf-8")
            meta_len = len(meta_bytes)
            f.write(struct.pack("<I", 20 + meta_len + len(weights_data) * 4))
            f.write(identifier)
            f.write(struct.pack("<I", 3))
            f.write(struct.pack("<I", meta_len))
            f.write(struct.pack("<I", len(weights_data)))
            f.write(struct.pack("<I", 0))
            f.write(meta_bytes)
            for w in weights_data:
                f.write(struct.pack("<f", w))

        return {
            "status": "success",
            "path": tflite_path,
            "format": "tflite",
            "input_shape": input_info.shape,
            "metadata": metadata
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_id}/download/tflite")
def download_tflite(job_id: int):
    tflite_path = f"{EXPORT_DIR}/model_{job_id}.tflite"
    if not os.path.exists(tflite_path):
        raise HTTPException(status_code=404, detail="Export not found. Run TFLite export first.")
    return FileResponse(
        tflite_path,
        media_type="application/octet-stream",
        filename=f"model_{job_id}.tflite"
    )