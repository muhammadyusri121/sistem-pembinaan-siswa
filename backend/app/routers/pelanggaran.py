from fastapi import APIRouter, Depends, status
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
    return crud.create_pelanggaran(db=db, pelanggaran=pelanggaran_data, pelapor_id=current_user.id)

@router.get("/", response_model=List[schemas.Pelanggaran])
def get_pelanggaran(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    return crud.get_pelanggaran(db, user=current_user)