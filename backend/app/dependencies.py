"""Dependency FastAPI untuk autentikasi dan injeksi sesi database."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from . import crud, schemas, auth_utils
from .database import get_db

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), 
    db: Session = Depends(get_db)
) -> schemas.User:
    """Memvalidasi token Bearer dan mengembalikan pengguna terautentikasi."""
    token_data = auth_utils.decode_token(credentials.credentials)
    if not token_data or not token_data.nip:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = crud.get_user_by_nip(db, nip=token_data.nip)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def get_admin_user(current_user: schemas.User = Depends(get_current_user)) -> schemas.User:
    """Memvalidasi bahwa pengguna memiliki peran admin."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user
