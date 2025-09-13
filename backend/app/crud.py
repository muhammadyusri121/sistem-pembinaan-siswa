from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta, timezone
from . import models, schemas
from .hashing import Hasher

# CRUD untuk User
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

# CRUD untuk Siswa
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

# CRUD untuk Kelas
def get_all_kelas(db: Session):
    return db.query(models.Kelas).all()

def create_kelas(db: Session, kelas: schemas.KelasCreate):
    db_kelas = models.Kelas(**kelas.model_dump())
    db.add(db_kelas)
    db.commit()
    db.refresh(db_kelas)
    return db_kelas

# CRUD untuk Jenis Pelanggaran
def get_all_jenis_pelanggaran(db: Session):
    return db.query(models.JenisPelanggaran).all()

def create_jenis_pelanggaran(db: Session, jenis: schemas.JenisPelanggaranCreate):
    db_jenis = models.JenisPelanggaran(**jenis.model_dump())
    db.add(db_jenis)
    db.commit()
    db.refresh(db_jenis)
    return db_jenis

# CRUD untuk Pelanggaran
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

# CRUD untuk Tahun Ajaran
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

# Logika untuk Dashboard
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