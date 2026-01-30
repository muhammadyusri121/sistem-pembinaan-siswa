"""Skema Pydantic yang digunakan sebagai kontrak request/response API."""

from pydantic import BaseModel, Field, EmailStr, constr, validator
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, date
from enum import Enum

class OrmConfig:
    from_attributes = True

class UserRole(str, Enum):
    """Daftar peran resmi yang digunakan sistem."""
    ADMIN = "admin"
    KEPALA_SEKOLAH = "kepala_sekolah"
    WALI_KELAS = "wali_kelas"
    GURU_BK = "guru_bk"
    GURU_UMUM = "guru_umum"

class SiswaStatus(str, Enum):
    """Status resmi siswa terhadap keikutsertaan kegiatan sekolah."""
    AKTIF = "aktif"
    LULUS = "lulus"
    PINDAH = "pindah"
    DIKELUARKAN = "dikeluarkan"
    DELETED = "deleted"


class PelanggaranStatus(str, Enum):
    """Status alur tindak lanjut pelanggaran."""
    REPORTED = "reported"
    PROCESSED = "processed"
    RESOLVED = "resolved"


class PrestasiStatus(str, Enum):
    """Status verifikasi prestasi siswa."""
    SUBMITTED = "submitted"
    VERIFIED = "verified"
    REJECTED = "rejected"

class Token(BaseModel):
    """Response standar token OAuth2."""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """Payload minimal yang disimpan di dalam JWT."""
    nip: str | None = None

NipStr = constr(pattern=r'^\d+$', min_length=1)


class UserBase(BaseModel):
    """Representasi umum atribut pengguna yang dibagikan ke banyak skema."""
    nip: NipStr
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool = True
    kelas_binaan: List[str] = Field(default_factory=list)
    angkatan_binaan: Optional[str] = None

class UserCreate(UserBase):
    """Skema pembuatan pengguna baru termasuk password awal."""
    password: str

class User(UserBase):
    """Skema yang dikembalikan API ketika menampilkan pengguna."""
    id: UUID
    created_at: datetime
    is_guru_wali: bool = False
    
    class Config(OrmConfig):
        pass

class UserUpdate(BaseModel):
    """Payload untuk memperbarui data pengguna secara parsial."""
    nip: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    kelas_binaan: Optional[List[str]] = None
    angkatan_binaan: Optional[str] = None

    @validator("nip")
    def validate_nip(cls, v):
        if v is None:
            return v
        if not v.isdigit():
            raise ValueError("NIP harus berupa angka")
        return v


