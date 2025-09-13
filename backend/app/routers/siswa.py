from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io

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
    """
    Membuat data siswa baru. Hanya Admin.
    """
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        
    db_siswa = crud.get_siswa_by_nis(db, nis=siswa_data.nis)
    if db_siswa:
        raise HTTPException(status_code=400, detail="NIS already exists")
    return crud.create_siswa(db=db, siswa=siswa_data)

@router.get("/", response_model=List[schemas.Siswa])
def get_all_siswa(
    db: Session = Depends(get_db)
):
    """
    Mengambil daftar semua siswa.
    """
    return crud.get_all_siswa(db)

@router.post("/upload-csv")
async def upload_siswa_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(dependencies.get_current_user)
):
    """
    Mengunggah data siswa dari file CSV atau Excel. Hanya Admin.
    """
    if current_user.role != schemas.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are allowed")
    
    try:
        contents = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        # Validasi kolom yang dibutuhkan
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
                    nama=row['nama'],
                    id_kelas=row['id_kelas'],
                    angkatan=str(row['angkatan']),
                    jenis_kelamin=row['jeniskelamin'],
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