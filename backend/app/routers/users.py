from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas, dependencies
from ..database import get_db

router = APIRouter(
    prefix="/users",
    tags=["Users"],
    dependencies=[Depends(dependencies.get_current_user)]
)

def _check_admin_role(user: schemas.User):
    """Pemeriksaan otorisasi untuk memastikan hanya admin yang bisa mengakses."""
    if user.role != schemas.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform this action"
        )

@router.post("/", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: schemas.UserCreate, 
    db: Session = Depends(get_db), 
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """
    Membuat pengguna baru. Hanya bisa diakses oleh Admin.
    """
    _check_admin_role(current_user)
    
    db_user = crud.get_user_by_username(db, username=user_data.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    return crud.create_user(db=db, user=user_data)


@router.get("/", response_model=List[schemas.User])
def read_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """
    Mengambil daftar semua pengguna. Hanya bisa diakses oleh Admin.
    """
    _check_admin_role(current_user)
    users = crud.get_users(db, skip=skip, limit=limit)
    return users