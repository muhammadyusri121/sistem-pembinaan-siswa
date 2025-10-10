"""Router untuk CRUD pelanggaran dan proses pembinaan siswa."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List


from .. import crud, schemas, dependencies
from ..database import get_db

router = APIRouter(
    prefix="/pelanggaran",
    tags=["Pelanggaran"],
    dependencies=[Depends(dependencies.get_current_user)]
)

@router.post("/", response_model=schemas.Pelanggaran, status_code=status.HTTP_201_CREATED)
def create_pelanggaran(
    pelanggaran_data: schemas.PelanggaranCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Mencatat pelanggaran baru atas nama siswa tertentu."""
    try:
        return crud.create_pelanggaran(
            db=db,
            pelanggaran=pelanggaran_data,
            pelapor_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

@router.get("/", response_model=List[schemas.Pelanggaran])
def get_pelanggaran(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Mengambil daftar pelanggaran sesuai cakupan akses pengguna."""
    return crud.get_pelanggaran(db, user=current_user)


@router.put("/{pelanggaran_id}/status", response_model=schemas.Pelanggaran)
def update_pelanggaran_status(
    pelanggaran_id: str,
    status_update: schemas.PelanggaranStatusUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Memperbarui status tindak lanjut pelanggaran (khusus peran pimpinan)."""
    allowed_roles = {
        schemas.UserRole.ADMIN,
        schemas.UserRole.KEPALA_SEKOLAH,
        schemas.UserRole.WAKIL_KEPALA_SEKOLAH,
    }
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tidak memiliki akses mengubah status")

    updated = crud.update_pelanggaran_status(db, pelanggaran_id, status_update.status)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelanggaran tidak ditemukan")

    return updated


@router.post("/students/{nis}/pembinaan", response_model=schemas.PembinaanResponse)
def apply_pembinaan(
    nis: str,
    payload: schemas.PembinaanRequest,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user),
):
    """Menerapkan pembinaan massal pada pelanggaran aktif milik siswa."""
    try:
        result = crud.apply_student_counseling(
            db,
            current_user,
            nis,
            payload.catatan,
            payload.status,
        )
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tidak memiliki akses melakukan pembinaan",
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if result.get("updated", 0) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tidak ada pelanggaran aktif untuk siswa ini",
        )
    return result


@router.delete("/{pelanggaran_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pelanggaran(
    pelanggaran_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Menghapus pelanggaran secara permanen (khusus admin)."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tidak memiliki akses menghapus pelanggaran")

    ok = crud.delete_pelanggaran(db, pelanggaran_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelanggaran tidak ditemukan")
    return
