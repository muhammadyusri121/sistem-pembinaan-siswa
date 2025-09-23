from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey, Date
from sqlalchemy.sql import func
import uuid
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nip = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    kelas_binaan = Column(String, nullable=True)
    angkatan_binaan = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Siswa(Base):
    __tablename__ = "siswa"
    nis = Column(String, primary_key=True, index=True)
    nama = Column(String, nullable=False)
    id_kelas = Column(String, nullable=False)
    angkatan = Column(String, nullable=False)
    jenis_kelamin = Column(String, nullable=False)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Kelas(Base):
    __tablename__ = "kelas"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nama_kelas = Column(String, nullable=False)
    tingkat = Column(String, nullable=False)
    wali_kelas_nip = Column(String, ForeignKey("users.nip"), nullable=True)
    tahun_ajaran = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class JenisPelanggaran(Base):
    __tablename__ = "jenis_pelanggaran"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nama_pelanggaran = Column(String, nullable=False)
    kategori = Column(String, nullable=False)
    poin = Column(Integer, nullable=False)
    deskripsi = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Pelanggaran(Base):
    __tablename__ = "pelanggaran"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nis_siswa = Column(String, ForeignKey("siswa.nis"), nullable=False)
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
    __tablename__ = "prestasi"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nis_siswa = Column(String, ForeignKey("siswa.nis"), nullable=False, index=True)
    pencatat_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    judul = Column(String, nullable=False)
    kategori = Column(String, nullable=False)
    tingkat = Column(String, nullable=True)
    deskripsi = Column(Text, nullable=True)
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
    __tablename__ = "tahun_ajaran"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tahun = Column(String, nullable=False)
    semester = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
