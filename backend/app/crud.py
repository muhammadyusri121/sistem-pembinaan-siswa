from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from . import models, schemas
from .hashing import Hasher

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

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

def get_all_jenis_pelanggaran(db: Session):
    return db.query(models.JenisPelanggaran).all()

def create_jenis_pelanggaran(db: Session, jenis: schemas.JenisPelanggaranCreate):
    db_jenis = models.JenisPelanggaran(**jenis.model_dump())
    db.add(db_jenis)
    db.commit()
    db.refresh(db_jenis)
    return db_jenis

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
