"""Kumpulan fungsi CRUD dan agregasi statistik untuk modul backend."""

from sqlalchemy.orm import Session
from sqlalchemy import func, case, select
from sqlalchemy.engine import Row
from datetime import datetime, timedelta, timezone
from typing import Optional, List
import calendar


def _kelas_list(value) -> List[str]:
    """Menormalkan berbagai representasi kelas menjadi daftar string."""
    if not value:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [value]
    try:
        return list(value)
    except TypeError:
        return [str(value)]


def _set_user_kelas(user, kelas: List[str]):
    """Mengganti daftar kelas binaan pada objek user."""
    user.kelas_binaan = kelas if kelas else []


def _add_kelas_to_user(user, kelas_name: str):
    """Menambahkan nama kelas ke atribut kelas binaan user bila belum ada."""
    kelas_name = (kelas_name or "").strip()
    if not kelas_name:
        return
    kelas_list = _kelas_list(user.kelas_binaan)
    if kelas_name not in kelas_list:
        kelas_list.append(kelas_name)
    _set_user_kelas(user, kelas_list)


def _remove_kelas_from_user(user, kelas_name: str):
    """Menghapus nama kelas tertentu dari daftar kelas binaan user."""
    kelas_list = [name for name in _kelas_list(user.kelas_binaan) if name != kelas_name]
    _set_user_kelas(user, kelas_list)

from . import models, schemas
from .hashing import Hasher

def get_user_by_nip(db: Session, nip: str):
    """Mengambil satu pengguna berdasarkan NIP uniknya."""
    return db.query(models.User).filter(models.User.nip == nip).first()


def get_user_by_email(db: Session, email: str):
    """Mengambil satu pengguna berdasarkan alamat email."""
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    """Mengambil daftar pengguna dengan dukungan pagination sederhana."""
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    """Membuat pengguna baru sekaligus mengatur kelas atau angkatan binaan."""
    hashed_password = Hasher.get_password_hash(user.password)
    kelas_binaan: List[str] = []
    if user.role == schemas.UserRole.WALI_KELAS:
        seen: set[str] = set()
        for name in _kelas_list(user.kelas_binaan):
            trimmed = (name or "").strip()
            if trimmed and trimmed not in seen:
                kelas_binaan.append(trimmed)
                seen.add(trimmed)
    db_user = models.User(
        nip=user.nip,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=user.role.value,
        is_active=user.is_active,
        kelas_binaan=kelas_binaan,
        angkatan_binaan=(user.angkatan_binaan or "").strip() or None
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_id(db: Session, user_id: str):
    """Mengambil pengguna berdasarkan ID internal."""
    return db.query(models.User).filter(models.User.id == user_id).first()

def update_user(db: Session, user_id: str, user_update: schemas.UserUpdate):
    """Memperbarui atribut pengguna termasuk pemetaan kelas/angkatan sesuai peran."""
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    previous_role = db_user.role
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
        for kelas_name in _kelas_list(db_user.kelas_binaan):
            kelas = (
                db.query(models.Kelas)
                .filter(models.Kelas.nama_kelas == kelas_name)
                .first()
            )
            if kelas and kelas.wali_kelas_nip == db_user.nip:
                kelas.wali_kelas_name = db_user.full_name
    current_role = db_user.role
    if user_update.role is not None:
        new_role = user_update.role.value
        if (
            previous_role == schemas.UserRole.WALI_KELAS.value
            and new_role != schemas.UserRole.WALI_KELAS.value
        ):
            for kelas_name in _kelas_list(db_user.kelas_binaan):
                kelas = (
                    db.query(models.Kelas)
                    .filter(models.Kelas.nama_kelas == kelas_name)
                    .first()
                )
                if kelas and kelas.wali_kelas_nip == db_user.nip:
                    kelas.wali_kelas_nip = None
                    kelas.wali_kelas_name = None
            _set_user_kelas(db_user, [])
        if (
            previous_role == schemas.UserRole.GURU_BK.value
            and new_role != schemas.UserRole.GURU_BK.value
        ):
            _set_user_kelas(db_user, [])
            db_user.angkatan_binaan = None
        db_user.role = new_role
        current_role = db_user.role
    if user_update.is_active is not None:
        db_user.is_active = user_update.is_active
        if not user_update.is_active:
            for kelas_name in _kelas_list(db_user.kelas_binaan):
                kelas = (
                    db.query(models.Kelas)
                    .filter(models.Kelas.nama_kelas == kelas_name)
                    .first()
                )
                if kelas and kelas.wali_kelas_nip == db_user.nip:
                    kelas.wali_kelas_nip = None
                    kelas.wali_kelas_name = None
            _set_user_kelas(db_user, [])
    if (
        user_update.kelas_binaan is not None
        and current_role == schemas.UserRole.WALI_KELAS.value
    ):
        desired = [name.strip() for name in user_update.kelas_binaan if name and name.strip()]
        desired_set = set(desired)
        current_set = set(_kelas_list(db_user.kelas_binaan))

        for kelas_name in current_set - desired_set:
            kelas = (
                db.query(models.Kelas)
                .filter(models.Kelas.nama_kelas == kelas_name)
                .first()
            )
            if kelas and kelas.wali_kelas_nip == db_user.nip:
                kelas.wali_kelas_nip = None
                kelas.wali_kelas_name = None
            _remove_kelas_from_user(db_user, kelas_name)

        for kelas_name in desired:
            if kelas_name in current_set:
                continue
            kelas = (
                db.query(models.Kelas)
                .filter(models.Kelas.nama_kelas == kelas_name)
                .first()
            )
            if not kelas:
                raise ValueError(f"Kelas '{kelas_name}' tidak ditemukan")
            _assign_wali_kelas(db, kelas, db_user.nip)

        _set_user_kelas(db_user, desired)
    if user_update.angkatan_binaan is not None:
        trimmed = (user_update.angkatan_binaan or "").strip()
        db_user.angkatan_binaan = trimmed if trimmed else None
    if user_update.password:
        db_user.hashed_password = Hasher.get_password_hash(user_update.password)
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: str) -> bool:
    """Menghapus pengguna dan merapikan relasi kelas yang masih terkait."""
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return False
    # Optional: ensure no violations reported by this user to avoid FK issues
    ref_count = db.query(models.Pelanggaran).filter(models.Pelanggaran.pelapor_id == user_id).count()
    if ref_count > 0:
        # Caller should handle this case (e.g., return 400)
        return False
    for kelas_name in _kelas_list(db_user.kelas_binaan):
        kelas = (
            db.query(models.Kelas)
            .filter(models.Kelas.nama_kelas == kelas_name)
            .first()
        )
        if kelas and kelas.wali_kelas_nip == db_user.nip:
            kelas.wali_kelas_nip = None
            kelas.wali_kelas_name = None
    db.delete(db_user)
    db.commit()
    return True

def get_siswa_by_nis(db: Session, nis: str):
    """Mengambil siswa tunggal berdasarkan NIS."""
    return db.query(models.Siswa).filter(models.Siswa.nis == nis).first()

