import asyncio
from getpass import getpass
from app.database import SessionLocal
from app.crud import get_user_by_username, create_user
from app.schemas import UserCreate, UserRole

async def main():
    """
    Fungsi utama untuk membuat pengguna admin secara interaktif.
    """
    print("--- Pembuatan Akun Admin ---")
    
    db = SessionLocal()
    
    try:
        # Meminta input dari pengguna
        username = input("Masukkan Username Admin: ").strip()
        email = input("Masukkan Email Admin: ").strip()
        full_name = input("Masukkan Nama Lengkap Admin: ").strip()
        
        # Menggunakan getpass agar password tidak terlihat saat diketik
        password = getpass("Masukkan Password Admin: ").strip()
        confirm_password = getpass("Konfirmasi Password: ").strip()

        if password != confirm_password:
            print("\nError: Password tidak cocok. Silakan coba lagi.")
            return

        # Memeriksa apakah username sudah ada
        if get_user_by_username(db, username=username):
            print(f"\nError: Username '{username}' sudah ada.")
            return

        # Membuat objek user baru
        admin_user = UserCreate(
            username=username,
            email=email,
            full_name=full_name,
            password=password,
            role=UserRole.ADMIN,
            is_active=True
        )
        
        # Menyimpan user ke database
        create_user(db=db, user=admin_user)
        
        print(f"\nSukses! Pengguna admin '{username}' berhasil dibuat.")
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())