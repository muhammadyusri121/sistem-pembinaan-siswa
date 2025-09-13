import asyncio
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def create_default_users():
    # MongoDB connection
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Check if admin already exists
    existing_admin = await db.users.find_one({"username": "admin"})
    
    if not existing_admin:
        # Create admin user
        admin_user = {
            "id": "admin-001",
            "username": "admin",
            "email": "admin@sekolah.id",
            "full_name": "Administrator Sistem",
            "role": "admin",
            "hashed_password": hash_password("admin123"),
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z"
        }
        
        await db.users.insert_one(admin_user)
        print("Admin user created successfully!")
        print("Username: admin")
        print("Password: admin123")
        
        # Create demo guru user
        guru_user = {
            "id": "guru-001",
            "username": "guru1",
            "email": "guru1@sekolah.id",
            "full_name": "Budi Santoso, S.Pd",
            "role": "guru_umum",
            "hashed_password": hash_password("guru123"),
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z"
        }
        
        await db.users.insert_one(guru_user)
        print("Demo guru user created successfully!")
        print("Username: guru1")
        print("Password: guru123")
        
        # Create demo wali kelas user
        wali_user = {
            "id": "wali-001",
            "username": "wali1",
            "email": "wali1@sekolah.id",
            "full_name": "Siti Rahayu, S.Pd",
            "role": "wali_kelas",
            "kelas_binaan": "10A",
            "hashed_password": hash_password("wali123"),
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z"
        }
        
        await db.users.insert_one(wali_user)
        print("Demo wali kelas user created successfully!")
        print("Username: wali1")
        print("Password: wali123")
        
        # Create demo data
        demo_kelas = [
            {"id": "kelas-10a", "nama_kelas": "10A", "tingkat": "10", "wali_kelas": "wali1", "tahun_ajaran": "2024/2025", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "kelas-10b", "nama_kelas": "10B", "tingkat": "10", "tahun_ajaran": "2024/2025", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "kelas-11a", "nama_kelas": "11A", "tingkat": "11", "tahun_ajaran": "2024/2025", "created_at": "2024-01-01T00:00:00Z"}
        ]
        
        for kelas in demo_kelas:
            existing = await db.kelas.find_one({"id": kelas["id"]})
            if not existing:
                await db.kelas.insert_one(kelas)
        
        print("Demo kelas data created!")
        
        # Create demo violation types
        demo_violations = [
            {"id": "violation-001", "nama_pelanggaran": "Terlambat", "kategori": "Ringan", "poin": 5, "deskripsi": "Terlambat datang ke sekolah", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "violation-002", "nama_pelanggaran": "Tidak mengerjakan PR", "kategori": "Ringan", "poin": 10, "deskripsi": "Tidak mengerjakan pekerjaan rumah", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "violation-003", "nama_pelanggaran": "Berkelahi", "kategori": "Berat", "poin": 50, "deskripsi": "Berkelahi dengan sesama siswa", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "violation-004", "nama_pelanggaran": "Merokok", "kategori": "Berat", "poin": 75, "deskripsi": "Merokok di area sekolah", "created_at": "2024-01-01T00:00:00Z"}
        ]
        
        for violation in demo_violations:
            existing = await db.jenis_pelanggaran.find_one({"id": violation["id"]})
            if not existing:
                await db.jenis_pelanggaran.insert_one(violation)
        
        print("Demo violation types created!")
        
        # Create demo students
        demo_students = [
            {"nis": "20240001", "nama": "Ahmad Rizki", "id_kelas": "10A", "angkatan": "2024", "jenis_kelamin": "L", "aktif": True, "created_at": "2024-01-01T00:00:00Z"},
            {"nis": "20240002", "nama": "Siti Aminah", "id_kelas": "10A", "angkatan": "2024", "jenis_kelamin": "P", "aktif": True, "created_at": "2024-01-01T00:00:00Z"},
            {"nis": "20240003", "nama": "Budi Santoso", "id_kelas": "10B", "angkatan": "2024", "jenis_kelamin": "L", "aktif": True, "created_at": "2024-01-01T00:00:00Z"},
            {"nis": "20240004", "nama": "Dewi Sari", "id_kelas": "11A", "angkatan": "2023", "jenis_kelamin": "P", "aktif": True, "created_at": "2024-01-01T00:00:00Z"}
        ]
        
        for student in demo_students:
            existing = await db.siswa.find_one({"nis": student["nis"]})
            if not existing:
                await db.siswa.insert_one(student)
        
        print("Demo students created!")
        
    else:
        print("Admin user already exists!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_default_users())