def get_all_siswa(db: Session, skip: int = 0, limit: int = 1000):
    """Mengambil daftar siswa dengan batas bawaan 1000 data."""
    return (
        db.query(models.Siswa)
        .filter(models.Siswa.status_siswa != schemas.SiswaStatus.DELETED.value)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_active_tahun_ajaran(db: Session):
    """Mengambil tahun ajaran yang sedang aktif (jika ada)."""
    return (
        db.query(models.TahunAjaran)
        .filter(models.TahunAjaran.is_active.is_(True))
        .order_by(models.TahunAjaran.created_at.desc())
        .first()
    )


def create_siswa(db: Session, siswa: schemas.SiswaCreate, *, commit: bool = True):
    """Membuat entri siswa baru sekaligus menyelaraskan data kelas."""
    _sync_kelas_from_student(db, siswa)
    db_siswa = models.Siswa(**siswa.model_dump())
    db.add(db_siswa)
    if commit:
        db.commit()
        db.refresh(db_siswa)
    else:
        db.flush()
    return db_siswa

def search_siswa(db: Session, term: str):
    """Mencari siswa berdasarkan NIS, nama, atau kelas dengan pencarian like."""
    pattern = f"%{term}%"
    return (
        db.query(models.Siswa)
        .filter(
            (models.Siswa.nis.ilike(pattern)) |
            (models.Siswa.nama.ilike(pattern)) |
            (models.Siswa.id_kelas.ilike(pattern))
        )
        .filter(models.Siswa.status_siswa != schemas.SiswaStatus.DELETED.value)
        .all()
    )

def update_siswa(db: Session, nis: str, siswa_update: schemas.SiswaUpdate, *, commit: bool = True):
    """Memperbarui data siswa dan sinkronisasi kelas jika ada perubahan."""
    db_siswa = get_siswa_by_nis(db, nis)
    if not db_siswa:
        return None
    data = siswa_update.model_dump(exclude_unset=True)
    status_value = data.get("status_siswa")
    if status_value is not None:
        status_str = status_value.value if isinstance(status_value, schemas.SiswaStatus) else str(status_value)
        status_str = status_str.strip().lower()
        if status_str.startswith("siswastatus."):
            status_str = status_str.split(".", 1)[1]
        valid_statuses = {item.value for item in schemas.SiswaStatus}
        if status_str not in valid_statuses:
            status_str = db_siswa.status_siswa or schemas.SiswaStatus.AKTIF.value
        # Terapkan status dan flag aktif langsung pada instance agar pasti tersimpan
        db_siswa.status_siswa = status_str
        db_siswa.aktif = status_str == schemas.SiswaStatus.AKTIF.value
        data.pop("status_siswa", None)
        data.pop("aktif", None)
    # Jika status tidak disediakan pada payload, pertahankan status_siswa lama.
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
            status_siswa=db_siswa.status_siswa,
        )
        _sync_kelas_from_student(db, merged)
    if commit:
        db.commit()
        db.refresh(db_siswa)
    else:
        db.flush()
    return db_siswa


def upsert_riwayat_kelas(
    db: Session,
    nis: str,
    kelas: str,
    tahun_ajaran: Optional[str],
    *,
    commit: bool = True,
):
    """Menyimpan atau memperbarui riwayat kelas siswa pada tahun ajaran tertentu."""
    tahun = (tahun_ajaran or "").strip()
    kelas_name = (kelas or "").strip()
    if not tahun or not kelas_name:
        return None

    existing = (
        db.query(models.RiwayatKelas)
        .filter(
            models.RiwayatKelas.nis == nis,
            models.RiwayatKelas.tahun_ajaran == tahun,
        )
        .first()
    )
    if existing:
        if existing.kelas != kelas_name:
            existing.kelas = kelas_name
            if commit:
                db.commit()
            else:
                db.flush()
        return existing

    history = models.RiwayatKelas(
        nis=nis,
        tahun_ajaran=tahun,
        kelas=kelas_name,
    )
    db.add(history)
    if commit:
        db.commit()
        db.refresh(history)
    else:
        db.flush()
    return history

def delete_siswa(db: Session, nis: str) -> tuple[bool, str | None]:
    """Menghapus siswa. Jika ada prestasi, lakukan soft delete."""
    db_siswa = get_siswa_by_nis(db, nis)
    if not db_siswa:
        return False, "not_found"

    # Cek pelanggaran aktif (unresolved)
    unresolved_count = (
        db.query(models.Pelanggaran)
        .filter(
            models.Pelanggaran.nis_siswa == nis,
            models.Pelanggaran.status != schemas.PelanggaranStatus.RESOLVED.value
        )
        .count()
    )
    if unresolved_count > 0:
        return False, "has_unresolved"

    # Cek keberadaan prestasi
    has_prestasi = db.query(models.Prestasi).filter(models.Prestasi.nis_siswa == nis).first() is not None

    if has_prestasi:
        # Lakukan Soft Delete untuk mempertahankan riwayat prestasi
        db_siswa.status_siswa = schemas.SiswaStatus.DELETED.value
        db_siswa.aktif = False
        db.commit()
        return True, None

    # Jika tidak ada prestasi, lakukan Hard Delete (bersihkan data terkait)
    db.query(models.Pelanggaran).filter(models.Pelanggaran.nis_siswa == nis).delete(synchronize_session=False)
    db.query(models.RiwayatKelas).filter(models.RiwayatKelas.nis == nis).delete(synchronize_session=False)
    
    db.delete(db_siswa)
    db.commit()
    return True, None

def get_all_kelas(db: Session):
    """Mengambil seluruh data kelas sambil melengkapi nama wali kelas."""
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
    """Mengatur hubungan wali kelas <-> kelas dan membersihkan relasi lama."""
    # Clear previous wali assignment if changing
    if kelas.wali_kelas_nip and kelas.wali_kelas_nip != wali_kelas_nip:
        old_wali = db.query(models.User).filter(models.User.nip == kelas.wali_kelas_nip).first()
        if old_wali:
            _remove_kelas_from_user(old_wali, kelas.nama_kelas)

    if wali_kelas_nip:
        # Ensure 1-to-1 mapping: Check if this wali is already assigned to another class
        conflict_class = db.query(models.Kelas).filter(
            models.Kelas.wali_kelas_nip == wali_kelas_nip,
            models.Kelas.id != kelas.id
        ).first()
        if conflict_class:
            raise ValueError(f"Wali kelas sudah mengampu kelas {conflict_class.nama_kelas}")

        wali_user = db.query(models.User).filter(models.User.nip == wali_kelas_nip).first()
        if not wali_user:
            raise ValueError("Wali kelas tidak ditemukan")
        if wali_user.role != schemas.UserRole.WALI_KELAS.value:
            raise ValueError("Pengguna yang dipilih bukan dengan role wali kelas")
        if not wali_user.is_active:
            raise ValueError("Wali kelas yang dipilih tidak aktif")
        kelas.wali_kelas_nip = wali_kelas_nip
        kelas.wali_kelas_name = wali_user.full_name
        _add_kelas_to_user(wali_user, kelas.nama_kelas)
    else:
        if kelas.wali_kelas_nip:
            current_wali = (
                db.query(models.User)
                .filter(models.User.nip == kelas.wali_kelas_nip)
                .first()
            )
            if current_wali:
                _remove_kelas_from_user(current_wali, kelas.nama_kelas)
        kelas.wali_kelas_nip = wali_kelas_nip
        kelas.wali_kelas_name = None


def create_kelas(db: Session, kelas: schemas.KelasCreate):
    """Membuat entri kelas baru dengan otomatis menggunakan tahun ajaran aktif."""
    data = kelas.model_dump()
    wali_kelas_nip = data.pop("wali_kelas_nip", None)
    
    # Auto-assign active academic year
    active_year = get_active_tahun_ajaran(db)
    if not active_year:
        raise ValueError("Belum ada tahun ajaran aktif. Silakan buat/aktifkan terlebih dahulu.")
    
    data['tahun_ajaran'] = f"{active_year.tahun} - Semester {active_year.semester}"
    
    # Check for duplicate class name
    if db.query(models.Kelas).filter(models.Kelas.nama_kelas == data['nama_kelas']).first():
         raise ValueError(f"Kelas '{data['nama_kelas']}' sudah ada")

    db_kelas = models.Kelas(**data)
    db.add(db_kelas)
    db.flush()
    if wali_kelas_nip:
        _assign_wali_kelas(db, db_kelas, wali_kelas_nip)
    db.commit()
    db.refresh(db_kelas)
    return db_kelas


