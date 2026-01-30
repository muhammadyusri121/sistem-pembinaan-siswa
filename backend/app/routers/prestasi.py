"""Router untuk pencatatan dan verifikasi prestasi siswa."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, Form, File, UploadFile
from sqlalchemy.orm import Session
import shutil
from pathlib import Path
import uuid
from datetime import datetime

from .. import crud, dependencies, schemas
from ..database import get_db

router = APIRouter(
    prefix="/prestasi",
    tags=["Prestasi"],
    dependencies=[Depends(dependencies.get_current_user)],
)


def _ensure_siswa_exists(db: Session, nis: str):
    """Validasi bahwa siswa dengan NIS tertentu tersedia di database."""
    siswa = crud.get_siswa_by_nis(db, nis)
    if not siswa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Siswa dengan NIS tersebut tidak ditemukan",
        )


@router.post("/", response_model=schemas.Prestasi, status_code=status.HTTP_201_CREATED)
def create_prestasi(
    nis_siswa: str = Form(...),
    judul: str = Form(...),
    kategori: str = Form(...),
    tingkat: Optional[str] = Form(None),
    poin: int = Form(0),
    tanggal_prestasi: str = Form(...),
    pemberi_penghargaan: Optional[str] = Form(None),
    bukti: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user),
):
    """Mencatat prestasi baru dengan dukungan upload bukti foto/dokumen."""
    allowed_roles = {
        schemas.UserRole.ADMIN,
        schemas.UserRole.KEPALA_SEKOLAH,
        schemas.UserRole.WALI_KELAS,
        schemas.UserRole.GURU_BK,
        schemas.UserRole.GURU_UMUM,
    }
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tidak memiliki akses menambahkan prestasi",
        )

    # Process file upload
    # Process file upload
    bukti_path = None
    if bukti:
        upload_dir = Path("storage/uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        file_extension = os.path.splitext(bukti.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = upload_dir / unique_filename
        
        try:
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(bukti.file, buffer)
            bukti_path = unique_filename
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gagal menyimpan file: {str(e)}")

    _ensure_siswa_exists(db, nis_siswa)
    
    try:
        # Parse date string to python date object
        # Expecting YYYY-MM-DD from frontend
        try:
            parsed_date = datetime.strptime(tanggal_prestasi, "%Y-%m-%d").date()
        except ValueError:
             # Fallback if isoformat with time is sent
             parsed_date = datetime.fromisoformat(tanggal_prestasi.replace('Z', '+00:00')).date()

        prestasi_data = schemas.PrestasiCreate(
            nis_siswa=nis_siswa,
            judul=judul,
            kategori=kategori,
            tingkat=tingkat,
            poin=poin,
            tanggal_prestasi=parsed_date,
            pemberi_penghargaan=pemberi_penghargaan,
            bukti=bukti_path
        )
        return crud.create_prestasi(db, prestasi_data, pencatat_id=current_user.id)
    except ValueError as exc:
         # Cleanup uploaded file if data creation fails
        if bukti_path:
             (upload_dir / bukti_path).unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/", response_model=List[schemas.Prestasi])
def list_prestasi(
    status: Optional[schemas.PrestasiStatus] = Query(None),
    kategori: Optional[str] = Query(None),
    tingkat: Optional[str] = Query(None),
    nis: Optional[str] = Query(None),
    kelas: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: Optional[int] = Query(None, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user),
):
    """Mengambil daftar prestasi dengan berbagai opsi filter."""
    return crud.get_prestasi(
        db,
        current_user,
        status=status,
        kategori=kategori,
        tingkat=tingkat,
        nis=nis,
        kelas=kelas,
        search=search,
        limit=limit,
    )


@router.get("/summary")
def prestasi_summary(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user),
):
    """Mengembalikan ringkasan statistik prestasi sesuai cakupan akses."""
    return crud.get_prestasi_summary(db, current_user)


@router.put("/{prestasi_id}", response_model=schemas.Prestasi)
def update_prestasi(
    prestasi_id: str,
    prestasi_update: schemas.PrestasiUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user),
):
    """Memperbarui data prestasi dengan otorisasi pencatat atau pimpinan."""
    existing = crud.get_prestasi_by_id(db, prestasi_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prestasi tidak ditemukan")

    privileged_roles = {
        schemas.UserRole.ADMIN,
        schemas.UserRole.KEPALA_SEKOLAH,
        schemas.UserRole.WALI_KELAS,
        schemas.UserRole.GURU_BK,
    }
    if current_user.role not in privileged_roles and current_user.id != existing.pencatat_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tidak memiliki akses mengubah prestasi ini",
        )

    if prestasi_update.nis_siswa:
        _ensure_siswa_exists(db, prestasi_update.nis_siswa)

    updated = crud.update_prestasi(db, prestasi_id, prestasi_update)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prestasi tidak ditemukan")
    return updated


@router.put("/{prestasi_id}/status", response_model=schemas.Prestasi)
def update_prestasi_status(
    prestasi_id: str,
    status_update: schemas.PrestasiStatusUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user),
):
    """Memverifikasi atau menolak prestasi sesuai kewenangan."""
    allowed_roles = {
        schemas.UserRole.ADMIN,
        schemas.UserRole.KEPALA_SEKOLAH,
        schemas.UserRole.GURU_BK,
    }
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tidak memiliki akses memverifikasi prestasi",
        )

    updated = crud.update_prestasi_status(
        db,
        prestasi_id,
        status_update.status,
        verifier_id=current_user.id,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prestasi tidak ditemukan")
    return updated


@router.delete("/{prestasi_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prestasi(
    prestasi_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user),
):
    """Menghapus prestasi apabila pencatat atau admin mengonfirmasi."""
    prestasi = crud.get_prestasi_by_id(db, prestasi_id)
    if not prestasi:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prestasi tidak ditemukan")

    if current_user.role != schemas.UserRole.ADMIN and current_user.id != prestasi.pencatat_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tidak memiliki akses menghapus prestasi ini",
        )

    crud.delete_prestasi(db, prestasi_id)
    return
