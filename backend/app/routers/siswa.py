"""Router untuk manajemen data siswa termasuk impor CSV."""

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io
import csv

from .. import crud, schemas, dependencies, models
from ..database import get_db


def _parse_bool(value):
    """Mengonversi berbagai representasi boolean pada file impor."""
    if isinstance(value, bool):
        return value
    if value is None:
        return True
    if isinstance(value, (int, float)):
        return bool(value)
    value_str = str(value).strip().lower()
    if value_str in {'true', '1', 'yes', 'y'}:
        return True
    if value_str in {'false', '0', 'no', 'n'}:
        return False
    return True


def _format_class(value):
    """Memastikan kode kelas dalam huruf kapital tanpa spasi berlebih."""
    if value is None:
        return ""
    return str(value).strip().upper()


def _format_name(value):
    """Mengubah nama menjadi kapital di awal kata."""
    if value is None:
        return ""
    parts = str(value).strip().split()
    return " ".join(word[:1].upper() + word[1:].lower() for word in parts)

def _safe_str(value):
    """Mengubah nilai ke string aman tanpa 'nan'."""
    if value is None:
        return ""
    if isinstance(value, str):
        trimmed = value.strip()
        return "" if trimmed.lower() == "nan" else trimmed
    try:
        if pd.isna(value):
            return ""
    except Exception:
        pass
    trimmed = str(value).strip()
    return "" if trimmed.lower() == "nan" else trimmed

VALID_STUDENT_STATUSES = {status.value for status in schemas.SiswaStatus}

def _normalize_status(value):
    """Membersihkan input status siswa dan menerapkan default bila tidak valid."""
    if value is None or (isinstance(value, str) and not value.strip()):
        return schemas.SiswaStatus.AKTIF.value
    status_str = str(value).strip().lower()
    if status_str not in VALID_STUDENT_STATUSES:
        return schemas.SiswaStatus.AKTIF.value
    return status_str


def _normalize_siswa_payload(data: schemas.SiswaCreate) -> schemas.SiswaCreate:
    """Membersihkan payload siswa sebelum disimpan."""
    status_value = _normalize_status(getattr(data, "status_siswa", None))
    return schemas.SiswaCreate(
        nis=str(data.nis).strip(),
        nama=_format_name(data.nama),
        id_kelas=_format_class(data.id_kelas),
        angkatan=str(data.angkatan).strip(),
        jenis_kelamin=(data.jenis_kelamin or "").strip().upper()[:1],
        aktif=status_value == schemas.SiswaStatus.AKTIF.value,
        status_siswa=status_value,
    )


router = APIRouter(
    prefix="/siswa",
    tags=["Siswa"],
    dependencies=[Depends(dependencies.get_current_user)]
)

