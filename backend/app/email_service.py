"""Layanan pengiriman email sederhana untuk pemberitahuan akun."""

import logging
import os
import smtplib
from datetime import datetime
from email.message import EmailMessage
from typing import Optional

from dotenv import load_dotenv

# Load env variables explicitly
load_dotenv()

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.sendgrid.net")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
EMAIL_SENDER = os.getenv("EMAIL_SENDER", "[EMAIL_ADDRESS]")
APP_LOGIN_URL = os.getenv("APP_LOGIN_URL", "https://dispo.sman1ketapang.sch.id/login")

print(f"DEBUG: Email Config Loaded - Host: {SMTP_HOST}, Port: {SMTP_PORT}, User: {SMTP_USERNAME}, SENDER: {EMAIL_SENDER} (Password Set: {'Yes' if SMTP_PASSWORD else 'No'})")


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
    Halo Bapak/Ibu Guru,

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


def send_account_update_notification(
    *,
    recipient_email: str,
    full_name: str,
    changes: list[str]
) -> None:
    """Mengirim email notifikasi saat ada perubahan pada akun (email/password)."""
    if not SMTP_PASSWORD:
        logger.warning("SMTP_PASSWORD tidak terisi; notifikasi akun ke %s dilewati", recipient_email)
        return

    change_list = "\n".join([f"- {c}" for c in changes])
    change_list_html = "".join([f"<li>{c}</li>" for c in changes])

    subject = "Pemberitahuan Perubahan Akun - Sistem Pembinaan Siswa"

    text_body = f"""
    Halo {full_name},

    Akun Anda pada Sistem Pembinaan Siswa telah mengalami perubahan data sebagai berikut:

    {change_list}

    Jika Anda melakukan perubahan ini, abaikan email ini.
    Jika Anda TIDAK melakukan perubahan ini, segera hubungi Administrator sekolah.


    Waktu perubahan: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
    
    Terima kasih,
    Admin Sistem Pembinaan Siswa
    """

    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #d32f2f;">Pemberitahuan Perubahan Akun</h2>
          <p>Halo <strong>{full_name}</strong>,</p>
          <p>Sistem mendeteksi adanya perubahan pada akun Anda:</p>
          
          <ul style="background-color: #fff3cd; padding: 15px 30px; border-radius: 5px; color: #856404;">
            {change_list_html}
          </ul>
          
          <p>Jika Anda melakukan perubahan ini, silakan abaikan pesan ini.</p>
          <div style="background-color: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px; margin-top: 15px;">
            <strong>PERINGATAN KEAMANAN:</strong><br/>
            Jika Anda <strong>TIDAK</strong> merasa melakukan perubahan ini, segera hubungi Administrator untuk mengamankan akun Anda.
          </div>
          
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
        logger.info("Email notifikasi perubahan akun dikirim ke %s", recipient_email)
    except Exception:
        logger.exception("Gagal mengirim email notifikasi perubahan akun ke %s", recipient_email)

