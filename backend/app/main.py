"""Entry point FastAPI yang menggabungkan seluruh router aplikasi."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from .database import Base, engine
from .routers import auth, users, siswa, master_data, pelanggaran, dashboard, prestasi

# Membuat semua tabel di database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sistem Pembinaan Siswa", version="1.0.0")

# Setup CORS
raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
if not origins:
    origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_prefix = "/api"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(siswa.router, prefix=api_prefix)
app.include_router(master_data.router, prefix=api_prefix)
app.include_router(pelanggaran.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(prestasi.router, prefix=api_prefix)

@app.get("/")
def read_root():
    """Endpoint kesehatan sederhana untuk memastikan API hidup."""
    return {"message": "Selamat datang di API Sistem Pembinaan Siswa"}
