from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import pandas as pd
import io
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Sistem Pembinaan Siswa", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-here-make-it-secure')
JWT_ALGORITHM = 'HS256'
security = HTTPBearer()

# User Roles Enum
class UserRole(str, Enum):
    ADMIN = "admin"
    KEPALA_SEKOLAH = "kepala_sekolah"
    WALI_KELAS = "wali_kelas"
    GURU_BK = "guru_bk"
    GURU_UMUM = "guru_umum"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    full_name: str
    role: UserRole
    kelas_binaan: Optional[str] = None  # For wali_kelas
    angkatan_binaan: Optional[str] = None  # For guru_bk
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: UserRole
    kelas_binaan: Optional[str] = None
    angkatan_binaan: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class Siswa(BaseModel):
    nis: str  # Primary key
    nama: str
    id_kelas: str
    angkatan: str
    jenis_kelamin: str
    aktif: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SiswaCreate(BaseModel):
    nis: str
    nama: str
    id_kelas: str
    angkatan: str
    jenis_kelamin: str
    aktif: bool = True

class Kelas(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nama_kelas: str
    tingkat: str
    wali_kelas: Optional[str] = None
    tahun_ajaran: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class KelasCreate(BaseModel):
    nama_kelas: str
    tingkat: str
    wali_kelas: Optional[str] = None
    tahun_ajaran: str

class JenisPelanggaran(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nama_pelanggaran: str
    kategori: str
    poin: int
    deskripsi: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JenisPelanggaranCreate(BaseModel):
    nama_pelanggaran: str
    kategori: str
    poin: int
    deskripsi: Optional[str] = None

class Pelanggaran(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nis_siswa: str
    jenis_pelanggaran_id: str
    pelapor_id: str
    waktu_kejadian: datetime
    tempat: str
    detail_kejadian: str
    bukti_foto: Optional[str] = None
    status: str = "reported"  # reported, processed, resolved
    catatan_pembinaan: Optional[str] = None
    tindak_lanjut: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PelanggaranCreate(BaseModel):
    nis_siswa: str
    jenis_pelanggaran_id: str
    waktu_kejadian: datetime
    tempat: str
    detail_kejadian: str
    bukti_foto: Optional[str] = None

class TahunAjaran(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tahun: str
    semester: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TahunAjaranCreate(BaseModel):
    tahun: str
    semester: str
    is_active: bool = True

# Utility Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await db.users.find_one({"username": username})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Auth Routes
@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user["username"], "role": user["role"]})
    return {"access_token": access_token, "token_type": "bearer", "user": User(**user)}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# User Management Routes (Admin only)
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if username already exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = hash_password(user_data.password)
    user_dict = user_data.dict()
    del user_dict["password"]
    user_dict["hashed_password"] = hashed_password
    
    user_obj = User(**user_dict)
    await db.users.insert_one(user_obj.dict())
    return user_obj

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = await db.users.find().to_list(1000)
    return [User(**user) for user in users]

# Student Management Routes
@api_router.post("/siswa", response_model=Siswa)
async def create_siswa(siswa_data: SiswaCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing_siswa = await db.siswa.find_one({"nis": siswa_data.nis})
    if existing_siswa:
        raise HTTPException(status_code=400, detail="NIS already exists")
    
    siswa_obj = Siswa(**siswa_data.dict())
    await db.siswa.insert_one(siswa_obj.dict())
    return siswa_obj

@api_router.get("/siswa", response_model=List[Siswa])
async def get_siswa(current_user: User = Depends(get_current_user)):
    siswa_list = await db.siswa.find().to_list(1000)
    return [Siswa(**siswa) for siswa in siswa_list]

@api_router.get("/siswa/search/{query}")
async def search_siswa(query: str, current_user: User = Depends(get_current_user)):
    siswa_list = await db.siswa.find({
        "$or": [
            {"nis": {"$regex": query, "$options": "i"}},
            {"nama": {"$regex": query, "$options": "i"}},
            {"id_kelas": {"$regex": query, "$options": "i"}}
        ]
    }).to_list(50)
    return [Siswa(**siswa) for siswa in siswa_list]

# CSV Upload Route
@api_router.post("/siswa/upload-csv")
async def upload_siswa_csv(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are allowed")
    
    try:
        contents = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        # Validate required columns
        required_columns = ['nis', 'nama', 'id_kelas', 'angkatan', 'jeniskelamin']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(status_code=400, detail=f"Missing columns: {missing_columns}")
        
        # Process data
        success_count = 0
        error_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                siswa_data = {
                    "nis": str(row['nis']),
                    "nama": row['nama'],
                    "id_kelas": row['id_kelas'],
                    "angkatan": str(row['angkatan']),
                    "jenis_kelamin": row['jeniskelamin'],
                    "aktif": row.get('aktif', True)
                }
                
                # Check if NIS already exists
                existing = await db.siswa.find_one({"nis": siswa_data["nis"]})
                if existing:
                    errors.append(f"Row {index + 1}: NIS {siswa_data['nis']} already exists")
                    error_count += 1
                    continue
                
                siswa_obj = Siswa(**siswa_data)
                await db.siswa.insert_one(siswa_obj.dict())
                success_count += 1
                
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
                error_count += 1
        
        return {
            "message": "CSV upload completed",
            "success_count": success_count,
            "error_count": error_count,
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

# Class Management Routes
@api_router.post("/kelas", response_model=Kelas)
async def create_kelas(kelas_data: KelasCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    kelas_obj = Kelas(**kelas_data.dict())
    await db.kelas.insert_one(kelas_obj.dict())
    return kelas_obj

@api_router.get("/kelas", response_model=List[Kelas])
async def get_kelas(current_user: User = Depends(get_current_user)):
    kelas_list = await db.kelas.find().to_list(1000)
    return [Kelas(**kelas) for kelas in kelas_list]

# Violation Type Management Routes
@api_router.post("/jenis-pelanggaran", response_model=JenisPelanggaran)
async def create_jenis_pelanggaran(jenis_data: JenisPelanggaranCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    jenis_obj = JenisPelanggaran(**jenis_data.dict())
    await db.jenis_pelanggaran.insert_one(jenis_obj.dict())
    return jenis_obj

@api_router.get("/jenis-pelanggaran", response_model=List[JenisPelanggaran])
async def get_jenis_pelanggaran(current_user: User = Depends(get_current_user)):
    jenis_list = await db.jenis_pelanggaran.find().to_list(1000)
    return [JenisPelanggaran(**jenis) for jenis in jenis_list]

# Violation Reporting Routes
@api_router.post("/pelanggaran", response_model=Pelanggaran)
async def create_pelanggaran(pelanggaran_data: PelanggaranCreate, current_user: User = Depends(get_current_user)):
    pelanggaran_dict = pelanggaran_data.dict()
    pelanggaran_dict["pelapor_id"] = current_user.id
    
    pelanggaran_obj = Pelanggaran(**pelanggaran_dict)
    await db.pelanggaran.insert_one(pelanggaran_obj.dict())
    return pelanggaran_obj

@api_router.get("/pelanggaran", response_model=List[Pelanggaran])
async def get_pelanggaran(current_user: User = Depends(get_current_user)):
    query = {}
    
    # Role-based filtering
    if current_user.role == UserRole.WALI_KELAS and current_user.kelas_binaan:
        # Get students from this class
        siswa_list = await db.siswa.find({"id_kelas": current_user.kelas_binaan}).to_list(1000)
        nis_list = [siswa["nis"] for siswa in siswa_list]
        query["nis_siswa"] = {"$in": nis_list}
    elif current_user.role == UserRole.GURU_BK and current_user.angkatan_binaan:
        # Get students from this angkatan
        siswa_list = await db.siswa.find({"angkatan": current_user.angkatan_binaan}).to_list(1000)
        nis_list = [siswa["nis"] for siswa in siswa_list]
        query["nis_siswa"] = {"$in": nis_list}
    elif current_user.role == UserRole.GURU_UMUM:
        # Only see own reports
        query["pelapor_id"] = current_user.id
    
    pelanggaran_list = await db.pelanggaran.find(query).to_list(1000)
    return [Pelanggaran(**pelanggaran) for pelanggaran in pelanggaran_list]

# Dashboard Analytics Routes
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.KEPALA_SEKOLAH]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Total counts
    total_siswa = await db.siswa.count_documents({})
    total_pelanggaran = await db.pelanggaran.count_documents({})
    total_users = await db.users.count_documents({})
    total_kelas = await db.kelas.count_documents({})
    
    # Recent violations (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recent_violations = await db.pelanggaran.count_documents({"created_at": {"$gte": thirty_days_ago}})
    
    return {
        "total_siswa": total_siswa,
        "total_pelanggaran": total_pelanggaran,
        "total_users": total_users,
        "total_kelas": total_kelas,
        "recent_violations": recent_violations
    }

# Academic Year Management Routes
@api_router.post("/tahun-ajaran", response_model=TahunAjaran)
async def create_tahun_ajaran(tahun_data: TahunAjaranCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # If setting as active, deactivate others
    if tahun_data.is_active:
        await db.tahun_ajaran.update_many({}, {"$set": {"is_active": False}})
    
    tahun_obj = TahunAjaran(**tahun_data.dict())
    await db.tahun_ajaran.insert_one(tahun_obj.dict())
    return tahun_obj

@api_router.get("/tahun-ajaran", response_model=List[TahunAjaran])
async def get_tahun_ajaran(current_user: User = Depends(get_current_user)):
    tahun_list = await db.tahun_ajaran.find().to_list(1000)
    return [TahunAjaran(**tahun) for tahun in tahun_list]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()