def update_kelas(db: Session, kelas_id: str, kelas_update: schemas.KelasUpdate):
    """Memperbarui data kelas dan sinkronisasi wali kelas/angkatan."""
    db_kelas = db.query(models.Kelas).filter(models.Kelas.id == kelas_id).first()
    if not db_kelas:
        return None
    data = kelas_update.model_dump(exclude_unset=True)
    
    has_wali_update = False
    wali_kelas_nip_update = None
    
    old_nama = db_kelas.nama_kelas
    if "wali_kelas_nip" in data:
        wali_kelas_nip_update = data.pop("wali_kelas_nip")
        has_wali_update = True
        
    for field, value in data.items():
        # Prevent manual overwrite of academic year via update endpoint if we want consistent logic, 
        # but user request specifically mentioned "di data master tidak perlu ada pilihan". 
        # So likely we should just ignore if frontend sends it, OR updated it to active year if requested?
        # For simplicity and robustnes: "Kelas otomatis mengikuti tahun ajaran yg aktif" 
        # usually implies when CREATED. If Updated, should it move to new year? 
        # Let's assume Update only updates meta info like Name/Wali, not the Year it belongs to unless migrated.
        # But if the user wants ALL classes to follow active year, that implies a dynamic relationship or bulk update.
        # Given the previous context of "Validation/Snapshotting", let's keep 'year' property on Class 
        # but auto-set it on create. On update, we generally trust the payload or ignore it. 
        # However, to strictly follow "tidak perlu ada pilihan", we should ensure frontend doesn't send it 
        # and backend handles it.
        if field == 'tahun_ajaran':
            continue # Skip manual year update to maintain integrity or force active year?
            # Let's just update other fields.
        setattr(db_kelas, field, value)
    
    if has_wali_update:
        _assign_wali_kelas(db, db_kelas, wali_kelas_nip_update)
    if "nama_kelas" in data and db_kelas.wali_kelas_nip:
        wali_user = (
            db.query(models.User)
            .filter(models.User.nip == db_kelas.wali_kelas_nip)
            .first()
        )
        if wali_user:
            updated_list = [
                db_kelas.nama_kelas if name == old_nama else name
                for name in _kelas_list(wali_user.kelas_binaan)
            ]
            _set_user_kelas(wali_user, updated_list)
    db.commit()
    db.refresh(db_kelas)
    return db_kelas


def delete_kelas(db: Session, kelas_id: str) -> bool:
    """Menghapus kelas sekaligus memutus hubungan dengan wali terkait."""
    db_kelas = db.query(models.Kelas).filter(models.Kelas.id == kelas_id).first()
    if not db_kelas:
        return False
    if db_kelas.wali_kelas_nip:
        wali_user = (
            db.query(models.User)
            .filter(models.User.nip == db_kelas.wali_kelas_nip)
            .first()
        )
        if wali_user:
            _remove_kelas_from_user(wali_user, db_kelas.nama_kelas)
    db.delete(db_kelas)
    db.commit()
    return True

def get_all_jenis_pelanggaran(db: Session):
    """Mengambil seluruh jenis pelanggaran yang terdaftar."""
    return db.query(models.JenisPelanggaran).all()

def create_jenis_pelanggaran(db: Session, jenis: schemas.JenisPelanggaranCreate):
    """Menambahkan jenis pelanggaran baru dengan detail lengkap."""
    db_jenis = models.JenisPelanggaran(**jenis.model_dump())
    db.add(db_jenis)
    db.commit()
    db.refresh(db_jenis)
    return db_jenis


def update_jenis_pelanggaran(db: Session, jenis_id: str, jenis_update: schemas.JenisPelanggaranUpdate):
    """Memperbarui informasi jenis pelanggaran tertentu."""
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
    """Menghapus jenis pelanggaran dari master data."""
    db_jenis = db.query(models.JenisPelanggaran).filter(models.JenisPelanggaran.id == jenis_id).first()
    if not db_jenis:
        return False
    db.delete(db_jenis)
    db.commit()
    return True

def create_pelanggaran(db: Session, pelanggaran: schemas.PelanggaranCreate, pelapor_id: str):
    """Membuat catatan pelanggaran baru beserta informasi pelapor."""
    siswa = get_siswa_by_nis(db, pelanggaran.nis_siswa)
    if not siswa:
        raise ValueError("Siswa tidak ditemukan untuk NIS yang diberikan")
    if siswa.status_siswa != schemas.SiswaStatus.AKTIF.value:
        raise ValueError("Pelanggaran hanya bisa dicatat untuk siswa berstatus aktif")

    db_pelanggaran = models.Pelanggaran(
        **pelanggaran.model_dump(),
        pelapor_id=pelapor_id,
        kelas_snapshot=siswa.id_kelas,
    )
    db.add(db_pelanggaran)
    db.commit()
    db.refresh(db_pelanggaran)
    return db_pelanggaran

def get_pelanggaran_by_id(db: Session, pelanggaran_id: str):
    """Mengambil satu pelanggaran berdasarkan ID."""
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
    """Memperbarui status tindakan terhadap pelanggaran tertentu."""
    pelanggaran = get_pelanggaran_by_id(db, pelanggaran_id)
    if not pelanggaran:
        return None

    pelanggaran.status = status.value
    db.commit()
    db.refresh(pelanggaran)
    return pelanggaran

def delete_pelanggaran(db: Session, pelanggaran_id: str) -> bool:
    """Menghapus catatan pelanggaran apabila ditemukan."""
    pelanggaran = get_pelanggaran_by_id(db, pelanggaran_id)
    if not pelanggaran:
        return False
    db.delete(pelanggaran)
    db.commit()
    return True

def _get_allowed_nis_subquery(db: Session, user: schemas.User):
    """Membangun subquery daftar NIS yang boleh diakses sesuai peran."""
    if user.role == schemas.UserRole.WALI_KELAS and user.kelas_binaan:
        kelas_list = _kelas_list(user.kelas_binaan)
        if kelas_list:
            return select(models.Siswa.nis).where(
                models.Siswa.id_kelas.in_(kelas_list)
            )
    if user.role == schemas.UserRole.GURU_BK and user.angkatan_binaan:
        tingkat = (user.angkatan_binaan or "").strip()
        if tingkat:
            tingkat_normalized = tingkat.lower()
            return (
                select(models.Siswa.nis)
                .join(
                    models.Kelas,
                    models.Kelas.nama_kelas == models.Siswa.id_kelas,
                )
                .where(
                    func.lower(func.trim(models.Kelas.tingkat))
                    == tingkat_normalized
                )
            )
    return None


def get_pelanggaran(db: Session, user: schemas.User):
    """Mengambil daftar pelanggaran dengan filter akses berbasis peran."""
    query = db.query(models.Pelanggaran)

    if user.role == schemas.UserRole.GURU_UMUM:
        query = query.filter(models.Pelanggaran.pelapor_id == user.id)
    else:
        allowed_nis = _get_allowed_nis_subquery(db, user)
        if allowed_nis is not None:
            query = query.filter(models.Pelanggaran.nis_siswa.in_(allowed_nis))

    return query.all()


def _apply_prestasi_scope_filters(query, db: Session, user: schemas.User):
    """Menerapkan filter akses prestasi sesuai peran (admin, guru, wali)."""
    if user.role in {schemas.UserRole.ADMIN, schemas.UserRole.KEPALA_SEKOLAH}:
        return query

    if user.role == schemas.UserRole.GURU_UMUM:
        return query.filter(models.Prestasi.pencatat_id == user.id)

    allowed_nis = _get_allowed_nis_subquery(db, user)
    if allowed_nis is not None:
        return query.filter(models.Prestasi.nis_siswa.in_(allowed_nis))

    return query


def create_prestasi(db: Session, prestasi: schemas.PrestasiCreate, pencatat_id: str):
    """Membuat catatan prestasi baru dengan status awal submitted."""
    siswa = get_siswa_by_nis(db, prestasi.nis_siswa)
    if not siswa:
        raise ValueError("Siswa tidak ditemukan untuk NIS yang diberikan")
    if siswa.status_siswa != schemas.SiswaStatus.AKTIF.value:
        raise ValueError("Prestasi hanya dapat dicatat untuk siswa berstatus aktif")

    db_prestasi = models.Prestasi(
        **prestasi.model_dump(),
        status=schemas.PrestasiStatus.SUBMITTED.value,
        pencatat_id=pencatat_id,
        kelas_snapshot=siswa.id_kelas,
    )
    db.add(db_prestasi)
    db.commit()
    db.refresh(db_prestasi)
    return db_prestasi


def get_prestasi_by_id(db: Session, prestasi_id: str):
    """Mengambil detail prestasi berdasarkan ID."""
    return (
        db.query(models.Prestasi)
        .filter(models.Prestasi.id == prestasi_id)
        .first()
    )


