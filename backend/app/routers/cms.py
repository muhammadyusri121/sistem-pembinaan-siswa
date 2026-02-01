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

from PIL import Image
import io

# ... imports ...

def _process_image(file: UploadFile, max_size=(1280, 1280), quality=80) -> tuple[str, bytes]:
    """
    Reads an uploaded image, resizes it if larger than max_size,
    converts it to WebP format, and compresses it.
    Returns: (new_filename_with_webp, processed_image_bytes)
    """
    # Read file content
    contents = file.file.read()
    image = Image.open(io.BytesIO(contents))
    
    # Convert to RGB (in case of RGBA/P formats which might lose transparency in some cases, 
    # but WebP supports transparency. Creating RGB if we want to force simple colors, 
    # but better keep RGBA for WebP if transparent. 
    # However, if image is Palette (P), convert to RGBA first).
    if image.mode in ("P", "CMYK"):
        image = image.convert("RGB")
        
    # Resize if too large (thumbnail preserves aspect ratio)
    if image.width > max_size[0] or image.height > max_size[1]:
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        
    # Save to WebP in memory
    output_buffer = io.BytesIO()
    image.save(output_buffer, format="WEBP", quality=quality, optimize=True)
    processed_data = output_buffer.getvalue()
    
    # Generate new filename
    original_name = os.path.splitext(file.filename)[0]
    # Sanitize filename simply
    safe_name = "".join(c for c in original_name if c.isalnum() or c in ('-', '_')).strip()[:30]
    if not safe_name:
        safe_name = "image"
        
    new_filename = f"{safe_name}_{uuid.uuid4().hex[:8]}.webp"
    
    return new_filename, processed_data

# ... existing code ...

def _delete_file(url: str):
    """Helper to delete local file from a public URL."""
    if not url:
        return
    try:
        # URL format: storage/site_content/filename OR /storage/site_content/filename
        # Local dir: storage/site_content
        
        # Strip leading slash if present
        clean_url = url.lstrip('/')
        
        # Check if it looks like our local storage path
        if clean_url.startswith("storage/site_content/"):
            # Construct local fs path
            # Warning: Be careful with path traversal, but standard Path usage helps
            path_parts = clean_url.split('/')
            filename = path_parts[-1]
            
            # Use SITE_CONTENT_DIR to be safe
            file_path = SITE_CONTENT_DIR / filename
            
            if file_path.exists():
                file_path.unlink()
                print(f"Deleted file: {file_path}")
            else:
                print(f"File not found to delete: {file_path}")
    except Exception as e:
        print(f"Error deleting file {url}: {e}")

@router.post("/hero-image", status_code=status.HTTP_200_OK)
def upload_hero_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Upload dan ganti gambar background hero (Auto-compressed to WebP). Hapus yang lama."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=430, detail="Not authorized")
        
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File harus berupa gambar")
        
    SITE_CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    
    try:
        # 1. Delete Old Hero Image
        current_hero_url = _get_config(db, "hero_image_url")
        if current_hero_url:
            _delete_file(current_hero_url)

        # 2. Process New Image
        filename, image_data = _process_image(file, max_size=(1920, 1080), quality=75)
        file_path = SITE_CONTENT_DIR / filename
        
        with file_path.open("wb") as f:
            f.write(image_data)
            
        public_url = f"storage/site_content/{filename}"
        _upsert_config(db, "hero_image_url", public_url)
        
        return {"url": public_url}
        
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail="Gagal memproses gambar")

@router.post("/gallery", response_model=schemas.SiteGallery, status_code=status.HTTP_201_CREATED)
def add_gallery_item(
    title: Optional[str] = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Upload foto baru ke galeri (Auto-compressed to WebP)."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File harus berupa gambar")
        
    SITE_CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    
    try:
        # Process Image (Resize & Convert to WebP)
        # Gallery thumbnail size typically smaller, but let's keep HD for detail view
        filename, image_data = _process_image(file, max_size=(1280, 1280), quality=70)
        file_path = SITE_CONTENT_DIR / filename
        
        with file_path.open("wb") as f:
            f.write(image_data)
            
        public_url = f"storage/site_content/{filename}"
        
        new_item = models.SiteGallery(
            title=title,
            image_url=public_url
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        
        return new_item
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail="Gagal memproses gambar")

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
        
    # Delete file content
    _delete_file(item.image_url)
        
    db.delete(item)
    db.commit()
    return

@router.get("/dashboard-carousel", response_model=List[schemas.DashboardCarousel])
def get_dashboard_carousel(db: Session = Depends(get_db)):
    """Mengambil daftar foto carousel dashboard."""
    return db.query(models.DashboardCarousel).order_by(models.DashboardCarousel.created_at.desc()).all()

@router.post("/dashboard-carousel", response_model=schemas.DashboardCarousel, status_code=status.HTTP_201_CREATED)
def add_dashboard_carousel_item(
    alt_text: Optional[str] = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Upload foto baru ke carousel dashboard (Auto-compressed to WebP)."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File harus berupa gambar")
        
    SITE_CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    
    try:
        # Process Image (Resize & Convert to WebP)
        filename, image_data = _process_image(file, max_size=(1280, 720), quality=75)
        file_path = SITE_CONTENT_DIR / filename
        
        with file_path.open("wb") as f:
            f.write(image_data)
            
        public_url = f"storage/site_content/{filename}"
        
        new_item = models.DashboardCarousel(
            url=public_url,
            alt_text=alt_text
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        
        return new_item
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail="Gagal memproses gambar")

@router.delete("/dashboard-carousel/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dashboard_carousel_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Hapus item dari carousel dashboard."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    item = db.query(models.DashboardCarousel).filter(models.DashboardCarousel.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    # Delete file content
    _delete_file(item.url)
        
    db.delete(item)
    db.commit()
    return
