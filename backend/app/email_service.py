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