def update_prestasi(
    db: Session,
    prestasi_id: str,
    prestasi_update: schemas.PrestasiUpdate,
) -> models.Prestasi | None:
    """Memperbarui konten prestasi yang sudah ada."""
    db_prestasi = get_prestasi_by_id(db, prestasi_id)
    if not db_prestasi:
        return None

    update_data = prestasi_update.model_dump(exclude_unset=True)
    if "nis_siswa" in update_data:
        siswa = get_siswa_by_nis(db, update_data["nis_siswa"])
        if not siswa:
            raise ValueError("Siswa tidak ditemukan untuk NIS yang diberikan")
        db_prestasi.kelas_snapshot = siswa.id_kelas
    for field, value in update_data.items():
        setattr(db_prestasi, field, value)

    db.commit()
    db.refresh(db_prestasi)
    return db_prestasi


def update_prestasi_status(
    db: Session,
    prestasi_id: str,
    status: schemas.PrestasiStatus,
    verifier_id: str | None = None,
):
    """Mengubah status verifikasi prestasi beserta informasi verifikator."""
    db_prestasi = get_prestasi_by_id(db, prestasi_id)
    if not db_prestasi:
        return None

    db_prestasi.status = status.value
    if status in (schemas.PrestasiStatus.VERIFIED, schemas.PrestasiStatus.REJECTED):
        db_prestasi.verifikator_id = verifier_id
        db_prestasi.verified_at = datetime.now(timezone.utc)
    else:
        db_prestasi.verifikator_id = None
        db_prestasi.verified_at = None

    db.commit()
    db.refresh(db_prestasi)
    return db_prestasi


def delete_prestasi(db: Session, prestasi_id: str) -> bool:
    """Menghapus catatan prestasi yang dipilih."""
    db_prestasi = get_prestasi_by_id(db, prestasi_id)
    if not db_prestasi:
        return False

    db.delete(db_prestasi)
    db.commit()
    return True


def get_prestasi(
    db: Session,
    user: schemas.User,
    *,
    status: schemas.PrestasiStatus | None = None,
    kategori: Optional[str] = None,
    tingkat: Optional[str] = None,
    nis: Optional[str] = None,
    kelas: Optional[str] = None,
    search: Optional[str] = None,
    limit: Optional[int] = None,
):
    """Mengambil daftar prestasi dengan filter opsional dan batas akses peran."""
    query = _apply_prestasi_scope_filters(db.query(models.Prestasi), db, user)

    if status is not None:
        query = query.filter(models.Prestasi.status == status.value)

    if kategori:
        query = query.filter(models.Prestasi.kategori == kategori)

    if tingkat:
        query = query.filter(models.Prestasi.tingkat == tingkat)

    if nis:
        query = query.filter(models.Prestasi.nis_siswa == nis)

    joined_siswa = False
    kelas_expr = func.coalesce(models.Prestasi.kelas_snapshot, models.Siswa.id_kelas)
    if kelas:
        if not joined_siswa:
            query = query.join(
                models.Siswa,
                models.Siswa.nis == models.Prestasi.nis_siswa,
            )
            joined_siswa = True
        query = query.filter(kelas_expr == kelas)

    if search:
        like_pattern = f"%{search.lower()}%"
        if not joined_siswa:
            query = query.outerjoin(models.Siswa, models.Siswa.nis == models.Prestasi.nis_siswa)
            joined_siswa = True
        query = query.filter(
            func.lower(models.Prestasi.judul).like(like_pattern)
            | func.lower(models.Prestasi.deskripsi).like(like_pattern)
            | func.lower(models.Prestasi.kategori).like(like_pattern)
            | func.lower(models.Prestasi.tingkat).like(like_pattern)
            | func.lower(models.Siswa.nama).like(like_pattern)
            | func.lower(kelas_expr).like(like_pattern)
        )

    query = query.order_by(models.Prestasi.tanggal_prestasi.desc(), models.Prestasi.created_at.desc())

    if limit is not None and limit > 0:
        query = query.limit(limit)

    return query.all()


def get_prestasi_summary(db: Session, user: schemas.User):
    """Menghasilkan ringkasan statistik prestasi sesuai cakupan akses pengguna."""
    base_query = _apply_prestasi_scope_filters(db.query(models.Prestasi), db, user)

    total_prestasi = base_query.count()
    verified_prestasi = base_query.filter(models.Prestasi.status == schemas.PrestasiStatus.VERIFIED.value).count()
    pending_prestasi = base_query.filter(models.Prestasi.status == schemas.PrestasiStatus.SUBMITTED.value).count()

    category_query = _apply_prestasi_scope_filters(
        db.query(
            models.Prestasi.kategori.label("kategori"),
            func.count(models.Prestasi.id).label("jumlah"),
        ).select_from(models.Prestasi),
        db,
        user,
    ).group_by(models.Prestasi.kategori)

    kategori_teratas = [
        {"kategori": row.kategori, "jumlah": row.jumlah}
        for row in category_query.order_by(func.count(models.Prestasi.id).desc()).all()
    ]

    kelas_snapshot_expr = func.coalesce(models.Prestasi.kelas_snapshot, models.Siswa.id_kelas)

    top_students_query = _apply_prestasi_scope_filters(
        db.query(
            models.Prestasi.nis_siswa.label("nis"),
            models.Siswa.nama.label("nama"),
            func.max(kelas_snapshot_expr).label("kelas"),
            func.count(models.Prestasi.id).label("total_prestasi"),
            func.sum(models.Prestasi.poin).label("total_poin"),
            func.sum(
                case(
                    (models.Prestasi.status == schemas.PrestasiStatus.VERIFIED.value, 1),
                    else_=0,
                )
            ).label("verified"),
        )
        .select_from(models.Prestasi)
        .join(models.Siswa, models.Siswa.nis == models.Prestasi.nis_siswa),
        db,
        user,
    )

    top_students = (
        top_students_query
        .group_by(models.Prestasi.nis_siswa, models.Siswa.nama)
        .order_by(func.coalesce(func.sum(models.Prestasi.poin), 0).desc(), func.count(models.Prestasi.id).desc())
        .limit(5)
        .all()
    )

    recent_query = _apply_prestasi_scope_filters(
        db.query(
            models.Prestasi,
            models.Siswa.nama.label("nama"),
            kelas_snapshot_expr.label("kelas"),
        )
        .join(models.Siswa, models.Siswa.nis == models.Prestasi.nis_siswa),
        db,
        user,
    )

    recent_achievements = (
        recent_query
        .order_by(models.Prestasi.tanggal_prestasi.desc(), models.Prestasi.created_at.desc())
        .limit(100)
        .all()
    )

    return {
        "total_prestasi": total_prestasi,
        "verified_prestasi": verified_prestasi,
        "pending_prestasi": pending_prestasi,
        "kategori_populer": kategori_teratas,
        "top_students": [
            {
                "nis": row.nis,
                "nama": row.nama,
                "kelas": row.kelas,
                "total_prestasi": row.total_prestasi,
                "total_poin": int(row.total_poin or 0),
                "verified": int(row.verified or 0),
            }
            for row in top_students
        ],
        "recent_achievements": [
            {
                "id": prestasi.id,
                "nis": prestasi.nis_siswa,
                "nama": nama,
                "kelas": kelas or prestasi.kelas_snapshot,
                "judul": prestasi.judul,
                "kategori": prestasi.kategori,
                "tingkat": prestasi.tingkat,
                "tanggal_prestasi": prestasi.tanggal_prestasi,
                "status": prestasi.status,
                "poin": prestasi.poin,
            }
            for prestasi, nama, kelas in recent_achievements
        ],
    }

def get_all_tahun_ajaran(db: Session):
    """Mengambil seluruh tahun ajaran terurut dari terbaru."""
    return db.query(models.TahunAjaran).order_by(
        models.TahunAjaran.tahun.desc(), models.TahunAjaran.semester.desc()
    ).all()

