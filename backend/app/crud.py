from sqlalchemy.orm import Session
from sqlalchemy import func, case
from sqlalchemy.engine import Row
from datetime import datetime, timedelta, timezone
from typing import Optional, List


def _kelas_list(value) -> List[str]:
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
    user.kelas_binaan = kelas if kelas else []


def _add_kelas_to_user(user, kelas_name: str):
    kelas_name = (kelas_name or "").strip()
    if not kelas_name:
        return
    kelas_list = _kelas_list(user.kelas_binaan)
    if kelas_name not in kelas_list:
        kelas_list.append(kelas_name)
    _set_user_kelas(user, kelas_list)


def _remove_kelas_from_user(user, kelas_name: str):
    kelas_list = [name for name in _kelas_list(user.kelas_binaan) if name != kelas_name]
    _set_user_kelas(user, kelas_list)

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
    kelas_binaan = user.kelas_binaan if user.role == schemas.UserRole.WALI_KELAS else []
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
        db_user.role = user_update.role.value
        current_role = db_user.role
        if user_update.role != schemas.UserRole.WALI_KELAS:
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
        if old_wali:
            _remove_kelas_from_user(old_wali, kelas.nama_kelas)

    if wali_kelas_nip:
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
    old_nama = db_kelas.nama_kelas
    if "wali_kelas_nip" in data:
        wali_kelas_nip = data.pop("wali_kelas_nip")
    for field, value in data.items():
        setattr(db_kelas, field, value)
    if kelas_update.wali_kelas_nip is not None:
        _assign_wali_kelas(db, db_kelas, wali_kelas_nip)
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

def _get_allowed_nis_subquery(db: Session, user: schemas.User):
    if user.role == schemas.UserRole.WALI_KELAS and user.kelas_binaan:
        kelas_list = _kelas_list(user.kelas_binaan)
        if kelas_list:
            return (
                db.query(models.Siswa.nis)
                .filter(models.Siswa.id_kelas.in_(kelas_list))
                .subquery()
            )
    if user.role == schemas.UserRole.GURU_BK and user.angkatan_binaan:
        return (
            db.query(models.Siswa.nis)
            .filter(models.Siswa.angkatan == user.angkatan_binaan)
            .subquery()
        )
    return None


def get_pelanggaran(db: Session, user: schemas.User):
    query = db.query(models.Pelanggaran)

    if user.role == schemas.UserRole.GURU_UMUM:
        query = query.filter(models.Pelanggaran.pelapor_id == user.id)
    else:
        allowed_nis = _get_allowed_nis_subquery(db, user)
        if allowed_nis is not None:
            query = query.filter(models.Pelanggaran.nis_siswa.in_(allowed_nis))

    return query.all()


def _apply_prestasi_scope_filters(query, db: Session, user: schemas.User):
    if user.role == schemas.UserRole.ADMIN or user.role == schemas.UserRole.KEPALA_SEKOLAH or user.role == schemas.UserRole.WAKIL_KEPALA_SEKOLAH:
        return query

    if user.role == schemas.UserRole.GURU_UMUM:
        return query.filter(models.Prestasi.pencatat_id == user.id)

    allowed_nis = _get_allowed_nis_subquery(db, user)
    if allowed_nis is not None:
        return query.filter(models.Prestasi.nis_siswa.in_(allowed_nis))

    return query


def create_prestasi(db: Session, prestasi: schemas.PrestasiCreate, pencatat_id: str):
    db_prestasi = models.Prestasi(
        **prestasi.model_dump(),
        status=schemas.PrestasiStatus.SUBMITTED.value,
        pencatat_id=pencatat_id,
    )
    db.add(db_prestasi)
    db.commit()
    db.refresh(db_prestasi)
    return db_prestasi


def get_prestasi_by_id(db: Session, prestasi_id: str):
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
    db_prestasi = get_prestasi_by_id(db, prestasi_id)
    if not db_prestasi:
        return None

    update_data = prestasi_update.model_dump(exclude_unset=True)
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
    if kelas:
        query = query.join(
            models.Siswa,
            models.Siswa.nis == models.Prestasi.nis_siswa,
        ).filter(models.Siswa.id_kelas == kelas)
        joined_siswa = True

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
        )

    query = query.order_by(models.Prestasi.tanggal_prestasi.desc(), models.Prestasi.created_at.desc())

    if limit is not None and limit > 0:
        query = query.limit(limit)

    return query.all()


