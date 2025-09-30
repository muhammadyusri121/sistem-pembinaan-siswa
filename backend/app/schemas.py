from pydantic import BaseModel, Field, EmailStr, constr, validator
from typing import Optional, List, Dict, Any
import uuid
from datetime import datetime, date
from enum import Enum

class OrmConfig:
    from_attributes = True

class UserRole(str, Enum):
    ADMIN = "admin"
    KEPALA_SEKOLAH = "kepala_sekolah"
    WAKIL_KEPALA_SEKOLAH = "wakil_kepala_sekolah"
    WALI_KELAS = "wali_kelas"
    GURU_BK = "guru_bk"
    GURU_UMUM = "guru_umum"


class PelanggaranStatus(str, Enum):
    REPORTED = "reported"
    PROCESSED = "processed"
    RESOLVED = "resolved"


class PrestasiStatus(str, Enum):
    SUBMITTED = "submitted"
    VERIFIED = "verified"
    REJECTED = "rejected"

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    nip: str | None = None

NipStr = constr(pattern=r'^\d+$', min_length=1)


class UserBase(BaseModel):
    nip: NipStr
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool = True
    kelas_binaan: Optional[str] = None
    angkatan_binaan: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    created_at: datetime
    
    class Config(OrmConfig):
        pass

class UserUpdate(BaseModel):
    nip: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    kelas_binaan: Optional[str] = None
    angkatan_binaan: Optional[str] = None

    @validator("nip")
    def validate_nip(cls, v):
        if v is None:
            return v
        if not v.isdigit():
            raise ValueError("NIP harus berupa angka")
        return v


class UserProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)

class SiswaBase(BaseModel):
    nis: str
    nama: str
    id_kelas: str
    angkatan: str
    jenis_kelamin: str
    aktif: bool = True

class SiswaCreate(SiswaBase):
    pass

class Siswa(SiswaBase):
    created_at: datetime
    class Config(OrmConfig):
        pass

class SiswaUpdate(BaseModel):
    nama: Optional[str] = None
    id_kelas: Optional[str] = None
    angkatan: Optional[str] = None
    jenis_kelamin: Optional[str] = None
    aktif: Optional[bool] = None

class KelasBase(BaseModel):
    nama_kelas: str
    tingkat: str
    wali_kelas_nip: Optional[str] = None
    tahun_ajaran: str

class KelasCreate(KelasBase):
    pass

class KelasUpdate(BaseModel):
    nama_kelas: Optional[str] = None
    tingkat: Optional[str] = None
    wali_kelas_nip: Optional[str] = None
    tahun_ajaran: Optional[str] = None

class Kelas(KelasBase):
    id: str
    created_at: datetime
    wali_kelas_name: Optional[str] = None
    class Config(OrmConfig):
        pass

class JenisPelanggaranBase(BaseModel):
    nama_pelanggaran: str
    kategori: str
    poin: int
    deskripsi: Optional[str] = None

class JenisPelanggaranCreate(JenisPelanggaranBase):
    pass

class JenisPelanggaranUpdate(BaseModel):
    nama_pelanggaran: Optional[str] = None
    kategori: Optional[str] = None
    poin: Optional[int] = None
    deskripsi: Optional[str] = None

class JenisPelanggaran(JenisPelanggaranBase):
    id: str
    created_at: datetime
    class Config(OrmConfig):
        pass

class PelanggaranBase(BaseModel):
    nis_siswa: str
    jenis_pelanggaran_id: str
    waktu_kejadian: datetime
    tempat: str
    detail_kejadian: str
    bukti_foto: Optional[str] = None

class PelanggaranCreate(PelanggaranBase):
    pass

class Pelanggaran(PelanggaranBase):
    id: str
    pelapor_id: str
    status: PelanggaranStatus
    catatan_pembinaan: Optional[str] = None
    tindak_lanjut: Optional[str] = None
    created_at: datetime
    class Config(OrmConfig):
        pass


class PelanggaranStatusUpdate(BaseModel):
    status: PelanggaranStatus


class PembinaanRequest(BaseModel):
    catatan: Optional[str] = None


class StudentViolationSummary(BaseModel):
    nis: str
    nama: str
    kelas: Optional[str] = None
    angkatan: Optional[str] = None
    status_level: str
    status_label: str
    latest_violation: Optional[Dict[str, Any]] = None
    active_counts: Dict[str, int] = Field(default_factory=dict)
    effective_counts: Dict[str, int] = Field(default_factory=dict)
    recommendations: List[str] = Field(default_factory=list)
    violations: Optional[List[Dict[str, Any]]] = None
    can_clear: bool = False
    detail_restricted: bool = False
    active_counts_hidden: bool = False


class PembinaanResponse(BaseModel):
    updated: int
    summary: Optional[StudentViolationSummary] = None


class PrestasiBase(BaseModel):
    nis_siswa: str
    judul: str
    kategori: str
    tingkat: Optional[str] = None
    deskripsi: Optional[str] = None
    poin: int = 0
    tanggal_prestasi: date
    bukti: Optional[str] = None
    pemberi_penghargaan: Optional[str] = None


class PrestasiCreate(PrestasiBase):
    pass


class PrestasiUpdate(BaseModel):
    nis_siswa: Optional[str] = None
    judul: Optional[str] = None
    kategori: Optional[str] = None
    tingkat: Optional[str] = None
    deskripsi: Optional[str] = None
    poin: Optional[int] = None
    tanggal_prestasi: Optional[date] = None
    bukti: Optional[str] = None
    pemberi_penghargaan: Optional[str] = None


class Prestasi(PrestasiBase):
    id: str
    status: PrestasiStatus
    pencatat_id: str
    verifikator_id: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config(OrmConfig):
        pass


class PrestasiStatusUpdate(BaseModel):
    status: PrestasiStatus

class TahunAjaranBase(BaseModel):
    tahun: str
    semester: str
    is_active: bool = True

class TahunAjaranCreate(TahunAjaranBase):
    pass

class TahunAjaranUpdate(BaseModel):
    tahun: Optional[str] = None
    semester: Optional[str] = None
    is_active: Optional[bool] = None

class TahunAjaran(TahunAjaranBase):
    id: str
    created_at: datetime
    class Config(OrmConfig):
        pass
