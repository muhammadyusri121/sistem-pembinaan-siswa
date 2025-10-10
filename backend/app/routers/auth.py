"""Endpoint autentikasi untuk login dan manajemen profil pengguna."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from .. import crud, schemas, auth_utils, dependencies
from ..database import get_db
from ..hashing import Hasher

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Mengautentikasi pengguna berdasarkan NIP atau email lalu mengembalikan token."""
    # OAuth2PasswordRequestForm uses the field name "username"; support login by NIP or email
    identifier = form_data.username.strip()
    user = None

    if identifier.isdigit():
        user = crud.get_user_by_nip(db, nip=identifier)

    if user is None:
        user = crud.get_user_by_email(db, email=identifier)

    if not user or not Hasher.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth_utils.create_access_token(data={"sub": user.nip})
    user_pydantic = schemas.User.from_orm(user)
    return {"access_token": access_token, "token_type": "bearer", "user": user_pydantic}

@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: schemas.User = Depends(dependencies.get_current_user)):
    """Mengembalikan profil pengguna yang sedang login."""
    return current_user


@router.put("/me/profile", response_model=schemas.User)
def update_profile(
    profile_update: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(dependencies.get_current_user)
):
    """Memperbarui nama atau email pengguna aktif dengan validasi unik."""
    update_data = {}
    if profile_update.email is not None:
        if profile_update.email != current_user.email:
            existing = crud.get_user_by_email(db, profile_update.email)
            if existing and existing.id != current_user.id:
                raise HTTPException(status_code=400, detail="Email sudah digunakan")
        update_data["email"] = profile_update.email
    if profile_update.full_name is not None:
        update_data["full_name"] = profile_update.full_name

    if not update_data:
        return current_user

    updated = crud.update_user(db, current_user.id, schemas.UserUpdate(**update_data))
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def update_password(
    password_update: schemas.UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(dependencies.get_current_user)
):
    """Mengubah password pengguna setelah verifikasi password lama."""
    if not Hasher.verify_password(password_update.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Password saat ini tidak sesuai")

    crud.update_user(db, current_user.id, schemas.UserUpdate(password=password_update.new_password))
    return