def get_prestasi_summary(db: Session, user: schemas.User):
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

    top_students_query = _apply_prestasi_scope_filters(
        db.query(
            models.Prestasi.nis_siswa.label("nis"),
            models.Siswa.nama.label("nama"),
            models.Siswa.id_kelas.label("kelas"),
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
        .group_by(models.Prestasi.nis_siswa, models.Siswa.nama, models.Siswa.id_kelas)
        .order_by(func.coalesce(func.sum(models.Prestasi.poin), 0).desc(), func.count(models.Prestasi.id).desc())
        .limit(5)
        .all()
    )

    recent_query = _apply_prestasi_scope_filters(
        db.query(
            models.Prestasi,
            models.Siswa.nama.label("nama"),
            models.Siswa.id_kelas.label("kelas"),
        )
        .join(models.Siswa, models.Siswa.nis == models.Prestasi.nis_siswa),
        db,
        user,
    )

    recent_achievements = (
        recent_query
        .order_by(models.Prestasi.tanggal_prestasi.desc(), models.Prestasi.created_at.desc())
        .limit(6)
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
                "kelas": kelas,
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
    return db.query(models.TahunAjaran).order_by(
        models.TahunAjaran.tahun.desc(), models.TahunAjaran.semester.desc()
    ).all()

def create_tahun_ajaran(db: Session, tahun: schemas.TahunAjaranCreate):
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
    db_tahun = db.query(models.TahunAjaran).filter(models.TahunAjaran.id == tahun_id).first()
    if not db_tahun:
        return False
    db.delete(db_tahun)
    db.commit()
    return True

LOCAL_TIMEZONE = timezone(timedelta(hours=7))


def _to_local(dt) -> datetime | None:
    if dt is None:
        return None
    if not isinstance(dt, datetime):
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc).astimezone(LOCAL_TIMEZONE)
    return dt.astimezone(LOCAL_TIMEZONE)


def _to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=LOCAL_TIMEZONE).astimezone(timezone.utc)
    return dt.astimezone(timezone.utc)


def _get_user_scope_filter(db: Session, user: schemas.User):
    def no_filter(query):
        return query

    if user.role == schemas.UserRole.ADMIN or user.role == schemas.UserRole.KEPALA_SEKOLAH or user.role == schemas.UserRole.WAKIL_KEPALA_SEKOLAH:
        return no_filter

    if user.role == schemas.UserRole.GURU_UMUM:
        def filter_guru_umum(query):
            return query.filter(models.Pelanggaran.pelapor_id == user.id)
        return filter_guru_umum

    if user.role == schemas.UserRole.WALI_KELAS and user.kelas_binaan:
        kelas_list = _kelas_list(user.kelas_binaan)
        if kelas_list:
            allowed_nis = (
                db.query(models.Siswa.nis)
                .filter(models.Siswa.id_kelas.in_(kelas_list))
                .subquery()
            )

            def filter_wali(query):
                return query.filter(models.Pelanggaran.nis_siswa.in_(allowed_nis))

            return filter_wali

    if user.role == schemas.UserRole.GURU_BK and user.angkatan_binaan:
        allowed_nis = (
            db.query(models.Siswa.nis)
            .filter(models.Siswa.angkatan == user.angkatan_binaan)
            .subquery()
        )

        def filter_bk(query):
            return query.filter(models.Pelanggaran.nis_siswa.in_(allowed_nis))
        return filter_bk

    return no_filter


