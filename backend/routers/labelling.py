from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Dataset
import pandas as pd
import os
import json

router = APIRouter(prefix="/labelling")

LABELS_DIR = "labels"
os.makedirs(LABELS_DIR, exist_ok=True)


@router.get("/dataset/{dataset_id}")
def get_dataset_rows(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if not dataset.file_path.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files supported for text labelling")

    df = pd.read_csv(dataset.file_path)
    rows = df.iloc[:, 0].tolist()
    return {
        "dataset_id": dataset_id,
        "dataset_name": dataset.name,
        "rows": rows,
        "total": len(rows)
    }


@router.post("/save/{dataset_id}")
def save_labels(dataset_id: int, payload: dict, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    labels = payload.get("labels", {})
    custom_labels = payload.get("custom_labels", ["positive", "negative", "neutral"])

    df = pd.read_csv(dataset.file_path)
    text_col = df.columns[0]
    texts = df[text_col].tolist()

    labelled_rows = []
    for i, text in enumerate(texts):
        label = labels.get(str(i), "unlabelled")
        labelled_rows.append({"text": text, "label": label})

    labelled_df = pd.DataFrame(labelled_rows)
    output_path = f"uploads/labelled_{dataset.name}"
    labelled_df.to_csv(output_path, index=False)

    from models import Dataset as DatasetModel
    new_dataset = DatasetModel(
        name=f"labelled_{dataset.name}",
        file_path=output_path,
        file_size=os.path.getsize(output_path)
    )
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)

    return {
        "message": "Labels saved successfully",
        "output_file": output_path,
        "dataset_id": new_dataset.id,
        "total_labelled": len([l for l in labels.values() if l != "unlabelled"])
    }


@router.post("/active-learn/{dataset_id}")
def get_uncertain_rows(dataset_id: int, payload: dict, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    current_labels = payload.get("labels", {})
    top_n = payload.get("top_n", 10)

    try:
        df = pd.read_csv(dataset.file_path)
        texts = df.iloc[:, 0].tolist()

        labelled_indices = [int(i) for i in current_labels.keys()]
        if len(labelled_indices) < 4:
            unlabelled = [i for i in range(len(texts)) if str(i) not in current_labels]
            import random
            uncertain = random.sample(unlabelled, min(top_n, len(unlabelled)))
            return {
                "uncertain_indices": uncertain,
                "method": "random",
                "message": f"Need at least 4 labels first. Showing {len(uncertain)} random rows."
            }

        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        import numpy as np

        train_texts = [texts[i] for i in labelled_indices]
        train_labels = [current_labels[str(i)] for i in labelled_indices]

        vectorizer = TfidfVectorizer(max_features=100)
        X_train = vectorizer.fit_transform(train_texts)
        clf = LogisticRegression(max_iter=1000)
        clf.fit(X_train, train_labels)

        unlabelled_indices = [i for i in range(len(texts)) if str(i) not in current_labels]
        if not unlabelled_indices:
            return {
                "uncertain_indices": [],
                "method": "active",
                "message": "All rows are labelled!"
            }

        unlabelled_texts = [texts[i] for i in unlabelled_indices]
        X_unlabelled = vectorizer.transform(unlabelled_texts)
        probs = clf.predict_proba(X_unlabelled)

        uncertainty_scores = 1 - np.max(probs, axis=1)
        top_uncertain = np.argsort(uncertainty_scores)[-top_n:][::-1]
        uncertain_indices = [unlabelled_indices[i] for i in top_uncertain]

        return {
            "uncertain_indices": uncertain_indices,
            "uncertainty_scores": [float(uncertainty_scores[i]) for i in top_uncertain],
            "method": "active",
            "message": f"Found {len(uncertain_indices)} most uncertain rows for you to label"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))