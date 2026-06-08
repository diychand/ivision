from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from models import TrainingJob
import threading
from utils.ml_engine import train_classification_model

router = APIRouter(prefix="/training")

def run_real_training(job_id: int, file_path: str, epochs: int, model_type: str, engine: str = "csv"):
    db = SessionLocal()
    try:
        job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
        job.status = "training"
        db.commit()

        def progress_callback(epoch, total, accuracy, loss):
            j = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
            j.accuracy = accuracy
            j.loss = loss
            j.status = "training"
            db.commit()

        if engine == "image":
            from utils.cv_engine import train_image_model
            metrics, model_path = train_image_model(
                file_path, epochs, job_id, progress_callback
            )
        else:
            from utils.ml_engine import train_classification_model
            metrics, model_path = train_classification_model(
                file_path, epochs, job_id, progress_callback
            )

        job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
        job.status = "completed"
        job.accuracy = metrics["accuracy"]
        job.loss = metrics.get("f1", 0)
        job.model_path = model_path
        db.commit()

    except Exception as e:
        print(f"Training error: {str(e)}")
        job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
        job.status = "failed"
        db.commit()
    finally:
        db.close()
@router.post("/start")
@router.post("/start")
def start_training(
    name: str,
    dataset_id: int,
    model_type: str,
    epochs: int = 10,
    db: Session = Depends(get_db)
):
    from models import Dataset
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()

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

    # Choose engine based on file type and model type
    file_path = dataset.file_path
    is_image = file_path.endswith(".zip")

    if is_image:
        from utils.cv_engine import train_image_model
        thread = threading.Thread(
            target=run_real_training,
            args=(job.id, file_path, epochs, model_type),
            kwargs={"engine": "image"}
        )
    else:
        thread = threading.Thread(
            target=run_real_training,
            args=(job.id, file_path, epochs, model_type),
            kwargs={"engine": "csv"}
        )

    thread.start()
    return job

@router.get("/jobs")
def get_jobs(db: Session = Depends(get_db)):
    return db.query(TrainingJob).all()

@router.get("/jobs/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    return db.query(TrainingJob).filter(TrainingJob.id == job_id).first()