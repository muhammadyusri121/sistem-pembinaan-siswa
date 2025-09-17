from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io
import csv


def _parse_bool(value):
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
from .. import crud, schemas, dependencies
from ..database import get_db

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
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        
    db_siswa = crud.get_siswa_by_nis(db, nis=siswa_data.nis)
    if db_siswa:
        raise HTTPException(status_code=400, detail="NIS already exists")
    try:
        return crud.create_siswa(db=db, siswa=siswa_data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.get("/", response_model=List[schemas.Siswa])
def get_all_siswa(
    db: Session = Depends(get_db)
):
    return crud.get_all_siswa(db)

@router.get("/search/{term}", response_model=List[schemas.Siswa])
def search_siswa(term: str, db: Session = Depends(get_db)):
    return crud.search_siswa(db, term=term)

@router.get("/{nis}", response_model=schemas.Siswa)
def get_siswa(nis: str, db: Session = Depends(get_db)):
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
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    try:
        updated = crud.update_siswa(db, nis, siswa_update)
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
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    ok = crud.delete_siswa(db, nis)
    if not ok:
        # Either not found or has references
        siswa = crud.get_siswa_by_nis(db, nis)
        if not siswa:
            raise HTTPException(status_code=404, detail="Siswa not found")
        raise HTTPException(status_code=400, detail="Tidak bisa menghapus siswa yang sudah memiliki pelanggaran")
    return

@router.post("/upload-csv")
async def upload_siswa_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
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
            
        success_count = 0
        error_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                siswa_data = schemas.SiswaCreate(
                    nis=str(row['nis']),
                    nama=str(row['nama']).strip(),
                    id_kelas=str(row['id_kelas']).strip(),
                    angkatan=str(row['angkatan']).strip(),
                    jenis_kelamin=str(row['jeniskelamin']).strip().upper()[:1],
                    aktif=_parse_bool(row.get('aktif', True))
                )
                if crud.get_siswa_by_nis(db, nis=siswa_data.nis):
                    errors.append(f"Row {index + 2}: NIS {siswa_data.nis} already exists")
                    error_count += 1
                    continue
                
                crud.create_siswa(db, siswa_data)
                success_count += 1
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
                error_count += 1
        
        return {
            "message": "CSV upload completed",
            "success_count": success_count,
            "error_count": error_count,
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
