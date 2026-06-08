import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import pickle
import os

MODELS_DIR = "saved_models"
os.makedirs(MODELS_DIR, exist_ok=True)

def train_classification_model(file_path: str, epochs: int, job_id: int, progress_callback):
    try:
        df = pd.read_csv(file_path)
        
        X = df.iloc[:, :-1].copy()
        y = df.iloc[:, -1].copy()
        
        le = LabelEncoder()
        y = le.fit_transform(y.astype(str))
        
        for col in X.columns:
            try:
                X[col] = pd.to_numeric(X[col])
            except Exception:
                X[col] = LabelEncoder().fit_transform(X[col].astype(str))
        
        X = X.fillna(0).values.astype(float)
        
        if len(X) < 10:
            X_train, X_test, y_train, y_test = X, X, y, y
        else:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
        
        model = None
        for epoch in range(epochs):
            n_estimators = 10 * (epoch + 1)
            model = RandomForestClassifier(
                n_estimators=n_estimators,
                random_state=42
            )
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            accuracy = float(accuracy_score(y_test, y_pred))
            loss = float(1 - accuracy)
            progress_callback(epoch + 1, epochs, accuracy, loss)
        
        y_pred_final = model.predict(X_test)
        
        metrics = {
            "accuracy": float(accuracy_score(y_test, y_pred_final)),
            "precision": float(precision_score(y_test, y_pred_final, average="weighted", zero_division=0)),
            "recall": float(recall_score(y_test, y_pred_final, average="weighted", zero_division=0)),
            "f1": float(f1_score(y_test, y_pred_final, average="weighted", zero_division=0)),
            "confusion_matrix": confusion_matrix(y_test, y_pred_final).tolist()
        }
        
        model_path = f"{MODELS_DIR}/job_{job_id}.pkl"
        with open(model_path, "wb") as f:
            pickle.dump({"model": model, "label_encoder": le}, f)
        
        return metrics, model_path
        
    except Exception as e:
        raise Exception(f"Training failed: {str(e)}")