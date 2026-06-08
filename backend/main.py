from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import router
from routers.auth import router as auth_router
from routers.datasets import router as datasets_router
from routers.training import router as training_router


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(router)
app.include_router(auth_router)
app.include_router(datasets_router)
app.include_router(training_router)

@app.get("/")
def home():
    return {"message": "iVision API is running!"}

@app.get("/health")
def health():
    return {"status": "ok"}