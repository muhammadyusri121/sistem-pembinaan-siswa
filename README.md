# Sistem Pembinaan Siswa Cerdas 🎓

<p align="center">
  <img style="margin-right: 8px;" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img style="margin-right: 8px;" src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img style="margin-right: 8px;" src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js">
  <img style="margin-right: 8px;" src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img style="margin-right: 8px;" src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=FASTAPI&logoColor=white" alt="FastAPI">
</p>

Proyek ini adalah Sistem Pembinaan Siswa yang dirancang untuk membantu sekolah dalam mengelola data siswa, pelanggaran, dan informasi penting lainnya. Sistem ini bertujuan untuk mempermudah proses pencatatan dan pelaporan, serta memberikan informasi yang akurat dan relevan bagi pihak sekolah. Dengan antarmuka yang intuitif, sistem ini diharapkan dapat meningkatkan efisiensi dan efektivitas dalam pengelolaan data siswa.

## Fitur Utama ✨

*   **Manajemen Data Siswa 🧑‍🎓**: Kelola informasi siswa seperti identitas, kelas, dan data kontak dengan mudah.
*   **Pencatatan Pelanggaran 🚨**: Catat dan lacak pelanggaran siswa secara detail, termasuk jenis pelanggaran, tanggal, dan tindakan yang diambil.
*   **Dashboard Interaktif 📊**: Dapatkan gambaran umum tentang kondisi siswa dan pelanggaran melalui dashboard yang informatif.
*   **Otentikasi Pengguna 🔑**: Sistem keamanan untuk memastikan hanya pengguna yang berwenang yang dapat mengakses data.

## Tech Stack 🛠️

*   **Bahasa Pemrograman**: JavaScript, Python
*   **Backend Framework**: Node.js (dengan Express.js), FastAPI
*   **Database**: *Kemungkinan menggunakan database relasional atau NoSQL (perlu eksplorasi lebih lanjut)*

## Instalasi & Menjalankan 🚀

1.  Clone repositori:
    ```bash
    git clone https://github.com/muhammadyusri121/sistem-pembinaan-siswa
    ```

2.  Masuk ke direktori:
    ```bash
    cd sistem-pembinaan-siswa
    ```

3.  Install dependensi (Backend):

    *   Karena ada file `backend/app/main.py` dan `backend/.env`, diasumsikan menggunakan Python dan pipenv/venv
        ```bash
        cd backend
        pip install -r requirements.txt  # Jika menggunakan requirements.txt
        # ATAU
        pip install pipenv #Jika belum terinstall
        pipenv install --dev
        pipenv shell
        ```

4.  Jalankan proyek (Backend):
    ```bash
    cd backend
    python -m app.main #atau python app/main.py
    # ATAU jika menggunakan pipenv
    pipenv run python -m app.main #atau pipenv run python app/main.py
    ```

    *Catatan: Langkah instalasi frontend (jika ada) dan konfigurasi database perlu ditambahkan setelah repositori dieksplorasi lebih lanjut.*

## Cara Berkontribusi 🤝

1.  Fork repositori ini.
2.  Buat branch dengan nama fitur Anda: `git checkout -b fitur/nama-fitur`
3.  Lakukan commit dengan pesan yang jelas: `git commit -m "feat: Tambahkan fitur baru"`
4.  Push ke branch Anda: `git push origin fitur/nama-fitur`
5.  Buat Pull Request.