def create_tahun_ajaran(db: Session, tahun: schemas.TahunAjaranCreate):
    """Membuat tahun ajaran baru dan memastikan tidak ada duplikasi."""
    tahun_str = tahun.tahun.strip()
    semester_val = str(tahun.semester).strip()
    existing = (
        db.query(models.TahunAjaran)
        .filter(
            func.lower(models.TahunAjaran.tahun) == tahun_str.lower(),
            models.TahunAjaran.semester == semester_val,
        )
        .first()
    )
    if existing:
        raise ValueError("Tahun ajaran dengan semester tersebut sudah ada")
    if tahun.is_active:
        db.query(models.TahunAjaran).update({"is_active": False})
    payload = tahun.model_dump()
    payload["tahun"] = tahun_str
    payload["semester"] = semester_val
    db_tahun = models.TahunAjaran(**payload)
    db.add(db_tahun)
    db.commit()
    db.refresh(db_tahun)
    return db_tahun


def update_tahun_ajaran(db: Session, tahun_id: str, tahun_update: schemas.TahunAjaranUpdate):
    """Memperbarui data tahun ajaran serta menangani aktivasi tunggal."""
    db_tahun = db.query(models.TahunAjaran).filter(models.TahunAjaran.id == tahun_id).first()
    if not db_tahun:
        return None
    data = tahun_update.model_dump(exclude_unset=True)
    if "tahun" in data and data["tahun"] is not None:
        data["tahun"] = data["tahun"].strip()
    if "semester" in data and data["semester"] is not None:
        data["semester"] = str(data["semester"]).strip()
    new_tahun = (data.get("tahun", db_tahun.tahun) or "").strip()
    new_semester = (data.get("semester", db_tahun.semester) or "").strip()
    duplicate = (
        db.query(models.TahunAjaran)
        .filter(
            models.TahunAjaran.id != tahun_id,
            func.lower(models.TahunAjaran.tahun) == new_tahun.lower(),
            models.TahunAjaran.semester == new_semester,
        )
        .first()
    )
    if duplicate:
        raise ValueError("Tahun ajaran dengan semester tersebut sudah ada")
    if data.get('is_active'):
        db.query(models.TahunAjaran).update({"is_active": False})
    for field, value in data.items():
        setattr(db_tahun, field, value)
    db.commit()
    db.refresh(db_tahun)
    return db_tahun


def delete_tahun_ajaran(db: Session, tahun_id: str) -> bool:
    """Menghapus tahun ajaran tertentu jika tersedia."""
    db_tahun = db.query(models.TahunAjaran).filter(models.TahunAjaran.id == tahun_id).first()
    if not db_tahun:
        return False
    db.delete(db_tahun)
    db.commit()
    return True

LOCAL_TIMEZONE = timezone(timedelta(hours=7))


def _to_local(dt) -> datetime | None:
    """Mengonversi datetime ke zona waktu lokal (WIB)."""
    if dt is None:
        return None
    if not isinstance(dt, datetime):
        return None
    if dt.tzinfo is None:
        # Asumsikan waktu tanpa zona sudah dalam waktu lokal, bukan UTC
        return dt.replace(tzinfo=LOCAL_TIMEZONE)
    return dt.astimezone(LOCAL_TIMEZONE)


def get_config(db: Session, key: str) -> str | None:
    """Mengambil nilai konfigurasi sistem."""
    cfg = db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    return cfg.value if cfg else None

def set_config(db: Session, key: str, value: str):
    """Mengatur nilai konfigurasi sistem."""
    cfg = db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    if cfg:
        cfg.value = value
    else:
        cfg = models.SystemConfig(key=key, value=value)
        db.add(cfg)
    db.commit()
    return cfg

def get_guru_wali_access_list(db: Session):
    """Mengambil daftar ID user yang memiliki akses Guru Wali."""
    return [r.user_id for r in db.query(models.GuruWaliAccess).all()]

def set_guru_wali_access_list(db: Session, user_ids: List[str]):
    """Mengatur ulang daftar Guru Wali."""
    db.query(models.GuruWaliAccess).delete()
    for uid in user_ids:
        db.add(models.GuruWaliAccess(user_id=uid))
    db.commit()
    return user_ids

def is_guru_wali(db: Session, user_id: str) -> bool:
    """Memeriksa apakah user adalah Guru Wali."""
    return db.query(models.GuruWaliAccess).filter(models.GuruWaliAccess.user_id == user_id).first() is not None

def get_perwalian_by_teacher(db: Session, teacher_id: str):
    """Mengambil daftar perwalian seorang guru."""
    return db.query(models.Perwalian).filter(models.Perwalian.teacher_id == teacher_id).all()

def get_enriched_perwalian_students(db: Session, teacher_id: str):
    """Mengambil daftar siswa perwalian beserta statistik ringkas."""
    perwalian = db.query(models.Perwalian).filter(models.Perwalian.teacher_id == teacher_id).all()
    if not perwalian:
        return []
    
    niss = [p.nis_siswa for p in perwalian]
    if not niss:
        return []

    students = db.query(models.Siswa).filter(models.Siswa.nis.in_(niss)).all()
    
    results = []
    # Bulk aggregate might be better but iteration is fine for typical class size (30-40)
    for s in students:
        # Total violations
        v_count = db.query(models.Pelanggaran).filter(models.Pelanggaran.nis_siswa == s.nis).count()
        # Active violations
        v_active = db.query(models.Pelanggaran).filter(
            models.Pelanggaran.nis_siswa == s.nis,
            models.Pelanggaran.status != schemas.PelanggaranStatus.RESOLVED.value
        ).count()
        # Achievements
        a_count = db.query(models.Prestasi).filter(models.Prestasi.nis_siswa == s.nis).count()
        
        results.append({
            "nis": s.nis,
            "nama": s.nama,
            "id_kelas": s.id_kelas,
            "violation_count": v_count,
            "active_violation_count": v_active,
            "achievement_count": a_count
        })
    
    # Sort by name
    results.sort(key=lambda x: x["nama"])
    return results

def add_perwalian_student(db: Session, teacher_id: str, nis: str):
    """Menambahkan siswa ke perwalian guru."""
    # Check if student already has a guardian
    existing = db.query(models.Perwalian).filter(models.Perwalian.nis_siswa == nis).first()
    if existing:
        raise ValueError("Siswa sudah memiliki Guru Wali")
    
    # Check global config period
    period_active = get_config(db, "perwalian_period_active")
    if period_active != "true":
         raise ValueError("Periode perwalian sedang ditutup")

    perwalian = models.Perwalian(teacher_id=teacher_id, nis_siswa=nis)
    db.add(perwalian)
    db.commit()
    return perwalian

def remove_perwalian_student(db: Session, teacher_id: str, nis: str):
    """Menghapus siswa dari perwalian guru."""
    # Check global config period if we want to restrict removal too? User only said "admin mematikan -> tidak bisa menambahkan".
    # Assuming removal is allowed or restricted? Usually removal implies cleanup. Let's allow removal any time for now or restrict?
    # User said: "jika admin mematikan periode perwalian maka guru yang terpilih tidak bisa menambahkan siswa lagi dan menjadi wali dari siswa yang ditambahkan sebelumnya"
    # Doesn't explicitly forbid removing, but let's assume standard CRUD.
    
    perwalian = db.query(models.Perwalian).filter(models.Perwalian.teacher_id == teacher_id, models.Perwalian.nis_siswa == nis).first()
    if perwalian:
        db.delete(perwalian)
        db.commit()
        return True
    return False

def get_all_perwalian_stats(db: Session):
    """Statistik perwalian untuk admin."""
    # List of teachers with count of students
    teachers = db.query(models.User).join(models.GuruWaliAccess, models.User.id == models.GuruWaliAccess.user_id).all()
    stats = []
    for t in teachers:
        count = db.query(models.Perwalian).filter(models.Perwalian.teacher_id == t.id).count()
        stats.append({
            "teacher_id": t.id,
            "teacher_name": t.full_name,
            "student_count": count
        })
    return stats


