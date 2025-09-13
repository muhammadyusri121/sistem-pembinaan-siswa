from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from . import models
from .database import engine
from .routers import auth, users, siswa, master_data, pelanggaran, dashboard

# Membuat semua tabel di database (jika belum ada)
# Hati-hati: ini tidak akan menangani migrasi jika Anda mengubah model.
# Untuk produksi, gunakan alat migrasi seperti Alembic.
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sistem Pembinaan Siswa", version="1.0.0")

# Setup CORS
origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prefix utama untuk semua rute
api_router = FastAPI()

# Menyertakan semua router
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(siswa.router)
api_router.include_router(master_data.router)
api_router.include_router(pelanggaran.router)
api_router.include_router(dashboard.router)

app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Selamat datang di API Sistem Pembinaan Siswa"}