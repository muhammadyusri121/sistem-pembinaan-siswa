from pydantic import BaseModel, Field, EmailStr
from typing import Optional
import uuid
from datetime import datetime
from enum import Enum

class OrmConfig:
    from_attributes = True

class UserRole(str, Enum):
    ADMIN = "admin"
    KEPALA_SEKOLAH = "kepala_sekolah"
    WALI_KELAS = "wali_kelas"
    GURU_BK = "guru_bk"
    GURU_UMUM = "guru_umum"

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

class UserBase(BaseModel):
    username: str
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
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    kelas_binaan: Optional[str] = None
    angkatan_binaan: Optional[str] = None


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
    wali_kelas: Optional[str] = None
    tahun_ajaran: str

class KelasCreate(KelasBase):
    pass

class Kelas(KelasBase):
    id: str
    created_at: datetime
    class Config(OrmConfig):
        pass

class JenisPelanggaranBase(BaseModel):
    nama_pelanggaran: str
    kategori: str
    poin: int
    deskripsi: Optional[str] = None

class JenisPelanggaranCreate(JenisPelanggaranBase):
    pass

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
    status: str
    catatan_pembinaan: Optional[str] = None
    tindak_lanjut: Optional[str] = None
    created_at: datetime
    class Config(OrmConfig):
        pass

class TahunAjaranBase(BaseModel):
    tahun: str
    semester: str
    is_active: bool = True

class TahunAjaranCreate(TahunAjaranBase):
    pass

class TahunAjaran(TahunAjaranBase):
    id: str
    created_at: datetime
    class Config(OrmConfig):
        pass
