from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import crud, dependencies, models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/perwalian",
    tags=["Perwalian"],
    dependencies=[Depends(dependencies.get_current_user)],
)

@router.get("/config")
def get_perwalian_config(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user),
):
    """Mendapatkan status konfigurasi periode perwalian."""
    val = crud.get_config(db, "perwalian_period_active")
    return {"active": val == "true"}

@router.post("/config")
def set_perwalian_config(
    config: schemas.SystemConfigBase,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_admin_user),
):
    """Mengatur status periode perwalian (Hanya Admin)."""
    # config.key should be "active" or "perwalian_period_active" in payload? 
    # Let's assume payload is {"key": "perwalian_period_active", "value": "true"} or simple wrapper.
    # To simplify frontend, let's just accept {"active": true}
    # But sticking to schemas, let's use SystemConfigBase.
    # Actually, custom body is easier.
    pass

@router.post("/config/toggle")
def toggle_perwalian_config(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_admin_user),
):
    active = payload.get("active")
    val = "true" if active else "false"
    crud.set_config(db, "perwalian_period_active", val)
    return {"active": active}

@router.get("/teachers")
def list_guru_wali_candidates(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_admin_user),
):
    """Mengambil daftar semua guru beserta status akses Guru Wali."""
    # Get all users with roles that can be teachers (Guru Umum, Guru BK, Wali Kelas)
    # Actually, Admin can assign anyone? Usually just teachers.
    target_roles = {
        schemas.UserRole.GURU_UMUM,
        schemas.UserRole.GURU_BK,
        schemas.UserRole.WALI_KELAS,
        schemas.UserRole.ADMIN,
        schemas.UserRole.KEPALA_SEKOLAH,
    }
    # Allow all users as requested "semua user termasuk admin bisa menjadi guru wali"
    users = db.query(models.User).filter(models.User.is_active == True).all()
    
    access_list = set(crud.get_guru_wali_access_list(db))
    
    results = []
    for u in users:
        results.append({
            "id": u.id,
            "nip": u.nip,
            "full_name": u.full_name,
            "role": u.role,
            "is_guru_wali": u.id in access_list
        })
    return results

@router.get("/admin/teachers/{teacher_id}/students")
def get_teacher_students_admin(
    teacher_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_admin_user),
):
    """Admin melihat daftar siswa binaan seorang guru wali."""
    # Verify teacher exists/is guru wali? Not strictly necessary if we trust ID, 
    # but good for safety.
    return crud.get_enriched_perwalian_students(db, teacher_id)

@router.put("/teachers")
def update_guru_wali_access(
    assignment: schemas.GuruWaliAssignment,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_admin_user),
):
    """Update daftar guru yang memiliki akses Guru Wali."""
    # assignment.user_ids is list of UUIDs
    str_ids = [str(uid) for uid in assignment.user_ids]
    crud.set_guru_wali_access_list(db, str_ids)
    return {"status": "updated", "count": len(str_ids)}

@router.get("/students/me")
def get_my_students(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user),
):
    """Mendapatkan daftar siswa perwalian untuk guru yang sedang login."""
    if not crud.is_guru_wali(db, current_user.id):
        raise HTTPException(status_code=403, detail="Anda bukan Guru Wali")
    
    return crud.get_enriched_perwalian_students(db, current_user.id)

    return crud.get_enriched_perwalian_students(db, current_user.id)

@router.get("/students/{nis}/details")
def get_student_details(
    nis: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user),
):
    """Mendapatkan detail pelanggaran siswa untuk Guru Wali."""
    # Check access: Admin or Guru Wali for this student
    # Check access: Admin, BK, Kepsek have global access
    has_access = False
    if current_user.role in [schemas.UserRole.ADMIN, schemas.UserRole.GURU_BK, schemas.UserRole.KEPALA_SEKOLAH]:
        has_access = True
    
    # Check Wali Kelas access
    if not has_access and current_user.role == schemas.UserRole.WALI_KELAS:
        student = crud.get_siswa_by_nis(db, nis)
        if student and student.id_kelas in current_user.kelas_binaan:
            has_access = True

    # Check Guru Wali access
    if not has_access and crud.is_guru_wali(db, current_user.id):
        perwalian = db.query(models.Perwalian).filter(
            models.Perwalian.teacher_id == current_user.id,
            models.Perwalian.nis_siswa == nis
        ).first()
        if perwalian:
            has_access = True
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Tidak memiliki akses data siswa ini")

    # Get violation summary
    summaries = crud._build_student_violation_summaries(db, current_user, target_nis=nis)
    summary = summaries[0] if summaries else None
    
    if not summary:
        # Fallback: Fetch basic student info if no violations found (Clean Student)
        student = crud.get_siswa_by_nis(db, nis)
        if student:
            summary = {
                "nis": student.nis,
                "nama": student.nama,
                "kelas": student.id_kelas,
                "angkatan": student.angkatan,
                "active_counts": {"ringan": 0, "sedang": 0, "berat": 0},
                "violations": [],
                "recommendation": "Siswa Berprestasi / Baik"
            }
    
    # Get achievements
    achievements_query = (
        db.query(models.Prestasi)
        .filter(models.Prestasi.nis_siswa == nis)
        .order_by(models.Prestasi.tanggal_prestasi.desc())
        .all()
    )
    
    achievements_data = [
        {
            "id": p.id,
            "judul": p.judul,
            "kategori": p.kategori,
            "tingkat": p.tingkat,
            "tanggal_prestasi": p.tanggal_prestasi,
            "poin": p.poin,
            "poin": p.poin,
            # "status": p.status  <-- REMOVED because attribute doesn't exist
        }
        for p in achievements_query
    ]
    
    return {
        "violation_summary": summary,
        "achievements": achievements_data
    }

@router.get("/admin/monitor")
def monitor_perwalian(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_admin_user),
):
    """Monitoring statistik perwalian untuk Admin."""
    return crud.get_all_perwalian_stats(db)

@router.post("/students")
def add_student_to_me(
    payload: schemas.PerwalianCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user),
):
    """Guru Wali menambahkan siswa ke kelompoknya."""
    if not crud.is_guru_wali(db, current_user.id):
        raise HTTPException(status_code=403, detail="Anda bukan Guru Wali")
    
    try:
        crud.add_perwalian_student(db, current_user.id, payload.nis_siswa)
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/students/{nis}")
def remove_student_from_me(
    nis: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user),
):
    """Guru Wali menghapus siswa, atau Admin menghapus paksa."""
    # Allow Admin to remove any, Teacher to remove own
    target_teacher_id = current_user.id
    
    if current_user.role == schemas.UserRole.ADMIN:
        # Admin needs to find who handles this student
        p = db.query(models.Perwalian).filter(models.Perwalian.nis_siswa == nis).first()
        if not p:
            raise HTTPException(status_code=404, detail="Data perwalian tidak ditemukan")
        target_teacher_id = p.teacher_id
    elif not crud.is_guru_wali(db, current_user.id):
        raise HTTPException(status_code=403, detail="Anda bukan Guru Wali")
    else:
        # Check period active for teachers
        period_active = crud.get_config(db, "perwalian_period_active")
        if period_active != "true":
            raise HTTPException(status_code=400, detail="Periode perwalian ditutup")

    success = crud.remove_perwalian_student(db, target_teacher_id, nis)
    if not success:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan dalam perwalian Anda")
    return {"status": "deleted"}
