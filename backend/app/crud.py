from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from typing import Optional

from . import models, schemas
from .hashing import Hasher

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = Hasher.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=user.role.value,
        is_active=user.is_active,
        kelas_binaan=user.kelas_binaan,
        angkatan_binaan=user.angkatan_binaan
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_id(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()

def update_user(db: Session, user_id: str, user_update: schemas.UserUpdate):
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    if user_update.email is not None:
        db_user.email = user_update.email
    if user_update.full_name is not None:
        db_user.full_name = user_update.full_name
    if user_update.role is not None:
        db_user.role = user_update.role.value
    if user_update.is_active is not None:
        db_user.is_active = user_update.is_active
    if user_update.kelas_binaan is not None:
        db_user.kelas_binaan = user_update.kelas_binaan
    if user_update.angkatan_binaan is not None:
        db_user.angkatan_binaan = user_update.angkatan_binaan
    if user_update.password:
        db_user.hashed_password = Hasher.get_password_hash(user_update.password)
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: str) -> bool:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return False
    # Optional: ensure no violations reported by this user to avoid FK issues
    ref_count = db.query(models.Pelanggaran).filter(models.Pelanggaran.pelapor_id == user_id).count()
    if ref_count > 0:
        # Caller should handle this case (e.g., return 400)
        return False
    db.delete(db_user)
    db.commit()
    return True

def get_siswa_by_nis(db: Session, nis: str):
    return db.query(models.Siswa).filter(models.Siswa.nis == nis).first()

def get_all_siswa(db: Session, skip: int = 0, limit: int = 1000):
    return db.query(models.Siswa).offset(skip).limit(limit).all()

def create_siswa(db: Session, siswa: schemas.SiswaCreate):
    _sync_kelas_from_student(db, siswa)
    db_siswa = models.Siswa(**siswa.model_dump())
    db.add(db_siswa)
    db.commit()
    db.refresh(db_siswa)
    return db_siswa

def search_siswa(db: Session, term: str):
    pattern = f"%{term}%"
    return (
        db.query(models.Siswa)
        .filter(
            (models.Siswa.nis.ilike(pattern)) |
            (models.Siswa.nama.ilike(pattern)) |
            (models.Siswa.id_kelas.ilike(pattern))
        )
        .all()
    )

def update_siswa(db: Session, nis: str, siswa_update: schemas.SiswaUpdate):
    db_siswa = get_siswa_by_nis(db, nis)
    if not db_siswa:
        return None
    data = siswa_update.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(db_siswa, field, value)
    if 'id_kelas' in data or 'angkatan' in data:
        merged = schemas.SiswaCreate(
            nis=db_siswa.nis,
            nama=db_siswa.nama,
            id_kelas=db_siswa.id_kelas,
            angkatan=db_siswa.angkatan,
            jenis_kelamin=db_siswa.jenis_kelamin,
            aktif=db_siswa.aktif,
        )
        _sync_kelas_from_student(db, merged)
    db.commit()
    db.refresh(db_siswa)
    return db_siswa

def delete_siswa(db: Session, nis: str) -> bool:
    db_siswa = get_siswa_by_nis(db, nis)
    if not db_siswa:
        return False
    # Ensure no pelanggaran reference this siswa
    ref_count = db.query(models.Pelanggaran).filter(models.Pelanggaran.nis_siswa == nis).count()
    if ref_count > 0:
        return False
    db.delete(db_siswa)
    db.commit()
    return True

def get_all_kelas(db: Session):
    return db.query(models.Kelas).all()

def create_kelas(db: Session, kelas: schemas.KelasCreate):
    db_kelas = models.Kelas(**kelas.model_dump())
    db.add(db_kelas)
    db.commit()
    db.refresh(db_kelas)
    return db_kelas


def update_kelas(db: Session, kelas_id: str, kelas_update: schemas.KelasUpdate):
    db_kelas = db.query(models.Kelas).filter(models.Kelas.id == kelas_id).first()
    if not db_kelas:
        return None
    data = kelas_update.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(db_kelas, field, value)
    db.commit()
    db.refresh(db_kelas)
    return db_kelas


def delete_kelas(db: Session, kelas_id: str) -> bool:
    db_kelas = db.query(models.Kelas).filter(models.Kelas.id == kelas_id).first()
    if not db_kelas:
        return False
    db.delete(db_kelas)
    db.commit()
    return True

def get_all_jenis_pelanggaran(db: Session):
    return db.query(models.JenisPelanggaran).all()

def create_jenis_pelanggaran(db: Session, jenis: schemas.JenisPelanggaranCreate):
    db_jenis = models.JenisPelanggaran(**jenis.model_dump())
    db.add(db_jenis)
    db.commit()
    db.refresh(db_jenis)
    return db_jenis


def update_jenis_pelanggaran(db: Session, jenis_id: str, jenis_update: schemas.JenisPelanggaranUpdate):
    db_jenis = db.query(models.JenisPelanggaran).filter(models.JenisPelanggaran.id == jenis_id).first()
    if not db_jenis:
        return None
    data = jenis_update.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(db_jenis, field, value)
    db.commit()
    db.refresh(db_jenis)
    return db_jenis


