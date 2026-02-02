"""Layanan pengiriman email sederhana untuk pemberitahuan akun."""

import logging
import os
import smtplib
from email.message import EmailMessage
from typing import Optional

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.sendgrid.net")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "apikey")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
EMAIL_SENDER = os.getenv("EMAIL_SENDER", "pembuatan-akun@disposmanka.my.id")
APP_LOGIN_URL = os.getenv("APP_LOGIN_URL", "https://disposmanka/login")


def send_account_email(
    *,
    recipient_email: str,
    nip: str,
    login_email: str,
    raw_password: str,
    full_name: Optional[str] = None,
) -> None:
    """Mengirim email kredensial akun baru kepada pengguna."""
    if not SMTP_PASSWORD:
        logger.warning("SMTP_PASSWORD tidak terisi; email ke %s dilewati", recipient_email)
        return

    greeting = f"Halo {full_name}," if full_name else "Halo,"

    text_body = (
        f"{greeting}\n\n"
        "Akun Anda telah dibuat.\n\n"
        f"NIP: {nip}\n"
        f"Email: {login_email}\n"
        f"Password: {raw_password}\n\n"
        f"Silakan login di {APP_LOGIN_URL} dan ubah password segera setelah masuk.\n\n"
        "Email ini otomatis; jangan dibalas."
    )

    html_body = f"""
    <html>
      <body>
        <p>{greeting}</p>
        <p>Akun Anda telah dibuat.</p>
        <ul>
          <li><strong>NIP:</strong> {nip}</li>
          <li><strong>Email:</strong> {login_email}</li>
          <li><strong>Password:</strong> {raw_password}</li>
        </ul>
        <p>Silakan login di <a href=\"{APP_LOGIN_URL}\">{APP_LOGIN_URL}</a> dan ubah password segera setelah masuk.</p>
        <p>Email ini otomatis; jangan dibalas.</p>
      </body>
    </html>
    """

    message = EmailMessage()
    message["Subject"] = "Akun Sistem Pembinaan Siswa"
    message["From"] = EMAIL_SENDER
    message["To"] = recipient_email
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")

    try:
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(message)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(message)
    except Exception:
        logger.exception("Gagal mengirim email kredensial ke %s", recipient_email)


def send_violation_notification(
    *,
    recipient_email: str,
    student_name: str,
    student_class: str,
    violation_name: str,
    incident_date: str,
    reporter_name: str,
    detail: str
) -> None:
    """Mengirim notifikasi email ke wali kelas saat siswa melakukan pelanggaran."""
    if not SMTP_PASSWORD:
        logger.warning("SMTP_PASSWORD tidak terisi; notifikasi ke %s dilewati", recipient_email)
        return

    subject = f"Laporan Pelanggaran Siswa - {student_name} ({student_class})"
    
    text_body = f"""
    Halo Bapak/Ibu Wali Kelas,

    Siswa di bawah perwalian Anda telah dilaporkan melakukan pelanggaran kedisiplinan.
    
    Detail Laporan:
    Nama Siswa: {student_name}
    Kelas: {student_class}
    Jenis Pelanggaran: {violation_name}
    Waktu Kejadian: {incident_date}
    Pelapor: {reporter_name}
    
    Detail Kejadian:
    {detail}
    
    Silakan login ke aplikasi Sistem Pembinaan Siswa untuk menindaklanjuti laporan ini.
    
    Terima kasih,
    Admin Sistem Pembinaan Siswa
    """

    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #d32f2f;">Laporan Pelanggaran Siswa</h2>
          <p>Halo Bapak/Ibu Wali Kelas,</p>
          <p>Siswa di bawah perwalian Anda dilaporkan melakukan pelanggaran kedisiplinan dengan detail sebagai berikut:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px; font-weight: bold; width: 150px;">Nama Siswa</td>
              <td style="padding: 8px;">: {student_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Kelas</td>
              <td style="padding: 8px;">: {student_class}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Jenis Pelanggaran</td>
              <td style="padding: 8px; color: #d32f2f; font-weight: bold;">: {violation_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Waktu Kejadian</td>
              <td style="padding: 8px;">: {incident_date}</td>
            </tr>
             <tr>
              <td style="padding: 8px; font-weight: bold;">Pelapor</td>
              <td style="padding: 8px;">: {reporter_name}</td>
            </tr>
          </table>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #d32f2f; margin-bottom: 20px;">
            <strong>Detail Kejadian:</strong><br/>
            {detail}
          </div>
          
          <p>Silakan <a href="{APP_LOGIN_URL}" style="color: #1976d2; text-decoration: none; font-weight: bold;">Login ke Aplikasi</a> untuk melihat bukti foto dan melakukan proses pembinaan atau tindak lanjut.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Email ini dikirim otomatis oleh Sistem Pembinaan Siswa.</p>
        </div>
      </body>
    </html>
    """

    message = EmailMessage()
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")
    message["Subject"] = subject
    message["From"] = EMAIL_SENDER
    message["To"] = recipient_email

    try:
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(message)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(message)
        logger.info("Email notifikasi pelanggaran (%s) berhasil dikirim ke %s", student_name, recipient_email)
    except Exception:
        logger.exception("Gagal mengirim email notifikasi pelanggaran ke %s", recipient_email)
