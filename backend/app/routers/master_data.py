"""Router untuk pengelolaan data master (kelas, pelanggaran, tahun ajaran)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, dependencies, models
from ..database import get_db

router = APIRouter(
    prefix="/master-data",
    tags=["Master Data"],
    dependencies=[Depends(dependencies.get_current_user)]
)

@router.get("/kelas", response_model=List[schemas.Kelas])
def get_kelas(db: Session = Depends(get_db)):
    """Mengambil seluruh data kelas untuk tampilan master data."""
    return crud.get_all_kelas(db)

@router.post("/kelas", response_model=schemas.Kelas, status_code=status.HTTP_201_CREATED)
def create_kelas(
    kelas_data: schemas.KelasCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Membuat kelas baru; hanya admin yang diizinkan."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    try:
        return crud.create_kelas(db, kelas=kelas_data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/kelas/{kelas_id}", response_model=schemas.Kelas)
def update_kelas(
    kelas_id: str,
    kelas_data: schemas.KelasUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Memperbarui atribut kelas termasuk wali kelas dan tahun ajaran."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    try:
        updated = crud.update_kelas(db, kelas_id, kelas_data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not updated:
        raise HTTPException(status_code=404, detail="Kelas not found")
    return updated


@router.delete("/kelas/{kelas_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_kelas(
    kelas_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Menghapus kelas dari master data apabila tersedia."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    deleted = crud.delete_kelas(db, kelas_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Kelas not found")
    return

@router.get("/jenis-pelanggaran", response_model=List[schemas.JenisPelanggaran])
def get_jenis_pelanggaran(db: Session = Depends(get_db)):
    """Mengambil daftar jenis pelanggaran beserta metadata."""
    return crud.get_all_jenis_pelanggaran(db)

@router.post("/jenis-pelanggaran", response_model=schemas.JenisPelanggaran, status_code=status.HTTP_201_CREATED)
def create_jenis_pelanggaran(
    jenis_data: schemas.JenisPelanggaranCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
): 
    """Menambahkan jenis pelanggaran baru ke data master."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return crud.create_jenis_pelanggaran(db, jenis=jenis_data)


@router.put("/jenis-pelanggaran/{jenis_id}", response_model=schemas.JenisPelanggaran)
def update_jenis_pelanggaran(
    jenis_id: str,
    jenis_data: schemas.JenisPelanggaranUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Memperbarui jenis pelanggaran yang sudah ada."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    updated = crud.update_jenis_pelanggaran(db, jenis_id, jenis_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Jenis pelanggaran not found")
    return updated


@router.delete("/jenis-pelanggaran/{jenis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_jenis_pelanggaran(
    jenis_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Menghapus jenis pelanggaran tertentu dari master data."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    deleted = crud.delete_jenis_pelanggaran(db, jenis_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Jenis pelanggaran not found")
    return
    
@router.get("/tahun-ajaran", response_model=List[schemas.TahunAjaran])
def get_tahun_ajaran(db: Session = Depends(get_db)):
    """Mengambil daftar tahun ajaran yang tersedia."""
    return crud.get_all_tahun_ajaran(db)

@router.post("/tahun-ajaran", response_model=schemas.TahunAjaran, status_code=status.HTTP_201_CREATED)
def create_tahun_ajaran(
    tahun_data: schemas.TahunAjaranCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Menambahkan tahun ajaran baru dengan validasi duplikasi."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    try:
        return crud.create_tahun_ajaran(db, tahun=tahun_data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/tahun-ajaran/{tahun_id}", response_model=schemas.TahunAjaran)
def update_tahun_ajaran(
    tahun_id: str,
    tahun_data: schemas.TahunAjaranUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Memperbarui tahun ajaran termasuk pergantian status aktif."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    try:
        updated = crud.update_tahun_ajaran(db, tahun_id, tahun_data)
        
        # Propagate changes to all classes
        if updated:
            new_academic_string = f"{updated.tahun} - Semester {updated.semester}"
            db.query(models.Kelas).update(
                {models.Kelas.tahun_ajaran: new_academic_string},
                synchronize_session=False
            )
            db.commit()
            
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Tahun ajaran not found")
    return updated


@router.delete("/tahun-ajaran/{tahun_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tahun_ajaran(
    tahun_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Menghapus tahun ajaran dari master data."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    deleted = crud.delete_tahun_ajaran(db, tahun_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Tahun ajaran not found")
    return
