"""Endpoint dashboard untuk menyediakan data ringkasan frontend."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import crud, dependencies, schemas
from ..database import get_db

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user),
):
    """Mengambil statistik utama yang akan ditampilkan pada dashboard."""
    return crud.get_dashboard_stats(db, current_user)
