"""Router untuk CRUD pelanggaran dan proses pembinaan siswa."""

from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
from pathlib import Path
import uuid
from datetime import datetime

from .. import crud, schemas, dependencies, models, email_service
from ..database import get_db

router = APIRouter(
    prefix="/pelanggaran",
    tags=["Pelanggaran"],
    dependencies=[Depends(dependencies.get_current_user)]
)

@router.post("/", response_model=schemas.Pelanggaran, status_code=status.HTTP_201_CREATED)
def create_pelanggaran(
    background_tasks: BackgroundTasks,
    nis_siswa: str = Form(...),
    jenis_pelanggaran_id: str = Form(...),
    waktu_kejadian: str = Form(...),
    tempat: str = Form(...),
    detail_kejadian: str = Form(...),
    bukti_foto: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Mencatat pelanggaran baru atas nama siswa tertentu dengan dukungan upload foto."""
    
    # Process file upload if exists
    bukti_foto_path = None
    if bukti_foto:
        if not bukti_foto.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File harus berupa gambar")
            
        upload_dir = Path("storage/uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename to prevent replacement
        file_ext = Path(bukti_foto.filename).suffix
        filename = f"{uuid.uuid4()}{file_ext}"
        file_path = upload_dir / filename
        
        try:
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(bukti_foto.file, buffer)
            bukti_foto_path = filename
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gagal menyimpan file: {str(e)}")

    try:
        # Construct schema object manually from Form data
        pelanggaran_data = schemas.PelanggaranCreate(
            nis_siswa=nis_siswa,
            jenis_pelanggaran_id=jenis_pelanggaran_id,
            waktu_kejadian=datetime.fromisoformat(waktu_kejadian.replace('Z', '+00:00')),
            tempat=tempat,
            detail_kejadian=detail_kejadian,
            bukti_foto=bukti_foto_path
        )
        
        new_pelanggaran = crud.create_pelanggaran(
            db=db,
            pelanggaran=pelanggaran_data,
            pelapor_id=current_user.id,
        )

        # --------- LOGIC NOTIFIKASI EMAIL KE WALI KELAS ---------
        # 1. Ambil data Siswa, Kelas, dan Jenis Pelanggaran
        siswa = db.query(models.Siswa).filter(models.Siswa.nis == nis_siswa).first()
        jenis_plg = db.query(models.JenisPelanggaran).filter(models.JenisPelanggaran.id == jenis_pelanggaran_id).first()
        
        if siswa and siswa.id_kelas:
            kelas = db.query(models.Kelas).filter(models.Kelas.nama_kelas == siswa.id_kelas).first()
            
            # 2. Cek apakah Kelas punya Wali Kelas
            if kelas and kelas.wali_kelas_nip:
                wali_kelas = db.query(models.User).filter(models.User.nip == kelas.wali_kelas_nip).first()
                
                # 3. Kirim Email jika data lengkap
                if wali_kelas and wali_kelas.email:
                    background_tasks.add_task(
                        email_service.send_violation_notification,
                        recipient_email=wali_kelas.email,
                        student_name=siswa.nama,
                        student_class=siswa.id_kelas,
                        violation_name=jenis_plg.nama_pelanggaran if jenis_plg else "Pelanggaran",
                        incident_date=pelanggaran_data.waktu_kejadian.strftime("%d %B %Y, %H:%M"),
                        reporter_name=current_user.full_name,
                        detail=detail_kejadian
                    )
        # ---------------------------------------------------------
        
        return new_pelanggaran

    except ValueError as exc:
        # Cleanup uploaded file if data creation fails
        if bukti_foto_path:
             (upload_dir / bukti_foto_path).unlink(missing_ok=True)
             
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/", response_model=List[schemas.Pelanggaran])
def get_pelanggaran(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Mengambil daftar pelanggaran sesuai cakupan akses pengguna."""
    return crud.get_pelanggaran(db, user=current_user)


@router.put("/{pelanggaran_id}/status", response_model=schemas.Pelanggaran)
def update_pelanggaran_status(
    pelanggaran_id: str,
    status_update: schemas.PelanggaranStatusUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Memperbarui status tindak lanjut pelanggaran (khusus peran pimpinan)."""
    allowed_roles = {
        schemas.UserRole.ADMIN,
        schemas.UserRole.KEPALA_SEKOLAH,
    }
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tidak memiliki akses mengubah status")

    updated = crud.update_pelanggaran_status(db, pelanggaran_id, status_update.status)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelanggaran tidak ditemukan")

    return updated


@router.post("/students/{nis}/pembinaan", response_model=schemas.PembinaanResponse)
def apply_pembinaan(
    nis: str,
    payload: schemas.PembinaanRequest,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user),
):
    """Menerapkan pembinaan massal pada pelanggaran aktif milik siswa."""
    try:
        result = crud.apply_student_counseling(
            db,
            current_user,
            nis,
            payload.catatan,
            payload.status,
        )
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tidak memiliki akses melakukan pembinaan",
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if result.get("updated", 0) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tidak ada pelanggaran aktif untuk siswa ini",
        )
    return result


@router.delete("/{pelanggaran_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pelanggaran(
    pelanggaran_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Menghapus pelanggaran secara permanen (khusus admin)."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tidak memiliki akses menghapus pelanggaran")

    ok = crud.delete_pelanggaran(db, pelanggaran_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelanggaran tidak ditemukan")
    return
