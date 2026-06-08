from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import TrainingJob, Dataset
import threading
import time
import random

router = APIRouter(prefix="/training")

def run_training(job_id: int, epochs: int, db: Session):
    for epoch in range(epochs):
        time.sleep(1)
        accuracy = round(random.uniform(0.6, 0.99), 4)
        loss = round(random.uniform(0.01, 0.4), 4)
        job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
        job.accuracy = accuracy
        job.loss = loss
        job.status = "training"
        db.commit()
    
    job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
    job.status = "completed"
    db.commit()
    db.close()

@router.post("/start")
def start_training(
    name: str,
    dataset_id: int,
    model_type: str,
    epochs: int = 10,
    db: Session = Depends(get_db)
):
    job = TrainingJob(
        name=name,
        dataset_id=dataset_id,
        model_type=model_type,
        epochs=epochs,
        status="pending"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    thread = threading.Thread(
        target=run_training,
        args=(job.id, epochs, db)
    )
    thread.start()

    return job

@router.get("/jobs")
def get_jobs(db: Session = Depends(get_db)):
    return db.query(TrainingJob).all()

@router.get("/jobs/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    return db.query(TrainingJob).filter(TrainingJob.id == job_id).first()