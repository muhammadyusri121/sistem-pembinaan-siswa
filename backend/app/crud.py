from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from typing import Optional

from . import models, schemas
from .hashing import Hasher

def get_user_by_nip(db: Session, nip: str):
    return db.query(models.User).filter(models.User.nip == nip).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = Hasher.get_password_hash(user.password)
    kelas_binaan = user.kelas_binaan if user.role == schemas.UserRole.WALI_KELAS else None
    db_user = models.User(
        nip=user.nip,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=user.role.value,
        is_active=user.is_active,
        kelas_binaan=kelas_binaan,
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
    if user_update.nip is not None and user_update.nip != db_user.nip:
        existing = get_user_by_nip(db, user_update.nip)
        if existing and existing.id != db_user.id:
            raise ValueError("NIP sudah terdaftar")
        kelas_terkait = (
            db.query(models.Kelas)
            .filter(models.Kelas.wali_kelas_nip == db_user.nip)
            .all()
        )
        for kelas in kelas_terkait:
            kelas.wali_kelas_nip = user_update.nip
            kelas.wali_kelas_name = db_user.full_name
        db_user.nip = user_update.nip
    if user_update.email is not None:
        db_user.email = user_update.email
    if user_update.full_name is not None:
        db_user.full_name = user_update.full_name
        if db_user.kelas_binaan:
            kelas = db.query(models.Kelas).filter(models.Kelas.nama_kelas == db_user.kelas_binaan).first()
            if kelas and kelas.wali_kelas_nip == db_user.nip:
                kelas.wali_kelas_name = db_user.full_name
    if user_update.role is not None:
        db_user.role = user_update.role.value
        if user_update.role != schemas.UserRole.WALI_KELAS:
            if db_user.kelas_binaan:
                kelas = db.query(models.Kelas).filter(models.Kelas.nama_kelas == db_user.kelas_binaan).first()
                if kelas and kelas.wali_kelas_nip == db_user.nip:
                    kelas.wali_kelas_nip = None
                    kelas.wali_kelas_name = None
            db_user.kelas_binaan = None
    if user_update.is_active is not None:
        db_user.is_active = user_update.is_active
        if not user_update.is_active and db_user.kelas_binaan:
            kelas = db.query(models.Kelas).filter(models.Kelas.nama_kelas == db_user.kelas_binaan).first()
            if kelas and kelas.wali_kelas_nip == db_user.nip:
                kelas.wali_kelas_nip = None
                kelas.wali_kelas_name = None
            db_user.kelas_binaan = None
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
    if db_user.kelas_binaan:
        kelas = db.query(models.Kelas).filter(models.Kelas.nama_kelas == db_user.kelas_binaan).first()
        if kelas and kelas.wali_kelas_nip == db_user.nip:
            kelas.wali_kelas_nip = None
            kelas.wali_kelas_name = None
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

def delete_siswa(db: Session, nis: str) -> tuple[bool, str | None]:
    db_siswa = get_siswa_by_nis(db, nis)
    if not db_siswa:
        return False, "not_found"

    pelanggaran_list = (
        db.query(models.Pelanggaran)
        .filter(models.Pelanggaran.nis_siswa == nis)
        .all()
    )

    if pelanggaran_list:
        unresolved = [
            pel for pel in pelanggaran_list
            if pel.status != schemas.PelanggaranStatus.RESOLVED.value
        ]
        if unresolved:
            return False, "has_unresolved"

        for pel in pelanggaran_list:
            db.delete(pel)

    db.delete(db_siswa)
    db.commit()
    return True, None

def get_all_kelas(db: Session):
    kelas_list = db.query(models.Kelas).all()
    nip_list = [k.wali_kelas_nip for k in kelas_list if k.wali_kelas_nip]
    wali_map = {}
    if nip_list:
        wali_users = (
            db.query(models.User)
            .filter(models.User.nip.in_(nip_list))
            .all()
        )
        wali_map = {u.nip: u.full_name for u in wali_users}
    for kelas in kelas_list:
        kelas.wali_kelas_name = wali_map.get(kelas.wali_kelas_nip)
    return kelas_list

def _assign_wali_kelas(db: Session, kelas: models.Kelas, wali_kelas_nip: str | None):
    # Clear previous wali assignment if changing
    if kelas.wali_kelas_nip and kelas.wali_kelas_nip != wali_kelas_nip:
        old_wali = db.query(models.User).filter(models.User.nip == kelas.wali_kelas_nip).first()
        if old_wali and old_wali.kelas_binaan == kelas.nama_kelas:
            old_wali.kelas_binaan = None

    if wali_kelas_nip:
        wali_user = db.query(models.User).filter(models.User.nip == wali_kelas_nip).first()
        if not wali_user:
            raise ValueError("Wali kelas tidak ditemukan")
        if wali_user.role != schemas.UserRole.WALI_KELAS.value:
            raise ValueError("Pengguna yang dipilih bukan dengan role wali kelas")
        if not wali_user.is_active:
            raise ValueError("Wali kelas yang dipilih tidak aktif")
        if wali_user.kelas_binaan and wali_user.kelas_binaan != kelas.nama_kelas:
            raise ValueError("Wali kelas sudah terikat dengan kelas lain")
        wali_user.kelas_binaan = kelas.nama_kelas
        kelas.wali_kelas_nip = wali_kelas_nip
        kelas.wali_kelas_name = wali_user.full_name
    else:
        kelas.wali_kelas_nip = None
        kelas.wali_kelas_name = None


def create_kelas(db: Session, kelas: schemas.KelasCreate):
    data = kelas.model_dump()
    wali_kelas_nip = data.pop("wali_kelas_nip", None)
    db_kelas = models.Kelas(**data)
    db.add(db_kelas)
    db.flush()
    if wali_kelas_nip:
        _assign_wali_kelas(db, db_kelas, wali_kelas_nip)
    db.commit()
    db.refresh(db_kelas)
    return db_kelas


def update_kelas(db: Session, kelas_id: str, kelas_update: schemas.KelasUpdate):
    db_kelas = db.query(models.Kelas).filter(models.Kelas.id == kelas_id).first()
    if not db_kelas:
        return None
    data = kelas_update.model_dump(exclude_unset=True)
    wali_kelas_nip = None
    if "wali_kelas_nip" in data:
        wali_kelas_nip = data.pop("wali_kelas_nip")
    for field, value in data.items():
        setattr(db_kelas, field, value)
    if kelas_update.wali_kelas_nip is not None:
        _assign_wali_kelas(db, db_kelas, wali_kelas_nip)
    if "nama_kelas" in data and db_kelas.wali_kelas_nip:
        wali_user = db.query(models.User).filter(models.User.nip == db_kelas.wali_kelas_nip).first()
        if wali_user:
            wali_user.kelas_binaan = db_kelas.nama_kelas
    db.commit()
    db.refresh(db_kelas)
    return db_kelas


def delete_kelas(db: Session, kelas_id: str) -> bool:
    db_kelas = db.query(models.Kelas).filter(models.Kelas.id == kelas_id).first()
    if not db_kelas:
        return False
    if db_kelas.wali_kelas_nip:
        wali_user = db.query(models.User).filter(models.User.nip == db_kelas.wali_kelas_nip).first()
        if wali_user and wali_user.kelas_binaan == db_kelas.nama_kelas:
            wali_user.kelas_binaan = None
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

def get_pelanggaran_by_id(db: Session, pelanggaran_id: str):
    return (
        db.query(models.Pelanggaran)
        .filter(models.Pelanggaran.id == pelanggaran_id)
        .first()
    )

def update_pelanggaran_status(
    db: Session,
    pelanggaran_id: str,
    status: schemas.PelanggaranStatus,
):
    pelanggaran = get_pelanggaran_by_id(db, pelanggaran_id)
    if not pelanggaran:
        return None

    pelanggaran.status = status.value
    db.commit()
    db.refresh(pelanggaran)
    return pelanggaran

def delete_pelanggaran(db: Session, pelanggaran_id: str) -> bool:
    pelanggaran = get_pelanggaran_by_id(db, pelanggaran_id)
    if not pelanggaran:
        return False
    db.delete(pelanggaran)
    db.commit()
    return True

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


def _sync_kelas_from_student(db: Session, siswa: schemas.SiswaCreate):
    kelas_name = siswa.id_kelas.strip()
    if not kelas_name:
        return

    kelas = (
        db.query(models.Kelas)
        .filter(models.Kelas.nama_kelas == kelas_name)
        .first()
    )

    if not kelas:
        raise ValueError(f"Kelas '{kelas_name}' belum terdaftar di master data")

    updated = False
    if not kelas.tahun_ajaran and siswa.angkatan:
        kelas.tahun_ajaran = str(siswa.angkatan).strip()
        updated = True
    if updated:
        db.flush()