class UserProfileUpdate(BaseModel):
    """Skema khusus untuk perubahan profil diri sendiri."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


class UserPasswordUpdate(BaseModel):
    """Permintaan perubahan password dengan validasi panjang minimal."""
    current_password: str
    new_password: str = Field(min_length=6)

class SiswaBase(BaseModel):
    """Atribut umum yang melekat pada entitas siswa."""
    nis: str
    nama: str
    id_kelas: str
    angkatan: str
    jenis_kelamin: str
    aktif: bool = True
    status_siswa: SiswaStatus = SiswaStatus.AKTIF

class SiswaCreate(SiswaBase):
    pass

class Siswa(SiswaBase):
    """Representasi siswa yang dibaca dari database."""
    created_at: datetime
    scheduled_deletion_at: Optional[datetime] = None
    class Config(OrmConfig):
        pass

class SiswaUpdate(BaseModel):
    """Payload opsional untuk memperbarui data siswa."""
    nama: Optional[str] = None
    id_kelas: Optional[str] = None
    angkatan: Optional[str] = None
    jenis_kelamin: Optional[str] = None
    aktif: Optional[bool] = None
    status_siswa: Optional[SiswaStatus] = None


class RiwayatKelasBase(BaseModel):
    """Riwayat kelas per tahun ajaran."""
    nis: str
    tahun_ajaran: str
    kelas: str


class RiwayatKelasCreate(RiwayatKelasBase):
    pass


class RiwayatKelas(RiwayatKelasBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config(OrmConfig):
        pass

class KelasBase(BaseModel):
    """Atribut dasar master kelas."""
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
    """Kelas lengkap dengan metadata sistem seperti ID dan waktu buat."""
    id: UUID
    created_at: datetime
    wali_kelas_name: Optional[str] = None
    class Config(OrmConfig):
        pass

class JenisPelanggaranBase(BaseModel):
    """Informasi yang menjelaskan satu jenis pelanggaran."""
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
    """Jenis pelanggaran seperti tersimpan dalam database."""
    id: UUID
    created_at: datetime
    class Config(OrmConfig):
        pass

class PelanggaranBase(BaseModel):
    """Data minimal yang dibutuhkan untuk mencatat pelanggaran."""
    nis_siswa: str
    jenis_pelanggaran_id: str
    waktu_kejadian: datetime
    tempat: str
    detail_kejadian: str
    bukti_foto: Optional[str] = None

class PelanggaranCreate(PelanggaranBase):
    pass

class Pelanggaran(PelanggaranBase):
    """Detail pelanggaran termasuk status dan metadata audit."""
    id: UUID
    pelapor_id: UUID
    status: PelanggaranStatus
    kelas_snapshot: Optional[str] = None
    catatan_pembinaan: Optional[str] = None
    tindak_lanjut: Optional[str] = None
    created_at: datetime
    class Config(OrmConfig):
        pass


class PelanggaranStatusUpdate(BaseModel):
    """Payload untuk mengubah status pelanggaran."""
    status: PelanggaranStatus


class PembinaanRequest(BaseModel):
    """Permintaan pembinaan yang menentukan catatan dan status target."""
    catatan: Optional[str] = None
    status: Optional[PelanggaranStatus] = None


class StudentViolationSummary(BaseModel):
    """Ringkasan pelanggaran per siswa yang ditampilkan pada dashboard."""
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
    """Response setelah pembinaan yang menyertakan ringkasan terbaru."""
    updated: int
    summary: Optional[StudentViolationSummary] = None


class PrestasiBase(BaseModel):
    """Atribut dasar sebuah prestasi siswa."""
    nis_siswa: str
    judul: str
    kategori: str
    tingkat: Optional[str] = None

    poin: int = 0
    tanggal_prestasi: date
    bukti: Optional[str] = None
    pemberi_penghargaan: Optional[str] = None


class PrestasiCreate(PrestasiBase):
    """Payload pembuatan prestasi baru."""
    pass


class PrestasiUpdate(BaseModel):
    """Perubahan parsial terhadap data prestasi."""
    nis_siswa: Optional[str] = None
    judul: Optional[str] = None
    kategori: Optional[str] = None
    tingkat: Optional[str] = None

    poin: Optional[int] = None
    tanggal_prestasi: Optional[date] = None
    bukti: Optional[str] = None
    pemberi_penghargaan: Optional[str] = None


class Prestasi(PrestasiBase):
    """Prestasi lengkap hasil pembacaan database."""
    id: UUID
    status: PrestasiStatus
    pencatat_id: UUID
    kelas_snapshot: Optional[str] = None
    verifikator_id: Optional[UUID] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config(OrmConfig):
        pass


class PrestasiStatusUpdate(BaseModel):
    """Payload untuk memverifikasi atau menolak prestasi."""
    status: PrestasiStatus

class TahunAjaranBase(BaseModel):
    """Representasi umum atribut tahun ajaran."""
    tahun: str
    semester: str
    is_active: bool = True

class TahunAjaranCreate(TahunAjaranBase):
    pass

class TahunAjaranUpdate(BaseModel):
    """Perubahan parsial untuk entitas tahun ajaran."""
    tahun: Optional[str] = None
    semester: Optional[str] = None
    is_active: Optional[bool] = None

class TahunAjaran(TahunAjaranBase):
    """Tahun ajaran lengkap beserta metadata penyimpanan."""
    id: UUID
    created_at: datetime
    class Config(OrmConfig):
        pass

class SystemConfigBase(BaseModel):
    key: str
    value: str

class SystemConfig(SystemConfigBase):
    updated_at: datetime
    class Config(OrmConfig):
        pass

class GuruWaliAccessBase(BaseModel):
    user_id: UUID

class PerwalianBase(BaseModel):
    teacher_id: UUID
    nis_siswa: str

class PerwalianCreate(BaseModel):
    nis_siswa: str

class Perwalian(PerwalianBase):
    id: UUID
    created_at: datetime
    class Config(OrmConfig):
        pass

class GuruWaliAssignment(BaseModel):
    user_ids: List[UUID]

class HeroSectionUpdate(BaseModel):
    """Payload untuk memperbarui konten hero section."""
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    # Image dihandle lewat upload terpisah, tapi URL bisa diupdate manual jika perlu

class SiteGallery(BaseModel):
    """Representasi satu item foto di galeri landing page."""
    id: UUID
    title: Optional[str] = None
    image_url: str
    created_at: datetime
    class Config(OrmConfig):
        pass

class LandingPageContent(BaseModel):
    """Response gabungan untuk semua konten landing page."""
    hero_title: str
    hero_subtitle: str
    hero_image_url: str
    gallery: List[SiteGallery]

class DashboardCarousel(BaseModel):
    """Representasi item carousel dashboard."""
    id: UUID
    url: str
    alt_text: Optional[str] = None
    created_at: datetime
    class Config(OrmConfig):
        pass
