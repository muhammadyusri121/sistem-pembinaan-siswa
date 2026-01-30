"""Entry point FastAPI yang menggabungkan seluruh router aplikasi."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import asyncio
from . import crud
from .database import Base, engine, SessionLocal
from .routers import auth, users, siswa, master_data, pelanggaran, dashboard, prestasi, perwalian, cms

# Membuat semua tabel di database
Base.metadata.create_all(bind=engine)

# Ubah baris ini
app = FastAPI(
    title="Sistem Pembinaan Siswa",
    version="1.0.0",
    docs_url=None,    # MATIKAN
    redoc_url=None,   # MATIKAN
    openapi_url=None  # MATIKAN
)

@app.on_event("startup")
async def startup_event():
    async def run_cleanup_task():
        while True:
            try:
                db = SessionLocal()
                count = crud.delete_expired_students(db)
                if count > 0:
                    print(f"Cleanup: Deleted {count} expired student records.")
                db.close()
            except Exception as e:
                print(f"Cleanup error: {e}")
            # Check every hour
            await asyncio.sleep(3600)

    asyncio.create_task(run_cleanup_task())

# Setup CORS
raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
if not origins: # arti jika tidak ada origins yang diberikan, gunakan default
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
app.include_router(cms.router, prefix=api_prefix)
app.include_router(perwalian.router, prefix=api_prefix)

@app.get("/")
def read_root():
    """Endpoint kesehatan sederhana untuk memastikan API hidup."""
    return {"message": "Selamat datang di API Sistem Pembinaan Siswa"}

from fastapi.staticfiles import StaticFiles

# Memastikan folder storage ada beserta subfoldernya
for path in ["storage", "storage/uploads", "storage/templates", "storage/site_content"]:
    if not os.path.exists(path):
        os.makedirs(path)

# Mount satu endpoint /storage untuk akses ke semua file statis
app.mount("/storage", StaticFiles(directory="storage"), name="storage")
