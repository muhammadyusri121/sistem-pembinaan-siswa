"""Utilitas JWT untuk autentikasi dan otorisasi aplikasi."""

import os
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from . import schemas

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

def create_access_token(data: dict):
    """Menyusun token akses JWT dengan masa berlaku default 24 jam."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> schemas.TokenData | None:
    """Mendekode token JWT dan mengembalikan payload jika valid."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        nip: str = payload.get("sub")
        if nip is None:
            return None
        return schemas.TokenData(nip=nip)
    except JWTError:
        return None
