"""Definisi model ORM SQLAlchemy untuk domain Sistem Pembinaan Siswa."""

from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Integer,
    Text,
    ForeignKey,
    Date,
    UniqueConstraint,
)
from sqlalchemy.sql import func
from sqlalchemy.types import TypeDecorator
import uuid
import json
from .database import Base


class JSONList(TypeDecorator):
    """Type decorator to persist Python lists as JSON strings."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value in (None, ""):
            return None
        if isinstance(value, str):
            return value
        try:
            return json.dumps(value)
        except (TypeError, ValueError):
            return json.dumps(list(value))

    def process_result_value(self, value, dialect):
        if value in (None, ""):
            return []
        if isinstance(value, list):
            return value
        try:
            data = json.loads(value)
            if isinstance(data, list):
                return data
            return [data]
        except (TypeError, ValueError, json.JSONDecodeError):
            return [value]

class User(Base):
    """Representasi akun pengguna aplikasi beserta peran dan kelas binaan."""
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nip = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    kelas_binaan = Column(JSONList, nullable=True)
    angkatan_binaan = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Siswa(Base):
    """Data pokok siswa termasuk kelas dan status keaktifan."""
    __tablename__ = "siswa"
    nis = Column(String, primary_key=True, index=True)
    nama = Column(String, nullable=False)
    id_kelas = Column(String, nullable=False)
    angkatan = Column(String, nullable=False)
    jenis_kelamin = Column(String, nullable=False)
    aktif = Column(Boolean, default=True)
    status_siswa = Column(String, nullable=False, default="aktif")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RiwayatKelas(Base):
    """Riwayat perubahan kelas siswa per tahun ajaran."""
    __tablename__ = "riwayat_kelas"
    __table_args__ = (UniqueConstraint("nis", "tahun_ajaran", name="uq_riwayat_kelas_nis_tahun"),)

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nis = Column(String, ForeignKey("siswa.nis"), nullable=False, index=True)
    tahun_ajaran = Column(String, nullable=False, index=True)
    kelas = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Kelas(Base):
    """Master kelas yang menyimpan nama kelas, tingkat, dan wali."""
    __tablename__ = "kelas"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nama_kelas = Column(String, nullable=False)
    tingkat = Column(String, nullable=False)
    wali_kelas_nip = Column(String, ForeignKey("users.nip"), nullable=True)
    tahun_ajaran = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class JenisPelanggaran(Base):
    """Referensi jenis pelanggaran beserta kategori dan poin pelanggaran."""
    __tablename__ = "jenis_pelanggaran"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nama_pelanggaran = Column(String, nullable=False)
    kategori = Column(String, nullable=False)
    poin = Column(Integer, nullable=False)
    deskripsi = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Pelanggaran(Base):
    """Catatan pelanggaran siswa lengkap dengan status tindak lanjut."""
    __tablename__ = "pelanggaran"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nis_siswa = Column(String, ForeignKey("siswa.nis"), nullable=False)
    kelas_snapshot = Column(String, nullable=True)
    jenis_pelanggaran_id = Column(String, ForeignKey("jenis_pelanggaran.id"), nullable=False)
    pelapor_id = Column(String, ForeignKey("users.id"), nullable=False)
    waktu_kejadian = Column(DateTime, nullable=False)
    tempat = Column(String, nullable=False)
    detail_kejadian = Column(Text, nullable=False)
    bukti_foto = Column(String, nullable=True)
    status = Column(String, default="reported")
    catatan_pembinaan = Column(Text, nullable=True)
    tindak_lanjut = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Prestasi(Base):
    """Pencatatan prestasi siswa untuk kebutuhan apresiasi dan verifikasi."""
    __tablename__ = "prestasi"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nis_siswa = Column(String, ForeignKey("siswa.nis"), nullable=False, index=True)
    kelas_snapshot = Column(String, nullable=True)
    pencatat_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    judul = Column(String, nullable=False)
    kategori = Column(String, nullable=False)
    tingkat = Column(String, nullable=True)
    # deskripsi has been removed
    poin = Column(Integer, default=0)
    tanggal_prestasi = Column(Date, nullable=False)
    bukti = Column(String, nullable=True)
    pemberi_penghargaan = Column(String, nullable=True)
    status = Column(String, default="submitted", nullable=False, index=True)
    verifikator_id = Column(String, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class TahunAjaran(Base):
    """Master tahun ajaran yang mendukung penjadwalan akademik."""
    __tablename__ = "tahun_ajaran"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tahun = Column(String, nullable=False)
    semester = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
