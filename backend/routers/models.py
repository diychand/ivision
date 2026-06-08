from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import TrainingJob

router = APIRouter(prefix="/models")

@router.get("/")
def get_models(db: Session = Depends(get_db)):
    return db.query(TrainingJob).filter(
        TrainingJob.status == "completed",
        TrainingJob.model_path != None
    ).all()

@router.put("/{job_id}/version")
def update_version(job_id: int, version: str, db: Session = Depends(get_db)):
    job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Model not found")
    job.version = version
    db.commit()
    return job

@router.delete("/{job_id}")
def delete_model(job_id: int, db: Session = Depends(get_db)):
    job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Model not found")
    db.delete(job)
    db.commit()
    return {"message": "Model deleted"}