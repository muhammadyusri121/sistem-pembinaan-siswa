"""Router administrasi akun pengguna termasuk pengiriman email kredensial."""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, dependencies, email_service
from ..database import get_db
from email_validator import validate_email, EmailNotValidError

router = APIRouter(
    prefix="/users",
    tags=["Users"],
    dependencies=[Depends(dependencies.get_current_user)]
)

def _check_admin_role(user: schemas.User):
    """Memastikan hanya admin yang dapat mengakses endpoint tertentu."""
    if user.role != schemas.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform this action"
        )

@router.post("/", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: schemas.UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Mendaftarkan pengguna baru dan mengirim email kredensial."""
    _check_admin_role(current_user)

    if user_data.role == schemas.UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Pembuatan akun admin baru tidak diperbolehkan")

    db_user = crud.get_user_by_nip(db, nip=user_data.nip)
    if db_user:
        raise HTTPException(status_code=400, detail="NIP sudah terdaftar")
    if crud.get_user_by_email(db, user_data.email):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
        
    db_user = crud.create_user(db=db, user=user_data)

    background_tasks.add_task(
        email_service.send_account_email,
        recipient_email=user_data.email,
        nip=user_data.nip,
        login_email=user_data.email,
        raw_password=user_data.password,
        full_name=user_data.full_name,
    )

    return db_user

@router.get("/", response_model=List[schemas.User])
def read_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Mengambil daftar pengguna dengan pagination sederhana."""
    _check_admin_role(current_user)
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@router.get("/{user_id}", response_model=schemas.User)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Mengambil detail satu pengguna berdasarkan ID."""
    _check_admin_role(current_user)
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=schemas.User)
def update_user(
    user_id: str,
    user_update: schemas.UserUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Memperbarui atribut pengguna (peran, kontak, status)."""
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
        
        # Cek perubahan penting untuk notifikasi email
        changes_detected = []
        if user_update.email and user_update.email != target_user.email:
             # Kirim notifikasi konfirmasi ke email BARU (berisi kredensial/info login)
             background_tasks.add_task(
                 email_service.send_email_change_new_notification,
                 recipient_email=user_update.email,
                 nip=target_user.nip,
                 full_name=target_user.full_name
             )
        
        if user_update.password:
             changes_detected.append("Password akun telah direset/diubah oleh Admin")
             
        if changes_detected:
            # Jika HANYA ganti email, jangan kirim notifikasi umum lagi karena sudah dikirim di atas
            # Jika ada perubahan password juga, kirim notifikasi umum ke email BARU
            changes_only_email = len(changes_detected) == 1 and "Email diubah" not in changes_detected[0] 
            
            # Logic sederhana: jika ada password reset, kita kirim notifikasi password ke email baru
            password_changed = any("Password" in c for c in changes_detected)
            
            if password_changed:
                recipient = user_update.email if user_update.email else target_user.email
                background_tasks.add_task(
                    email_service.send_account_update_notification,
                    recipient_email=recipient,
                    full_name=target_user.full_name,
                    changes=["Password akun telah direset/diubah oleh Admin"]
                )
            
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated

@router.put("/{user_id}/email", response_model=schemas.User)
def update_user_email(
    user_id: str,
    email_update: schemas.UserEmailUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Endpoint KHUSUS untuk mengubah email pengguna oleh Admin."""
    _check_admin_role(current_user)
    
    target_user = crud.get_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    new_email = email_update.new_email
    
    # Validasi jika email sama
    if new_email == target_user.email:
        raise HTTPException(status_code=400, detail="Email baru sama dengan yang lama")
        
    # Validasi unik
    existing = crud.get_user_by_email(db, new_email)
    if existing and existing.id != target_user.id:
        raise HTTPException(status_code=400, detail="Email sudah digunakan oleh pengguna lain")
        
    # Update di DB
    update_payload = schemas.UserUpdate(email=new_email)
    updated = crud.update_user(db, user_id, update_payload)
    
    if not updated:
        raise HTTPException(status_code=500, detail="Gagal mengupdate email database")
        
    # Kirim Notifikasi ke Email BARU
    print(f"DEBUG: Admin changing email for {target_user.full_name} to {new_email}")
    background_tasks.add_task(
        email_service.send_email_change_new_notification,
        recipient_email=new_email,
        nip=target_user.nip,
        full_name=target_user.full_name
    )
    
    return updated

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Menghapus akun pengguna jika tidak memiliki dependensi kritikal."""
    _check_admin_role(current_user)
    ok = crud.delete_user(db, user_id)
    if not ok:
        user = crud.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        raise HTTPException(status_code=400, detail="Tidak bisa menghapus user yang memiliki data pelanggaran")
    return
