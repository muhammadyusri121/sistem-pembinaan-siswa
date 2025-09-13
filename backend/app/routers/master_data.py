from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas, dependencies
from ..database import get_db

router = APIRouter(
    prefix="/master-data",
    tags=["Master Data"],
    dependencies=[Depends(dependencies.get_current_user)]
)

# --- Endpoint untuk Kelas ---
@router.get("/kelas", response_model=List[schemas.Kelas])
def get_kelas(db: Session = Depends(get_db)):
    return crud.get_all_kelas(db)

@router.post("/kelas", response_model=schemas.Kelas, status_code=status.HTTP_201_CREATED)
def create_kelas(
    kelas_data: schemas.KelasCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return crud.create_kelas(db, kelas=kelas_data)

# --- Endpoint untuk Jenis Pelanggaran ---
@router.get("/jenis-pelanggaran", response_model=List[schemas.JenisPelanggaran])
def get_jenis_pelanggaran(db: Session = Depends(get_db)):
    return crud.get_all_jenis_pelanggaran(db)

@router.post("/jenis-pelanggaran", response_model=schemas.JenisPelanggaran, status_code=status.HTTP_201_CREATED)
def create_jenis_pelanggaran(
    jenis_data: schemas.JenisPelanggaranCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return crud.create_jenis_pelanggaran(db, jenis=jenis_data)
    
# --- Endpoint untuk Tahun Ajaran ---
@router.get("/tahun-ajaran", response_model=List[schemas.TahunAjaran])
def get_tahun_ajaran(db: Session = Depends(get_db)):
    return crud.get_all_tahun_ajaran(db)

@router.post("/tahun-ajaran", response_model=schemas.TahunAjaran, status_code=status.HTTP_201_CREATED)
def create_tahun_ajaran(
    tahun_data: schemas.TahunAjaranCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return crud.create_tahun_ajaran(db, tahun=tahun_data)