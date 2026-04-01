import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Membaca file .env jika ada
load_dotenv()

# Mengambil DATABASE_URL dari file .env
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ HASIL: URL Database tidak ditemukan. Pastikan variabel DATABASE_URL ada di dalam file .env")
    exit(1)

print(f"Menguji koneksi ke: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")

try:
    # Dialek postgresql:// digunakan oleh SQLAlchemy
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        # Menjalankan query paling dasar untuk menguji kehidupan database
        result = connection.execute(text("SELECT 1"))
        val = result.scalar()
        if val == 1:
            print("✅ HASIL: BERHASIL! Database sukses merespon.")
            
            # Cek apakah tabel pengguna / auth sudah di-_migrate_
            try:
                tables = connection.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
                table_names = [row[0] for row in tables]
                if "users" in table_names or "pengguna" in table_names or "system_config" in table_names:
                    print(f"✅ STATUS: Tabel berhasil dimigrasi (Ditemukan {len(table_names)} tabel)")
                else:
                    print("⚠️ STATUS: Terkoneksi, tapi tabel database-nya masih kosong (belum termigrasi).")
                    print(f"   Daftar Tabel: {table_names}")
            except Exception as e:
                pass
                
except Exception as e:
    print("\n❌ HASIL: GAGAL TERHUBUNG KE DATABASE!")
    print(f"Pesan Error Asli: {e}")
