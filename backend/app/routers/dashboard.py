from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import crud, schemas, dependencies
from ..database import get_db

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(dependencies.get_current_user)]
)

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """
    Mengambil statistik utama untuk dashboard.
    Hanya bisa diakses oleh Admin dan Kepala Sekolah.
    """
    allowed_roles = [schemas.UserRole.ADMIN, schemas.UserRole.KEPALA_SEKOLAH]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorized for dashboard statistics"
        )
    return crud.get_dashboard_stats(db)