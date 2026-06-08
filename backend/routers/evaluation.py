from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import TrainingJob
import pickle
import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.preprocessing import LabelEncoder

router = APIRouter(prefix="/evaluation")

@router.get("/job/{job_id}")
def evaluate_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Job not completed yet")
    
    if not job.model_path:
        raise HTTPException(status_code=400, detail="No model found for this job")
    
    try:
        with open(job.model_path, "rb") as f:
            saved = pickle.load(f)
        
        model = saved["model"]
        le = saved["label_encoder"]
        
        from models import Dataset
        dataset = db.query(Dataset).filter(Dataset.id == job.dataset_id).first()
        df = pd.read_csv(dataset.file_path)
        
        X = df.iloc[:, :-1].copy()
        y = df.iloc[:, -1].copy()
        y = le.transform(y.astype(str))
        
        for col in X.columns:
            try:
                X[col] = pd.to_numeric(X[col])
            except Exception:
                X[col] = LabelEncoder().fit_transform(X[col].astype(str))
        
        X = X.fillna(0).values.astype(float)
        y_pred = model.predict(X)
        
        cm = confusion_matrix(y, y_pred).tolist()
        
        return {
            "job_id": job_id,
            "job_name": job.name,
            "accuracy": float(accuracy_score(y, y_pred)),
            "precision": float(precision_score(y, y_pred, average="weighted", zero_division=0)),
            "recall": float(recall_score(y, y_pred, average="weighted", zero_division=0)),
            "f1": float(f1_score(y, y_pred, average="weighted", zero_division=0)),
            "confusion_matrix": cm,
            "classes": le.classes_.tolist()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))