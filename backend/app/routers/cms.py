"""Router manajemen konten landing page (CMS)."""
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import shutil
from pathlib import Path
from datetime import datetime

from .. import crud, schemas, dependencies, models
from ..database import get_db

router = APIRouter(
    prefix="/cms",
    tags=["CMS"],
    # dependencies removed to allow public access to select endpoints
)

# Consts
SITE_CONTENT_DIR = Path("storage/site_content")

def _upsert_config(db: Session, key: str, value: str):
    conf = db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    if conf:
        conf.value = value
    else:
        conf = models.SystemConfig(key=key, value=value)
        db.add(conf)
    db.commit()

def _get_config(db: Session, key: str, default: str = "") -> str:
    conf = db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    return conf.value if conf else default

@router.get("/landing-page", response_model=schemas.LandingPageContent)
def get_landing_page_content(db: Session = Depends(get_db)):
    """Mengambil seluruh konten landing page (Hero & Gallery). 
    Bisa diakses publik sebenarnya, tapi endpoint ini ada di router CMS yang diproteksi.
    Kita harus buat endpoint publik terpisah atau allow bypass untuk GET.
    """
    # Untuk simplifikasi development CMS, kita pakai dependensi user login dulu.
    # Nanti public endpoint diakses via router publik terpisah atau logic di sini disesuaikan.
    
    hero_title = _get_config(db, "hero_title", "Selamat Datang di Sistem Pembinaan Siswa")
    hero_subtitle = _get_config(db, "hero_subtitle", "Membangun Generasi Berkarakter dan Berprestasi")
    hero_image = _get_config(db, "hero_image_url", "/images/hero-default.jpg") # Fallback to default asset if needed
    
    gallery_items = db.query(models.SiteGallery).order_by(models.SiteGallery.created_at.desc()).all()
    
    return schemas.LandingPageContent(
        hero_title=hero_title,
        hero_subtitle=hero_subtitle,
        hero_image_url=hero_image,
        gallery=gallery_items
    )

@router.put("/hero-text", status_code=status.HTTP_200_OK)
def update_hero_text(
    payload: schemas.HeroSectionUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Update teks judul dan subjudul hero."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if payload.hero_title is not None:
        _upsert_config(db, "hero_title", payload.hero_title)
    if payload.hero_subtitle is not None:
        _upsert_config(db, "hero_subtitle", payload.hero_subtitle)
        
    return {"message": "Teks hero berhasil diperbarui"}

@router.post("/hero-image", status_code=status.HTTP_200_OK)
def upload_hero_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Upload dan ganti gambar background hero."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=430, detail="Not authorized")
        
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File harus berupa gambar")
        
    SITE_CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"hero_bg_{uuid.uuid4()}{file_ext}"
    file_path = SITE_CONTENT_DIR / filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Construct Public URL
    # Assuming backend mounted /storage at root or we use relative path
    # If app.mount("/storage", ..., name="storage") -> URL is /storage/site_content/filename
    public_url = f"storage/site_content/{filename}"
    
    _upsert_config(db, "hero_image_url", public_url)
    
    return {"url": public_url}

@router.post("/gallery", response_model=schemas.SiteGallery, status_code=status.HTTP_201_CREATED)
def add_gallery_item(
    title: Optional[str] = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Upload foto baru ke galeri."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File harus berupa gambar")
        
    SITE_CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"gallery_{uuid.uuid4()}{file_ext}"
    file_path = SITE_CONTENT_DIR / filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    public_url = f"storage/site_content/{filename}"
    
    new_item = models.SiteGallery(
        title=title,
        image_url=public_url
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return new_item

@router.delete("/gallery/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gallery_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Hapus item dari galeri (database dan file fisik)."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    item = db.query(models.SiteGallery).filter(models.SiteGallery.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    # Hapus file fisik
    # URL: storage/site_content/filename -> Path: storage/site_content/filename
    # Hati-hati path traversal, tapi ini dari database kita sendiri.
    
    # Extract filename from URL basic logic
    # Assume url is "storage/site_content/xyz.jpg"
    
    try:
        if item.image_url.startswith("storage/"):
            # Local path
            fs_path = Path(item.image_url)
            if fs_path.exists():
                fs_path.unlink()
    except Exception:
        pass # Ignore delete error, just generic cleanup
        
    db.delete(item)
    db.commit()
    return