def send_email_change_old_notification(
    *,
    old_email: str,
    new_email: str,
    full_name: str
) -> None:
    """Mengirim notifikasi ke email LAMA bahwa alamat email telah diubah."""
    if not SMTP_PASSWORD:
        return

    subject = "Pemberitahuan Perubahan Alamat Email - Sistem Pembinaan Siswa"
    
    import datetime
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    text_body = f"""
    Halo {full_name},

    Alamat email akun Anda telah diubah dari {old_email} menjadi {new_email}.
    
    Mulai saat ini, semua notifikasi dan akses login akan dialihkan ke alamat email baru: {new_email}.

    Waktu perubahan: {timestamp}

    Jika Anda tidak melakukan perubahan ini, segera hubungi Administrator sekolah.
    """

    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #d32f2f;">Perubahan Alamat Email</h2>
          <p>Halo <strong>{full_name}</strong>,</p>
          <p>Alamat email akun Anda telah berhasil diubah.</p>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; color: #0d47a1; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email Lama:</strong> {old_email}</p>
            <p style="margin: 5px 0 0 0;"><strong>Email Baru:</strong> {new_email}</p>
          </div>
          
          <p>Mulai saat ini, semua notifikasi sistem akan dikirimkan ke alamat email baru tersebut.</p>
          
          <p style="font-size: 13px; color: #666;">Waktu perubahan: {timestamp}</p>
          
          <div style="background-color: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px; margin-top: 15px;">
            <strong>PENTING:</strong><br/>
            Jika Anda TIDAK merasa melakukan perubahan ini, segera hubungi Administrator sekolah.
          </div>
        </div>
      </body>
    </html>
    """

    message = EmailMessage()
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")
    message["Subject"] = subject
    message["From"] = EMAIL_SENDER
    message["To"] = old_email

    try:
        print(f"DEBUG: Connecting to SMTP {SMTP_HOST}:{SMTP_PORT} for OLD email notification...")
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(message)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(message)
        logger.info("Email notifikasi perubahan email (ke lama) dikirim ke %s", old_email)
        print(f"DEBUG: Email SENT successfully to OLD email {old_email}")
    except smtplib.SMTPException as e:
        logger.error(f"SMTP Error sending old email notification: {e}")
        print(f"DEBUG: SMTP Error (Old Email): {e}")
    except Exception as e:
        logger.exception("Gagal mengirim email notifikasi ke email lama %s", old_email)
        print(f"DEBUG: General Error (Old Email): {e}")


def send_email_change_new_notification(
    *,
    recipient_email: str,
    nip: str,
    full_name: str
) -> None:
    """Mengirim notifikasi ke email BARU dengan detail kredensial lengkap."""
    if not SMTP_PASSWORD:
        return

    subject = "Konfirmasi Perubahan Email - Sistem Pembinaan Siswa"
    APP_BASE_URL = os.getenv("APP_LOGIN_URL", "https://dispo.sman1ketapang.sch.id")

    text_body = f"""
    Halo {full_name},

    Alamat email untuk akun Anda telah berhasil diperbarui.
    
    Detail Akun Terbaru:
    NIP: {nip}
    Email: {recipient_email}
    
    Silakan gunakan email baru ini untuk login ke aplikasi.
    Login URL: {APP_BASE_URL}

    Terima kasih,
    Admin Sistem Pembinaan Siswa
    """

    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #2e7d32;">Perubahan Email Berhasil</h2>
          <p>Halo <strong>{full_name}</strong>,</p>
          <p>Email ini dikirimkan untuk mengonfirmasi bahwa alamat email akun Anda telah berhasil diperbarui.</p>
          
          <div style="background-color: #f1f8e9; padding: 15px; border-radius: 5px; border: 1px solid #c8e6c9;">
            <p style="margin: 0 0 5px 0;"><strong>NIP:</strong> {nip}</p>
            <p style="margin: 0;"><strong>Email Login:</strong> {recipient_email}</p>
          </div>
          
          <p>Silakan gunakan email ini untuk login selanjutnya.</p>
          <p>
            <a href="{APP_BASE_URL}" style="display: inline-block; padding: 10px 20px; background-color: #2e7d32; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Login ke Aplikasi</a>
          </p>
          
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
        print(f"DEBUG: Connecting to SMTP {SMTP_HOST}:{SMTP_PORT} for NEW email notification...")
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(message)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(message)
        logger.info("Email notifikasi perubahan email (ke baru) dikirim ke %s", recipient_email)
        print(f"DEBUG: Email SENT successfully to {recipient_email}")
    except smtplib.SMTPException as e:
        logger.error(f"SMTP Error sending new email notification: {e}")
        print(f"DEBUG: SMTP Error: {e}")
    except Exception as e:
        logger.exception("Gagal mengirim email notifikasi ke email baru %s", recipient_email)
        print(f"DEBUG: General Error: {e}")