def _to_utc(dt: datetime) -> datetime:
    """Memastikan datetime berada pada zona waktu UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=LOCAL_TIMEZONE).astimezone(timezone.utc)
    return dt.astimezone(timezone.utc)


def _get_user_scope_filter(db: Session, user: schemas.User):
    """Membangun fungsi filter dinamis untuk membatasi akses data pelanggaran."""
    def no_filter(query):
        return query

    # Cek apakah user memiliki akses sebagai Guru Wali
    extra_nis = []
    if is_guru_wali(db, user.id):
        perwalian = get_perwalian_by_teacher(db, user.id)
        extra_nis = [p.nis_siswa for p in perwalian]

    if user.role in {schemas.UserRole.ADMIN, schemas.UserRole.KEPALA_SEKOLAH}:
        return no_filter

    if user.role == schemas.UserRole.GURU_UMUM:
        def filter_guru_umum(query):
            criteria = [models.Pelanggaran.pelapor_id == user.id]
            if extra_nis:
                criteria.append(models.Pelanggaran.nis_siswa.in_(extra_nis))
            
            from sqlalchemy import or_
            return query.filter(or_(*criteria))
        return filter_guru_umum

    if user.role in {schemas.UserRole.WALI_KELAS, schemas.UserRole.GURU_BK}:
        allowed_nis = _get_allowed_nis_subquery(db, user)
        # Jika ada batasan peran standar ATAU siswa perwalian tambahan
        if allowed_nis is not None or extra_nis:
            def filter_scope(query):
                from sqlalchemy import or_
                conditions = []
                if allowed_nis is not None:
                    conditions.append(models.Pelanggaran.nis_siswa.in_(allowed_nis))
                if extra_nis:
                    conditions.append(models.Pelanggaran.nis_siswa.in_(extra_nis))
                
                if conditions:
                    return query.filter(or_(*conditions))
                return query
            return filter_scope

    return no_filter


COUNSELING_ALLOWED_ROLES = {
    schemas.UserRole.ADMIN,
    schemas.UserRole.KEPALA_SEKOLAH,
    schemas.UserRole.GURU_BK,
    schemas.UserRole.WALI_KELAS,
}

SEVERITY_LABELS = {
    "none": "Tidak ada pelanggaran",
    "ringan": "Pelanggaran Ringan",
    "sedang": "Pelanggaran Sedang",
    "berat": "Pelanggaran Berat",
}

VIOLATION_STATUS_LABELS = {
    schemas.PelanggaranStatus.REPORTED.value: "Dilaporkan",
    schemas.PelanggaranStatus.PROCESSED.value: "Diproses",
    schemas.PelanggaranStatus.RESOLVED.value: "Selesai",
}


def _normalize_severity(value: Optional[str]) -> str:
    """Menstandarkan label kategori pelanggaran menjadi lowercase sederhana."""
    if not value:
        return "ringan"
    return value.strip().lower()

def _calculate_effective_counts(ringan: int, sedang: int, berat: int) -> dict:
    """Mengonversi jumlah pelanggaran menjadi padanan eskalasi yang adil."""
    converted_sedang = sedang + (ringan // 10)
    converted_berat = berat + (converted_sedang // 5)
    return {
        "ringan": ringan,
        "sedang": sedang,
        "berat": berat,
        "ringan_remainder": ringan % 10,
        "sedang_equivalent": converted_sedang,
        "sedang_remainder": converted_sedang % 5,
        "berat_equivalent": converted_berat,
    }

def _determine_status_from_counts(counts: dict) -> str:
    """Menentukan level status berdasarkan hasil konversi pelanggaran."""
    if counts["berat_equivalent"] > 0:
        return "berat"
    if counts["sedang_equivalent"] > 0:
        return "sedang"
    if counts["ringan"] > 0:
        return "ringan"
    return "none"

def _ringan_recommendation(ringan: int) -> List[str]:
    """Memberikan rekomendasi pembinaan untuk pelanggaran ringan."""
    notes: List[str] = []
    if ringan <= 0:
        return notes
    if ringan < 5:
        notes.append(
            "Pembinaan guru mata pelajaran dengan catatan atau dokumentasi."
        )
    elif ringan == 5:
        notes.append(
            "laporan ke wali kelas dan pembinaan wali kelas tahap I."
        )
    elif 6 <= ringan <= 10:
        notes.append(
            "pembinaan wali kelas tahap II dan pembinaan BK."
        )
    else:
        notes.append(
            "pembinaan BK serta surat pernyataan diketahui orang tua."
        )
    return notes

def _sedang_recommendation(sedang_equivalent: int) -> List[str]:
    """Memberikan rekomendasi pembinaan untuk akumulasi pelanggaran sedang."""
    notes: List[str] = []
    if sedang_equivalent <= 0:
        return notes
    if sedang_equivalent < 3:
        notes.append(
            "Pembinaan wali kelas, tim ketertiban, dan BK."
        )
    elif sedang_equivalent == 3:
        notes.append(
            "3x pelanggaran sedang: panggilan orang tua I, pembinaan wali kelas, tim ketertiban, dan BK."
        )
    elif sedang_equivalent == 4:
        notes.append(
            "4x pelanggaran sedang: pembinaan wali kelas, tim ketertiban, BK, dan waka kesiswaan."
        )
    else:
        notes.append(
            "Lebih dari 4x pelanggaran sedang: panggilan orang tua II, pembinaan wali kelas, tim ketertiban, BK, dan waka kesiswaan disertai surat pernyataan."
        )
    return notes

def _berat_recommendation(has_direct_berat: bool) -> List[str]:
    """Memberikan rekomendasi tindakan untuk pelanggaran berat."""
    notes = [
        "Pelanggaran berat: panggilan orang tua III, skorsing (tahap I/II/III) dan surat pernyataan orang tua."
    ]
    if has_direct_berat:
        notes.append(
            "Jika pelanggaran terakhir berkategori berat, pertimbangkan skorsing tahap III atau pemindahan sekolah."
        )
    notes.append("Skorsing I = 3 hari, Skorsing II = 5 hari, Skorsing III = 10 hari.")
    return notes

def _build_student_violation_summaries(
    db: Session,
    user: schemas.User,
    target_nis: Optional[str] = None,
) -> List[dict]:
    """Menyusun ringkasan pelanggaran per siswa sesuai cakupan pengguna."""
    scope_filter = _get_user_scope_filter(db, user)
    base_query = (
        db.query(
            models.Pelanggaran.id.label("id"),
            models.Pelanggaran.nis_siswa.label("nis"),
            models.Pelanggaran.status.label("status"),
            models.Pelanggaran.waktu_kejadian.label("waktu"),
            models.Pelanggaran.created_at.label("created_at"),
            models.Pelanggaran.tempat.label("tempat"),
            models.Pelanggaran.detail_kejadian.label("detail"),
            models.Pelanggaran.catatan_pembinaan.label("catatan"),
            models.Pelanggaran.tindak_lanjut.label("tindak_lanjut"),
            models.JenisPelanggaran.nama_pelanggaran.label("jenis"),
            models.JenisPelanggaran.kategori.label("kategori"),
            models.Siswa.nama.label("nama"),
            func.coalesce(models.Pelanggaran.kelas_snapshot, models.Siswa.id_kelas).label("kelas"),
            models.Siswa.angkatan.label("angkatan"),
        )
        .join(models.Siswa, models.Siswa.nis == models.Pelanggaran.nis_siswa)
        .join(
            models.JenisPelanggaran,
            models.JenisPelanggaran.id == models.Pelanggaran.jenis_pelanggaran_id,
        )
    )
    if target_nis:
        base_query = base_query.filter(models.Pelanggaran.nis_siswa == target_nis)
    filtered_query = scope_filter(base_query)
    rows = filtered_query.order_by(models.Pelanggaran.created_at.desc()).all()
    summaries: dict[str, dict] = {}

    for row in rows:
        nis = row.nis
        severity = _normalize_severity(row.kategori)
        summary = summaries.get(nis)
        if not summary:
            summary = {
                "nis": nis,
                "nama": row.nama,
                "kelas": row.kelas,
                "angkatan": row.angkatan,
                "latest_violation": None,
                "active_counts": {"ringan": 0, "sedang": 0, "berat": 0},
                "effective_counts": {"ringan": 0, "sedang": 0, "berat": 0},
                "violations": [],
                "recommendations": [],
                "status_level": "none",
                "status_label": SEVERITY_LABELS["none"],
                "can_clear": False,
                "detail_restricted": False,
                "active_counts_hidden": False,
            }
            summaries[nis] = summary

        is_resolved = row.status == schemas.PelanggaranStatus.RESOLVED.value
        created_local = _to_local(row.created_at)
        local_time = _to_local(row.waktu) or created_local
        violation_payload = {
            "id": row.id,
            "kategori": severity,
            "jenis": row.jenis,
            "status": row.status,
            "status_display": VIOLATION_STATUS_LABELS.get(
                row.status, (row.status or "").replace("_", " ").title()
            ),
            "waktu": local_time.isoformat() if local_time else None,
            "tempat": row.tempat,
            "detail": row.detail,
            "catatan_pembinaan": row.catatan,
            "tindak_lanjut": row.tindak_lanjut,
            "created_at": (created_local.isoformat() if created_local else None),
            "is_resolved": is_resolved,
        }
        summary["violations"].append(violation_payload)

        if summary["latest_violation"] is None:
            summary["latest_violation"] = violation_payload

        if not is_resolved:
            if severity in summary["active_counts"]:
                summary["active_counts"][severity] += 1
            else:
                summary["active_counts"]["ringan"] += 1

    results: List[dict] = []
    for nis, summary in summaries.items():
        counts = _calculate_effective_counts(
            summary["active_counts"].get("ringan", 0),
            summary["active_counts"].get("sedang", 0),
            summary["active_counts"].get("berat", 0),
        )
        summary["effective_counts"] = counts
        status_level = _determine_status_from_counts(counts)
        summary["status_level"] = status_level
        summary["status_label"] = SEVERITY_LABELS.get(status_level, SEVERITY_LABELS["none"])

        recs: List[str] = []
        recs.extend(_ringan_recommendation(summary["active_counts"].get("ringan", 0)))
        recs.extend(_sedang_recommendation(counts["sedang_equivalent"]))
        if counts["berat_equivalent"] > 0:
            recs.extend(_berat_recommendation(summary["active_counts"].get("berat", 0) > 0))
        if not recs:
            recs.append("Tidak ada pelanggaran aktif. Tetap lakukan pemantauan preventif.")
        summary["recommendations"] = []
        for item in recs:
            if item not in summary["recommendations"]:
                summary["recommendations"].append(item)

        summary["can_clear"] = (
            status_level != "none"
            and summary["active_counts"]["ringan"] + summary["active_counts"]["sedang"] + summary["active_counts"]["berat"] > 0
            and user.role in COUNSELING_ALLOWED_ROLES
        )
        # Restriction for Guru Umum (unless they are Guru Wali)
        if user.role == schemas.UserRole.GURU_UMUM and not is_guru_wali(db, user.id):
            summary["detail_restricted"] = True
            summary["active_counts_hidden"] = True
            summary["violations"] = []
            summary["recommendations"] = []
            summary["latest_violation"] = None
            summary["can_clear"] = False
            summary["active_counts"] = {key: 0 for key in summary["active_counts"]}
            summary["effective_counts"] = {
                "ringan": 0,
                "sedang": 0,
                "berat": 0,
                "ringan_remainder": 0,
                "sedang_equivalent": 0,
                "sedang_remainder": 0,
                "berat_equivalent": 0,
            }

        results.append(summary)

    results.sort(
        key=lambda item: item["latest_violation"].get("created_at") if item["latest_violation"] else "",
        reverse=True,
    )
    return results

def apply_student_counseling(
    db: Session,
    user: schemas.User,
    nis: str,
    catatan: Optional[str] = None,
    status: Optional[schemas.PelanggaranStatus] = None,
) -> dict:
    """Memperbarui status pembinaan pelanggaran siswa sesuai otoritas pengguna."""
    if user.role not in COUNSELING_ALLOWED_ROLES:
        raise PermissionError("Tidak memiliki akses melakukan pembinaan")

    scope_filter = _get_user_scope_filter(db, user)
    violation_query = scope_filter(
        db.query(models.Pelanggaran)
        .filter(models.Pelanggaran.nis_siswa == nis)
    )

    if status is None:
        target_status_enum = schemas.PelanggaranStatus.PROCESSED
    else:
        if isinstance(status, str):
            try:
                target_status_enum = schemas.PelanggaranStatus(status)
            except ValueError as exc:
                raise ValueError("Status pembinaan tidak valid") from exc
        elif isinstance(status, schemas.PelanggaranStatus):
            target_status_enum = status
        else:
            raise ValueError("Status pembinaan tidak valid")

    if target_status_enum == schemas.PelanggaranStatus.REPORTED:
        target_status_enum = schemas.PelanggaranStatus.PROCESSED

    allowed_target_statuses = {
        schemas.PelanggaranStatus.PROCESSED,
        schemas.PelanggaranStatus.RESOLVED,
    }
    if target_status_enum not in allowed_target_statuses:
        raise ValueError("Status pembinaan tidak didukung")

    target_status = target_status_enum.value
    tindak_lanjut_map = {
        schemas.PelanggaranStatus.PROCESSED.value: "Pembinaan diproses",
        schemas.PelanggaranStatus.RESOLVED.value: "Pembinaan selesai",
    }
    updated = 0
    for violation in violation_query.all():
        current_status = violation.status or schemas.PelanggaranStatus.REPORTED.value
        if (
            target_status_enum == schemas.PelanggaranStatus.PROCESSED
            and current_status == schemas.PelanggaranStatus.RESOLVED.value
        ):
            continue

        changed = False
        if violation.status != target_status:
            violation.status = target_status
            changed = True
        if catatan:
            violation.catatan_pembinaan = catatan
            changed = True
        tindak_lanjut_value = tindak_lanjut_map.get(target_status, "Pembinaan")
        if violation.tindak_lanjut != tindak_lanjut_value:
            violation.tindak_lanjut = tindak_lanjut_value
            changed = True
        if changed:
            updated += 1
    if updated == 0:
        return {"updated": 0, "summary": None}
    db.commit()
    summaries = _build_student_violation_summaries(db, user, target_nis=nis)
    summary = summaries[0] if summaries else None
    return {"updated": updated, "summary": summary}

def get_dashboard_stats(
    db: Session, 
    user: schemas.User, 
    month: Optional[int] = None, 
    year: Optional[int] = None
):
    """Mengompilasi metrik utama dan grafik untuk halaman dashboard."""
    now_local = datetime.now(LOCAL_TIMEZONE)
    now_utc = now_local.astimezone(timezone.utc)
    total_siswa = db.query(func.count(models.Siswa.nis)).scalar()
    scope_filter = _get_user_scope_filter(db, user)
    base_query = db.query(models.Pelanggaran)
    filtered_query = scope_filter(base_query)

    # Statistik umum untuk pelanggaran ditampilkan tanpa filter role agar grafik tidak kosong
    total_pelanggaran = base_query.count()
    total_users = db.query(func.count(models.User.id)).scalar()
    total_kelas = db.query(func.count(models.Kelas.id)).scalar()

    thirty_days_ago = now_utc - timedelta(days=30)
    recent_violations = (
        base_query.filter(models.Pelanggaran.created_at >= thirty_days_ago).count()
    )

    # Determine date range
    if month and year:
        target_month = month
        target_year = year
    else:
        target_month = now_local.month
        target_year = now_local.year

    # 1st day of target month
    window_start_local = datetime(target_year, target_month, 1, 0, 0, 0, tzinfo=LOCAL_TIMEZONE)
    
    # End of target month
    last_day = calendar.monthrange(target_year, target_month)[1]
    window_end_local = window_start_local + timedelta(days=last_day) # 1st of next month approx logic (actually start + duration)
    
    window_start_utc = _to_utc(window_start_local)
    window_end_utc = _to_utc(window_end_local)

    # Grafik pelanggaran tidak difilter berdasarkan role
    chart_query = base_query
    chart_total = chart_query.count()

    monthly_records = (
        chart_query
        .filter(
            models.Pelanggaran.created_at >= window_start_utc,
            models.Pelanggaran.created_at < window_end_utc,
        )
        .all()
    )

    today_date = now_local.day
    if target_month == now_local.month and target_year == now_local.year:
        num_days = today_date
    else:
        num_days = last_day

    day_buckets = [window_start_local + timedelta(days=offset) for offset in range(num_days)]
    monthly_counts_map = {bucket.date(): 0 for bucket in day_buckets}
    for record in monthly_records:
        # Get event time from the Pelanggaran object
        event_time = record.waktu_kejadian or record.created_at
        if event_time is None:
            continue
        local_time = _to_local(event_time)
        if local_time is None:
            continue
        event_date = local_time.date()
        if event_date in monthly_counts_map:
            monthly_counts_map[event_date] += 1

    monthly_violation_chart = [
        {
            "label": bucket.strftime("%d"),
            "count": monthly_counts_map[bucket.date()],
            "date": bucket.date().isoformat(),
        }
        for bucket in day_buckets
    ]

    # Removed fallback logic to ensure strict month view

    # Achievement Chart
    achievement_query = _apply_prestasi_scope_filters(
        db.query(models.Prestasi),
        db,
        user,
    )

    achievement_records = (
        achievement_query
        .filter(
            models.Prestasi.tanggal_prestasi >= window_start_local.date(),
            models.Prestasi.tanggal_prestasi <= (window_end_local - timedelta(days=1)).date(),
        )
        .all()
    )

    achievement_counts_map = {bucket.date(): 0 for bucket in day_buckets}
    for record in achievement_records:
        # Get achievement date from the Prestasi object
        achievement_date = record.tanggal_prestasi
        if achievement_date is None:
            continue

        # Convert to date if it's a datetime
        if isinstance(achievement_date, datetime):
            achievement_date = achievement_date.date()

        if achievement_date in achievement_counts_map:
            achievement_counts_map[achievement_date] += 1

    monthly_achievement_chart = [
        {
            "label": bucket.strftime("%d"),
            "count": achievement_counts_map[bucket.date()],
            "date": bucket.date().isoformat(),
        }
        for bucket in day_buckets
    ]

    today_start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end_local = today_start_local + timedelta(days=1)
    today_start_utc = _to_utc(today_start_local)
    today_end_utc = _to_utc(today_end_local)

    todays_base = (
        db.query(
            models.Pelanggaran.id.label("id"),
            models.Siswa.nis.label("nis"),
            models.Siswa.nama.label("nama"),
            func.coalesce(models.Pelanggaran.kelas_snapshot, models.Siswa.id_kelas).label("kelas"),
            models.JenisPelanggaran.nama_pelanggaran.label("pelanggaran"),
            models.Pelanggaran.waktu_kejadian.label("waktu"),
            models.Pelanggaran.created_at.label("created_at"),
            models.Pelanggaran.tempat.label("tempat"),
            models.Pelanggaran.status.label("status"),
        )
        .join(models.Siswa, models.Siswa.nis == models.Pelanggaran.nis_siswa)
        .join(
            models.JenisPelanggaran,
            models.JenisPelanggaran.id == models.Pelanggaran.jenis_pelanggaran_id,
        )
        .filter(
            models.Pelanggaran.created_at >= today_start_utc,
            models.Pelanggaran.created_at < today_end_utc,
        )
    )

    todays_violations_query = scope_filter(todays_base).order_by(models.Pelanggaran.waktu_kejadian.desc())

    todays_violations = []
    for item in todays_violations_query:
        mapping = item._mapping if isinstance(item, Row) else None
        waktu = None
        created_at = None
        if mapping is not None:
            waktu = mapping.get("waktu")
            created_at = mapping.get("created_at")
        else:
            waktu = getattr(item, "waktu", None)
            created_at = getattr(item, "created_at", None)

        display_time = _to_local(waktu) or _to_local(created_at)

        todays_violations.append(
            {
                "id": item.id,
                "nis": item.nis,
                "nama": item.nama,
                "kelas": getattr(item, "kelas", None),
                "pelanggaran": item.pelanggaran,
                "waktu": display_time.isoformat() if display_time else None,
                "tempat": item.tempat,
                "status": item.status,
            }
        )

    recent_violation_base = (
        db.query(
            models.Pelanggaran.id.label("id"),
            models.Siswa.nis.label("nis"),
            models.Siswa.nama.label("nama"),
            func.coalesce(models.Pelanggaran.kelas_snapshot, models.Siswa.id_kelas).label("kelas"),
            models.JenisPelanggaran.nama_pelanggaran.label("pelanggaran"),
            models.Pelanggaran.waktu_kejadian.label("waktu"),
            models.Pelanggaran.created_at.label("created_at"),
            models.Pelanggaran.tempat.label("tempat"),
            models.Pelanggaran.status.label("status"),
        )
        .join(models.Siswa, models.Siswa.nis == models.Pelanggaran.nis_siswa)
        .join(
            models.JenisPelanggaran,
            models.JenisPelanggaran.id == models.Pelanggaran.jenis_pelanggaran_id,
        )
        .filter(models.Pelanggaran.created_at >= thirty_days_ago)
    )

    recent_violation_query = (
        scope_filter(recent_violation_base)
        .order_by(models.Pelanggaran.created_at.desc())
        .limit(200)
    )

    recent_violation_records = []
    for item in recent_violation_query:
        mapping = item._mapping if isinstance(item, Row) else None
        waktu = None
        created_at = None
        if mapping is not None:
            waktu = mapping.get("waktu")
            created_at = mapping.get("created_at")
        else:
            waktu = getattr(item, "waktu", None)
            created_at = getattr(item, "created_at", None)

        display_time = _to_local(waktu) or _to_local(created_at)

        recent_violation_records.append(
            {
                "id": item.id,
                "nis": item.nis,
                "nama": item.nama,
                "kelas": getattr(item, "kelas", None),
                "pelanggaran": item.pelanggaran,
                "waktu": display_time.isoformat() if display_time else None,
                "tempat": item.tempat,
                "status": item.status,
            }
        )

    prestasi_summary = get_prestasi_summary(db, user)
    student_violation_summaries = _build_student_violation_summaries(db, user)
    total_events = total_pelanggaran + prestasi_summary["total_prestasi"]
    positivity_ratio = 0.0
    if total_events > 0:
        positivity_ratio = round(
            (prestasi_summary["total_prestasi"] / total_events) * 100,
            2,
        )

    return {
        "total_siswa": total_siswa,
        "total_pelanggaran": total_pelanggaran,
        "total_users": total_users,
        "total_kelas": total_kelas,
        "recent_violations": recent_violations,
        "monthly_violation_chart": monthly_violation_chart,
        "todays_violations": todays_violations,
        "recent_violation_records": recent_violation_records,
        "student_violation_summaries": student_violation_summaries,
        "prestasi_summary": prestasi_summary,
        "monthly_achievement_chart": monthly_achievement_chart,
        "positivity_ratio": positivity_ratio,
    }


def _guess_tingkat(nama_kelas: str) -> str:
    """Menerka tingkat kelas (misal 10/11/12) dari nama kelas."""
    digits = ''.join(ch for ch in nama_kelas if ch.isdigit())
    if len(digits) >= 2:
        return digits[:2]
    if digits:
        return digits
    return '10'


def _sync_kelas_from_student(db: Session, siswa: schemas.SiswaCreate):
    """Memastikan data kelas siswa terhubung dengan master kelas yang ada."""
    kelas_name = siswa.id_kelas.strip()
    if not kelas_name:
        return

    kelas_name_upper = kelas_name.upper()
    kelas = (
        db.query(models.Kelas)
        .filter(func.upper(models.Kelas.nama_kelas) == kelas_name_upper)
        .first()
    )

    if not kelas:
        raise ValueError(f"Kelas '{kelas_name_upper}' belum terdaftar di master data")

    updated = False
    if kelas.nama_kelas != kelas_name_upper:
        kelas.nama_kelas = kelas_name_upper
        updated = True
    if not kelas.tahun_ajaran and siswa.angkatan:
        kelas.tahun_ajaran = str(siswa.angkatan).strip()
        updated = True
    if updated:
        db.flush()
