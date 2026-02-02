import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL tidak ditemukan di .env")
    sys.exit(1)

print(f"Mencoba terhubung ke database...")
engine = create_engine(DATABASE_URL)

def update_schema():
    with engine.connect() as conn:
        print("Memeriksa dan memperbarui struktur tabel 'prestasi'...")
        
        # Hapus kolom verifikator dan verified_at
        try:
            conn.execute(text("ALTER TABLE prestasi DROP COLUMN IF EXISTS verifikator_id"))
            print("✔ Kolom 'verifikator_id' berhasil dihapus (atau memang sudah tidak ada).")
        except Exception as e:
            print(f"⚠ Gagal menghapus kolom 'verifikator_id': {e}")

        try:
            conn.execute(text("ALTER TABLE prestasi DROP COLUMN IF EXISTS verified_at"))
            print("✔ Kolom 'verified_at' berhasil dihapus (atau memang sudah tidak ada).")
        except Exception as e:
            print(f"⚠ Gagal menghapus kolom 'verified_at': {e}")
            
        try:
            conn.execute(text("ALTER TABLE prestasi DROP COLUMN IF EXISTS deskripsi"))
            print("✔ Kolom 'deskripsi' berhasil dihapus (atau memang sudah tidak ada).")
        except Exception as e:
            print(f"⚠ Gagal menghapus kolom 'deskripsi': {e}")
            
        try:
            conn.execute(text("ALTER TABLE pelanggaran DROP COLUMN IF EXISTS catatan_pembinaan"))
            print("✔ Kolom 'catatan_pembinaan' berhasil dihapus.")
        except Exception as e:
            print(f"⚠ Gagal menghapus kolom 'catatan_pembinaan': {e}")
            
        try:
            conn.execute(text("ALTER TABLE pelanggaran DROP COLUMN IF EXISTS tindak_lanjut"))
            print("✔ Kolom 'tindak_lanjut' berhasil dihapus.")
        except Exception as e:
            print(f"⚠ Gagal menghapus kolom 'tindak_lanjut': {e}")
            
        try:
            conn.execute(text("ALTER TABLE jenis_pelanggaran DROP COLUMN IF EXISTS poin"))
            print("✔ Kolom 'poin' pada tabel 'jenis_pelanggaran' berhasil dihapus.")
        except Exception as e:
            print(f"⚠ Gagal menghapus kolom 'poin' pada 'jenis_pelanggaran': {e}")

        # Tambahkan kolom poin ke prestasi jika belum ada (karena di model masih ada)
        try:
            # PostgreSQL syntax: ADD COLUMN ... IF NOT EXISTS is not standard for all versions, 
            # so we check if column exists first or just try-except
            conn.execute(text("ALTER TABLE prestasi ADD COLUMN IF NOT EXISTS poin INTEGER DEFAULT 0"))
            print("✔ Kolom 'poin' pada tabel 'prestasi' diverifikasi/ditambahkan.")
        except Exception as e:
            print(f"⚠ Gagal menambahkan kolom 'poin' pada 'prestasi': {e}")
            
        conn.commit()
        print("\n✅ Update database selesai!")

if __name__ == "__main__":
    update_schema()
