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
    _check_admin_role(current_user)

    if user_data.role == schemas.UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Pembuatan akun admin baru tidak diperbolehkan")

    db_user = crud.get_user_by_nip(db, nip=user_data.nip)
    if db_user:
        raise HTTPException(status_code=400, detail="NIP sudah terdaftar")
    if crud.get_user_by_email(db, user_data.email):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
        
    return crud.create_user(db=db, user=user_data)

@router.get("/", response_model=List[schemas.User])
def read_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    _check_admin_role(current_user)
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@router.get("/{user_id}", response_model=schemas.User)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    _check_admin_role(current_user)
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=schemas.User)
def update_user(
    user_id: str,
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    _check_admin_role(current_user)

    target_user = crud.get_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_update.role == schemas.UserRole.ADMIN and target_user.role != schemas.UserRole.ADMIN.value:
        raise HTTPException(status_code=400, detail="Perubahan ke role admin tidak diperbolehkan")

    if user_update.nip is not None:
        existing = crud.get_user_by_nip(db, user_update.nip)
        if existing and existing.id != user_id:
            raise HTTPException(status_code=400, detail="NIP sudah terdaftar")
    if user_update.email is not None:
        existing_email = crud.get_user_by_email(db, user_update.email)
        if existing_email and existing_email.id != user_id:
            raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    try:
        updated = crud.update_user(db, user_id, user_update)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    _check_admin_role(current_user)
    ok = crud.delete_user(db, user_id)
    if not ok:
        user = crud.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        raise HTTPException(status_code=400, detail="Tidak bisa menghapus user yang memiliki data pelanggaran")
    return
