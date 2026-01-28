#!/bin/bash

# Script Perpanjangan SSL Otomatis
# ================================
# Script ini akan menjalankan container certbot untuk memperbarui sertifikat SSL
# dan kemudian me-restart Nginx agar perubahan diterapkan.

# 1. Masuk ke direktori tempat script ini berada (folder project)
cd "$(dirname "$0")"

# Buat log file untuk mencatat hasil
LOG_FILE="ssl_renewal.log"

echo "------------------------------------------------" >> $LOG_FILE
echo "Memulai proses perpanjangan SSL: $(date)" >> $LOG_FILE

# 2. Jalankan Certbot
# Menggunakan docker-compose untuk menjalankan container certbot
# Pastikan docker-compose terinstall dan bisa diakses
if command -v docker-compose &> /dev/null; then
    docker compose up certbot >> $LOG_FILE 2>&1
else
    # Fallback jika menggunakan 'docker compose' (v2)
    docker compose up certbot >> $LOG_FILE 2>&1
fi

status=$?

if [ $status -eq 0 ]; then
    echo "Certbot selesai mengecek sertifikat." >> $LOG_FILE
    
    # 3. Restart Nginx (frontend) untuk memuat sertifikat baru
    echo "Me-restart container frontend (Nginx)..." >> $LOG_FILE
    if command -v docker-compose &> /dev/null; then
        docker compose restart frontend >> $LOG_FILE 2>&1
    else
        docker compose restart frontend >> $LOG_FILE 2>&1
    fi
    
    # 4. Bersihkan Cache Docker (Maintenance Rutin)
    # Hanya menghapus container stop, network tidak terpakai, dan image dangling (aman).
    # Tidak menghapus volume database.
    echo "Membersihkan cache Docker yang tidak terpakai..." >> $LOG_FILE
    docker system prune -f >> $LOG_FILE 2>&1
    
    echo "Selesai! SSL berhasil diperbarui & Sistem Docker telah dibersihkan." >> $LOG_FILE
else
    echo "ERROR: Gagal menjalankan certbot. Cek log di atas." >> $LOG_FILE
fi

echo "Waktu selesai: $(date)" >> $LOG_FILE
echo "------------------------------------------------" >> $LOG_FILE
