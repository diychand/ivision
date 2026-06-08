from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import Dataset
import shutil
import os

router = APIRouter(prefix="/datasets")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_path = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    dataset = Dataset(
        name=file.filename,
        file_path=file_path,
        file_size=os.path.getsize(file_path)
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset

@router.get("/")
def get_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).all()