COUNSELING_ALLOWED_ROLES = {
    schemas.UserRole.ADMIN,
    schemas.UserRole.KEPALA_SEKOLAH,
    schemas.UserRole.WAKIL_KEPALA_SEKOLAH,
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
    if not value:
        return "ringan"
    return value.strip().lower()

def _calculate_effective_counts(ringan: int, sedang: int, berat: int) -> dict:
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
    if counts["berat_equivalent"] > 0:
        return "berat"
    if counts["sedang_equivalent"] > 0:
        return "sedang"
    if counts["ringan"] > 0:
        return "ringan"
    return "none"

def _ringan_recommendation(ringan: int) -> List[str]:
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
            models.Siswa.id_kelas.label("kelas"),
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
        if user.role == schemas.UserRole.GURU_UMUM:
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

def get_dashboard_stats(db: Session, user: schemas.User):
    now_local = datetime.now(LOCAL_TIMEZONE)
    now_utc = now_local.astimezone(timezone.utc)
    total_siswa = db.query(func.count(models.Siswa.nis)).scalar()
    scope_filter = _get_user_scope_filter(db, user)
    base_query = db.query(models.Pelanggaran)
    filtered_query = scope_filter(base_query)

    total_pelanggaran = filtered_query.count()
    total_users = db.query(func.count(models.User.id)).scalar()
    total_kelas = db.query(func.count(models.Kelas.id)).scalar()

    thirty_days_ago = now_utc - timedelta(days=30)
    recent_violations = (
        scope_filter(db.query(models.Pelanggaran.id))
        .filter(models.Pelanggaran.created_at >= thirty_days_ago)
        .count()
    )

    window_start_local = (now_local - timedelta(days=29)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    window_end_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)

    window_start_utc = _to_utc(window_start_local)
    window_end_utc = _to_utc(window_end_local)

    monthly_records = (
        scope_filter(db.query(models.Pelanggaran))
        .filter(
            models.Pelanggaran.created_at >= window_start_utc,
            models.Pelanggaran.created_at < window_end_utc,
        )
        .all()
    )

    day_buckets = [window_start_local + timedelta(days=offset) for offset in range(30)]
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

    if monthly_records:
        monthly_violation_chart = [
            {
                "label": bucket.strftime("%d"),
                "count": monthly_counts_map[bucket.date()],
                "date": bucket.date().isoformat(),
            }
            for bucket in day_buckets
        ]
    else:
        fallback_records = (
            scope_filter(db.query(models.Pelanggaran))
            .order_by(models.Pelanggaran.created_at.desc())
            .limit(60)
            .all()
        )

        fallback_counts = {}
        for record in fallback_records:
            # Get event time from the Pelanggaran object
            event_time = record.waktu_kejadian or record.created_at
            if event_time is None:
                continue
            local_time = _to_local(event_time)
            if local_time is None:
                continue
            event_date = local_time.date()
            fallback_counts[event_date] = fallback_counts.get(event_date, 0) + 1

        fallback_dates = sorted(fallback_counts.keys())[-30:]
        monthly_violation_chart = [
            {
                "label": date.strftime("%d"),
                "count": fallback_counts[date],
                "date": date.isoformat(),
            }
            for date in fallback_dates
        ]

    achievement_query = _apply_prestasi_scope_filters(
        db.query(models.Prestasi),
        db,
        user,
    )

    achievement_records = (
        achievement_query
        .filter(
            models.Prestasi.tanggal_prestasi >= window_start_local.date(),
            models.Prestasi.tanggal_prestasi <= now_local.date(),
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

    if achievement_records:
        monthly_achievement_chart = [
            {
                "label": bucket.strftime("%d"),
                "count": achievement_counts_map[bucket.date()],
                "date": bucket.date().isoformat(),
            }
            for bucket in day_buckets
        ]
    else:
        fallback_prestasi = (
            _apply_prestasi_scope_filters(
                db.query(models.Prestasi)
                .order_by(models.Prestasi.tanggal_prestasi.desc())
                .limit(60),
                db,
                user,
            )
            .all()
        )

        fallback_counts = {}
        for record in fallback_prestasi:
            # Get achievement date from the Prestasi object
            tanggal = record.tanggal_prestasi
            if tanggal is None:
                continue
            if isinstance(tanggal, datetime):
                tanggal = tanggal.date()
            fallback_counts[tanggal] = fallback_counts.get(tanggal, 0) + 1

        fallback_dates = sorted(fallback_counts.keys())[-30:]
        monthly_achievement_chart = [
            {
                "label": date.strftime("%d"),
                "count": fallback_counts[date],
                "date": date.isoformat(),
            }
            for date in fallback_dates
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
            models.Siswa.id_kelas.label("kelas"),
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
                "kelas": item.kelas,
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
