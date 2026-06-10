from dotenv import load_dotenv
import os
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import router
from routers.auth import router as auth_router
from routers.datasets import router as datasets_router
from routers.training import router as training_router
from routers.evaluation import router as evaluation_router
from routers.models import router as models_router
from routers.export import router as export_router
from routers.labelling import router as labelling_router
from routers.image_labelling import router as image_labelling_router

app = FastAPI(title="iVision API", version="1.0.0")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(router)
app.include_router(auth_router)
app.include_router(datasets_router)
app.include_router(training_router)
app.include_router(evaluation_router)
app.include_router(models_router)
app.include_router(export_router)
app.include_router(labelling_router)
app.include_router(image_labelling_router)

@app.get("/")
def home():
    return {"message": "iVision API is running!", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}