def delete_jenis_pelanggaran(db: Session, jenis_id: str) -> bool:
    db_jenis = db.query(models.JenisPelanggaran).filter(models.JenisPelanggaran.id == jenis_id).first()
    if not db_jenis:
        return False
    db.delete(db_jenis)
    db.commit()
    return True

def create_pelanggaran(db: Session, pelanggaran: schemas.PelanggaranCreate, pelapor_id: str):
    db_pelanggaran = models.Pelanggaran(
        **pelanggaran.model_dump(),
        pelapor_id=pelapor_id
    )
    db.add(db_pelanggaran)
    db.commit()
    db.refresh(db_pelanggaran)
    return db_pelanggaran

def get_pelanggaran(db: Session, user: schemas.User):
    query = db.query(models.Pelanggaran)
    if user.role == schemas.UserRole.WALI_KELAS and user.kelas_binaan:
        nis_list = [s.nis for s in db.query(models.Siswa.nis).filter(models.Siswa.id_kelas == user.kelas_binaan).all()]
        query = query.filter(models.Pelanggaran.nis_siswa.in_(nis_list))
    elif user.role == schemas.UserRole.GURU_BK and user.angkatan_binaan:
        nis_list = [s.nis for s in db.query(models.Siswa.nis).filter(models.Siswa.angkatan == user.angkatan_binaan).all()]
        query = query.filter(models.Pelanggaran.nis_siswa.in_(nis_list))
    elif user.role == schemas.UserRole.GURU_UMUM:
        query = query.filter(models.Pelanggaran.pelapor_id == user.id)
    
    return query.all()

def get_all_tahun_ajaran(db: Session):
    return db.query(models.TahunAjaran).all()

def create_tahun_ajaran(db: Session, tahun: schemas.TahunAjaranCreate):
    if tahun.is_active:
        db.query(models.TahunAjaran).update({"is_active": False})
    db_tahun = models.TahunAjaran(**tahun.model_dump())
    db.add(db_tahun)
    db.commit()
    db.refresh(db_tahun)
    return db_tahun


def update_tahun_ajaran(db: Session, tahun_id: str, tahun_update: schemas.TahunAjaranUpdate):
    db_tahun = db.query(models.TahunAjaran).filter(models.TahunAjaran.id == tahun_id).first()
    if not db_tahun:
        return None
    data = tahun_update.model_dump(exclude_unset=True)
    if data.get('is_active'):
        db.query(models.TahunAjaran).update({"is_active": False})
    for field, value in data.items():
        setattr(db_tahun, field, value)
    db.commit()
    db.refresh(db_tahun)
    return db_tahun


def delete_tahun_ajaran(db: Session, tahun_id: str) -> bool:
    db_tahun = db.query(models.TahunAjaran).filter(models.TahunAjaran.id == tahun_id).first()
    if not db_tahun:
        return False
    db.delete(db_tahun)
    db.commit()
    return True

def get_dashboard_stats(db: Session):
    total_siswa = db.query(func.count(models.Siswa.nis)).scalar()
    total_pelanggaran = db.query(func.count(models.Pelanggaran.id)).scalar()
    total_users = db.query(func.count(models.User.id)).scalar()
    total_kelas = db.query(func.count(models.Kelas.id)).scalar()
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recent_violations = db.query(func.count(models.Pelanggaran.id)).filter(
        models.Pelanggaran.created_at >= thirty_days_ago
    ).scalar()
    return {
        "total_siswa": total_siswa,
        "total_pelanggaran": total_pelanggaran,
        "total_users": total_users,
        "total_kelas": total_kelas,
        "recent_violations": recent_violations
    }


def _guess_tingkat(nama_kelas: str) -> str:
    digits = ''.join(ch for ch in nama_kelas if ch.isdigit())
    if len(digits) >= 2:
        return digits[:2]
    if digits:
        return digits
    return '10'


def _get_expected_wali_kelas(db: Session, kelas_name: str) -> Optional[str]:
    wali = (
        db.query(models.User)
        .filter(
            models.User.role == schemas.UserRole.WALI_KELAS.value,
            models.User.kelas_binaan == kelas_name,
            models.User.is_active.is_(True)
        )
        .order_by(models.User.created_at.asc())
        .first()
    )
    return wali.full_name if wali else None


def _sync_kelas_from_student(db: Session, siswa: schemas.SiswaCreate):
    kelas_name = siswa.id_kelas.strip()
    if not kelas_name:
        return

    kelas = (
        db.query(models.Kelas)
        .filter(models.Kelas.nama_kelas == kelas_name)
        .first()
    )

    expected_wali = _get_expected_wali_kelas(db, kelas_name)

    if not kelas:
        raise ValueError(f"Kelas '{kelas_name}' belum terdaftar di master data")

    updated = False
    if expected_wali and kelas.wali_kelas != expected_wali:
        kelas.wali_kelas = expected_wali
        updated = True
    if not kelas.tahun_ajaran and siswa.angkatan:
        kelas.tahun_ajaran = str(siswa.angkatan).strip()
        updated = True
    if updated:
        db.flush()
