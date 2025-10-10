"""CLI utilitas untuk mengelola akun admin di sistem."""

from getpass import getpass

import bcrypt
from sqlalchemy.orm import Session

# Passlib versions <1.7.4 expect bcrypt.__about__.__version__; provide fallback when missing
if not hasattr(bcrypt, "__about__"):
    class _About:
        __version__ = getattr(bcrypt, "__version__", "")

    bcrypt.__about__ = _About()

from app import models
from app.database import SessionLocal
from app.crud import (
    create_user,
    delete_user,
    get_user_by_email,
    get_user_by_nip,
    update_user,
)
from app.schemas import UserCreate, UserRole, UserUpdate


def prompt_password(label: str = "Masukkan Password Admin"):
    """Meminta password dua kali dan memastikan keduanya cocok."""
    password = getpass(f"{label}: ").strip()
    if not password:
        print("\nError: Password tidak boleh kosong.")
        return None
    confirm = getpass("Konfirmasi Password: ").strip()
    if password != confirm:
        print("\nError: Password tidak cocok. Silakan coba lagi.")
        return None
    return password


def _prompt_nip(label: str) -> str | None:
    """Meminta input NIP dan memvalidasi agar hanya berisi angka."""
    raw = input(label).strip()
    if not raw:
        print("\nError: NIP tidak boleh kosong.")
        return None
    if not raw.isdigit():
        print("\nError: NIP harus berisi angka saja.")
        return None
    return raw


def create_admin(db: Session):
    """Menambahkan akun admin baru melalui interaksi CLI."""
    print("\n--- Tambah Admin Baru ---")
    nip = None
    while nip is None:
        nip = _prompt_nip("Masukkan NIP Admin: ")
    email = input("Masukkan Email Admin: ").strip()
    full_name = input("Masukkan Nama Lengkap Admin: ").strip()

    if get_user_by_nip(db, nip=nip):
        print(f"\nError: NIP '{nip}' sudah terdaftar.")
        return
    if get_user_by_email(db, email=email):
        print(f"\nError: Email '{email}' sudah terdaftar.")
        return

    password = prompt_password("Masukkan Password Admin")
    if not password:
        return

    admin_user = UserCreate(
        nip=nip,
        email=email,
        full_name=full_name,
        password=password,
        role=UserRole.ADMIN,
        is_active=True,
    )

    create_user(db=db, user=admin_user)
    print(f"\nSukses! Pengguna admin dengan NIP '{nip}' berhasil dibuat.")


def list_admins(db: Session):
    """Menampilkan daftar admin yang tersedia beserta statusnya."""
    print("\n--- Daftar Admin ---")
    admins = (
        db.query(models.User)
        .filter(models.User.role == UserRole.ADMIN.value)
        .order_by(models.User.created_at.asc())
        .all()
    )
    if not admins:
        print("Belum ada akun admin.")
        return
    for idx, admin in enumerate(admins, start=1):
        status = "Aktif" if admin.is_active else "Tidak Aktif"
        print(f"{idx}. {admin.nip} | {admin.full_name} | {admin.email} | {status} | Dibuat: {admin.created_at:%Y-%m-%d}")


def update_admin(db: Session):
    """Memperbarui data admin eksisting termasuk opsi reset password."""
    print("\n--- Perbarui Admin ---")
    nip = input("Masukkan NIP Admin yang ingin diperbarui: ").strip()
    admin = get_user_by_nip(db, nip=nip)
    if not admin or admin.role != UserRole.ADMIN.value:
        print(f"\nError: Admin dengan NIP '{nip}' tidak ditemukan.")
        return

    new_nip = input(f"NIP baru [{admin.nip}]: ").strip()
    if new_nip:
        if not new_nip.isdigit():
            print("\nError: NIP harus berupa angka.")
            return
        if new_nip != admin.nip and get_user_by_nip(db, nip=new_nip):
            print(f"\nError: NIP '{new_nip}' sudah terdaftar.")
            return
    else:
        new_nip = None

    new_email = input(f"Email baru [{admin.email}]: ").strip()
    if new_email and new_email != admin.email:
        if get_user_by_email(db, email=new_email):
            print(f"\nError: Email '{new_email}' sudah terdaftar.")
            return
    else:
        new_email = None

    new_full_name = input(f"Nama lengkap baru [{admin.full_name}]: ").strip()
    if not new_full_name:
        new_full_name = None

    change_password = input("Ubah password? (y/N): ").strip().lower()
    new_password = None
    if change_password == "y":
        new_password = prompt_password("Masukkan Password Baru")
        if not new_password:
            return

    status_choice = input("Aktifkan admin? (y/n, kosong tanpa perubahan): ").strip().lower()
    is_active = None
    if status_choice in {"y", "yes"}:
        is_active = True
    elif status_choice in {"n", "no"}:
        is_active = False

    update_payload = UserUpdate(
        nip=new_nip or None,
        email=new_email or None,
        full_name=new_full_name or None,
        password=new_password or None,
        role=UserRole.ADMIN,
        is_active=is_active,
    )

    update_user(db, admin.id, update_payload)
    print("\nSukses! Data admin berhasil diperbarui.")


def delete_admin_account(db: Session):
    """Menghapus akun admin setelah validasi jumlah admin minimal."""
    print("\n--- Hapus Admin ---")
    nip = _prompt_nip("Masukkan NIP Admin yang ingin dihapus: ")
    if not nip:
        return
    admin = get_user_by_nip(db, nip=nip)
    if not admin or admin.role != UserRole.ADMIN.value:
        print(f"\nError: Admin dengan NIP '{nip}' tidak ditemukan.")
        return

    total_admins = (
        db.query(models.User)
        .filter(models.User.role == UserRole.ADMIN.value)
        .count()
    )
    if total_admins <= 1:
        print("\nError: Tidak dapat menghapus admin terakhir.")
        return

    confirmation = input(f"Yakin ingin menghapus admin dengan NIP '{nip}'? (y/N): ").strip().lower()
    if confirmation != "y":
        print("\nDibatalkan.")
        return

    if not delete_user(db, admin.id):
        print("\nError: Gagal menghapus admin. Pastikan tidak ada data terkait.")
        return

    print("\nSukses! Admin berhasil dihapus.")


def print_menu():
    """Menampilkan menu utama CLI untuk manajemen admin."""
    print(
        "\n=== Manajemen Admin ===\n"
        "1. Tambah Admin Baru\n"
        "2. Lihat Daftar Admin\n"
        "3. Perbarui Admin\n"
        "4. Hapus Admin\n"
        "5. Keluar"
    )


def main():
    """Entry point CLI yang menjalankan loop interaktif."""
    session = SessionLocal()
    try:
        while True:
            print_menu()
            choice = input("Pilih menu [1-5]: ").strip()

            if choice == "1":
                create_admin(session)
            elif choice == "2":
                list_admins(session)
            elif choice == "3":
                update_admin(session)
            elif choice == "4":
                delete_admin_account(session)
            elif choice == "5":
                print("\nKeluar dari manajemen admin.")
                break
            else:
                print("\nPilihan tidak valid. Silakan coba lagi.")
    except KeyboardInterrupt:
        print("\n\nDibatalkan oleh pengguna.")
    finally:
        session.close()


if __name__ == "__main__":
    main()
