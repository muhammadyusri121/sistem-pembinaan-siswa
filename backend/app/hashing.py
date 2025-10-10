"""Helper hashing password berbasis Passlib."""

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class Hasher:
    @staticmethod
    def verify_password(plain_password, hashed_password):
        """Memverifikasi kecocokan password plain dengan hash tersimpan."""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password):
        """Menghasilkan hash bcrypt baru untuk password yang diberikan."""
        return pwd_context.hash(password)