@router.post("/", response_model=schemas.Siswa, status_code=status.HTTP_201_CREATED)
def create_siswa(
    siswa_data: schemas.SiswaCreate, 
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Menambahkan siswa baru secara manual melalui form admin."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    normalized = _normalize_siswa_payload(siswa_data)
    db_siswa = crud.get_siswa_by_nis(db, nis=normalized.nis)
    if db_siswa:
        raise HTTPException(status_code=400, detail="NIS already exists")
    try:
        return crud.create_siswa(db=db, siswa=normalized)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.get("/", response_model=List[schemas.Siswa])
def get_all_siswa(
    db: Session = Depends(get_db)
):
    """Mengambil seluruh siswa tanpa filter (untuk dropdown/form)."""
    return crud.get_all_siswa(db)

@router.get("/search/{term}", response_model=List[schemas.Siswa])
def search_siswa(term: str, db: Session = Depends(get_db)):
    """Mencari siswa berdasarkan term bebas, digunakan oleh fitur auto-complete."""
    return crud.search_siswa(db, term=term)

@router.get("/{nis}", response_model=schemas.Siswa)
def get_siswa(nis: str, db: Session = Depends(get_db)):
    """Mengambil detail siswa spesifik berdasarkan NIS."""
    siswa = crud.get_siswa_by_nis(db, nis)
    if not siswa:
        raise HTTPException(status_code=404, detail="Siswa not found")
    return siswa

@router.put("/{nis}", response_model=schemas.Siswa)
def update_siswa(
    nis: str,
    siswa_update: schemas.SiswaUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Memperbarui data siswa (khusus admin)."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    try:
        normalized_status = None
        if siswa_update.status_siswa is not None:
            normalized_status = _normalize_status(siswa_update.status_siswa)
        normalized_active = siswa_update.aktif
        if normalized_status is not None:
            normalized_active = normalized_status == schemas.SiswaStatus.AKTIF.value

        normalized = schemas.SiswaUpdate(
            nama=_format_name(siswa_update.nama) if siswa_update.nama is not None else None,
            id_kelas=_format_class(siswa_update.id_kelas) if siswa_update.id_kelas is not None else None,
            angkatan=_safe_str(siswa_update.angkatan) if siswa_update.angkatan is not None else None,
            jenis_kelamin=_safe_str(siswa_update.jenis_kelamin).upper()[:1] if siswa_update.jenis_kelamin is not None else None,
            aktif=normalized_active,
            status_siswa=normalized_status,
        )
        updated = crud.update_siswa(db, nis, normalized)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not updated:
        raise HTTPException(status_code=404, detail="Siswa not found")
    return updated

@router.delete("/{nis}", status_code=status.HTTP_204_NO_CONTENT)
def delete_siswa(
    nis: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Menghapus siswa jika tidak memiliki pelanggaran aktif."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    ok, reason = crud.delete_siswa(db, nis)
    if not ok:
        if reason == "not_found":
            raise HTTPException(status_code=404, detail="Siswa not found")
        if reason == "has_unresolved":
            raise HTTPException(
                status_code=400,
                detail="Tidak bisa menghapus siswa yang masih memiliki pelanggaran aktif",
            )
        raise HTTPException(status_code=400, detail="Gagal menghapus siswa")
    return

@router.post("/upload-csv")
async def upload_siswa_csv(
    file: UploadFile = File(...),
    mark_missing_inactive: bool = True,
    tahun_ajaran: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """Mengimpor siswa secara massal melalui file CSV atau Excel."""
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are allowed")
    
    try:
        contents = await file.read()
        
        if file.filename.endswith('.csv'):
            for encoding in ('utf-8-sig', 'utf-16', 'utf-16le', 'latin-1'):
                try:
                    text_content = contents.decode(encoding)
                    break
                except UnicodeDecodeError:
                    text_content = None
            if text_content is None:
                raise HTTPException(status_code=400, detail="Tidak dapat membaca file CSV. Gunakan encoding UTF-8 atau UTF-16.")

            lines = text_content.splitlines()
            sample = '\n'.join(lines[:5])

            delimiter = ','
            if lines:
                header_line = lines[0]
                if '\t' in header_line:
                    delimiter = '\t'
                elif ';' in header_line and ',' not in header_line:
                    delimiter = ';'
                else:
                    try:
                        dialect = csv.Sniffer().sniff(sample, delimiters=[',', ';', '\t'])
                        delimiter = dialect.delimiter
                    except (csv.Error, IndexError):
                        delimiter = ','

            df = pd.read_csv(io.StringIO(text_content), sep=delimiter)
        else:
            df = pd.read_excel(io.BytesIO(contents))

        df.columns = [col.strip().lower() for col in df.columns]

        df = df.rename(columns={'jenis_kelamin': 'jeniskelamin'})

        required_columns = ['nis', 'nama', 'id_kelas', 'angkatan', 'jeniskelamin']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(status_code=400, detail=f"Missing columns. Required: {required_columns}")

        active_year = crud.get_active_tahun_ajaran(db)
        default_tahun_label = None
        if tahun_ajaran:
            default_tahun_label = tahun_ajaran.strip()
        elif active_year:
            default_tahun_label = f"{active_year.tahun}-{active_year.semester}"

        created_count = 0
        updated_count = 0
        error_count = 0
        errors = []
        imported_nis: set[str] = set()
        
        for index, row in df.iterrows():
            try:
                required_fields = ['nis', 'nama', 'id_kelas', 'angkatan', 'jeniskelamin']
                if all(_safe_str(row.get(field)) == "" for field in required_fields):
                    continue

                nis_value = _safe_str(row.get('nis'))
                if not nis_value:
                    raise ValueError("Kolom NIS tidak boleh kosong")
                imported_nis.add(nis_value)

                status_raw = row.get('status_siswa')
                if status_raw is None:
                    status_raw = row.get('status')
                siswa_raw = schemas.SiswaCreate(
                    nis=nis_value,
                    nama=_safe_str(row.get('nama')),
                    id_kelas=_safe_str(row.get('id_kelas')),
                    angkatan=_safe_str(row.get('angkatan')),
                    jenis_kelamin=_safe_str(row.get('jeniskelamin')),
                    aktif=_parse_bool(row.get('aktif', True)),
                    status_siswa=_normalize_status(status_raw),
                )
                siswa_data = _normalize_siswa_payload(siswa_raw)
                if not siswa_data.id_kelas:
                    raise ValueError("Kolom id_kelas tidak boleh kosong")
                raw_tahun = row.get('tahun_ajaran')
                if _safe_str(raw_tahun) == "":
                    raw_tahun = row.get('tahunajaran')
                tahun_label = _safe_str(raw_tahun) or default_tahun_label or siswa_data.angkatan

                existing = crud.get_siswa_by_nis(db, nis=siswa_data.nis)
                if existing:
                    update_payload = schemas.SiswaUpdate(
                        nama=siswa_data.nama,
                        id_kelas=siswa_data.id_kelas,
                        angkatan=siswa_data.angkatan,
                        jenis_kelamin=siswa_data.jenis_kelamin,
                        aktif=siswa_data.aktif,
                        status_siswa=siswa_data.status_siswa,
                    )
                    crud.update_siswa(db, siswa_data.nis, update_payload)
                    updated_count += 1
                else:
                    crud.create_siswa(db, siswa_data)
                    created_count += 1

                crud.upsert_riwayat_kelas(
                    db,
                    nis=siswa_data.nis,
                    kelas=siswa_data.id_kelas,
                    tahun_ajaran=tahun_label,
                )
            except Exception as e:
                db.rollback()
                errors.append(f"Row {index + 2}: {str(e)}")
                error_count += 1
        deactivated_count = 0
        if mark_missing_inactive and imported_nis:
            missing_query = db.query(models.Siswa).filter(models.Siswa.aktif.is_(True))
            missing_query = missing_query.filter(~models.Siswa.nis.in_(imported_nis))
            missing_students = missing_query.all()
            for siswa in missing_students:
                siswa.aktif = False
                siswa.status_siswa = schemas.SiswaStatus.PINDAH.value
                deactivated_count += 1

        if deactivated_count:
            db.commit()

        return {
            "message": "CSV upload completed",
            "success_count": created_count,
            "created_count": created_count,
            "updated_count": updated_count,
            "deactivated_count": deactivated_count,
            "error_count": error_count,
            "errors": errors
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
