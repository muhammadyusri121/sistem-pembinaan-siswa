// Halaman profil pengguna untuk memperbarui identitas, password, dan foto
import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../App";
import { profileService } from "../services/api";
import { toast } from "sonner";
import {
  UserCircle,
  Mail,
  User2,
  KeyRound,
  ShieldCheck,
  Image as ImageIcon,
  UploadCloud,
} from "lucide-react";

// Dashboard personal untuk pengguna terautentikasi
const ProfileDashboard = () => {
  const { user, updateUserContext } = useContext(AuthContext);
  const [accountForm, setAccountForm] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [avatarPreview, setAvatarPreview] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  const avatarStorageKey = useMemo(
    () => (user ? `profile_avatar_${user.id}` : null),
    [user]
  );

  useEffect(() => {
    setAccountForm({
      full_name: user?.full_name || "",
      email: user?.email || "",
    });
  }, [user?.full_name, user?.email]);

  useEffect(() => {
    if (!avatarStorageKey) {
      setAvatarPreview("");
      return;
    }
    const stored = localStorage.getItem(avatarStorageKey);
    setAvatarPreview(stored || "");
  }, [avatarStorageKey, user?.avatar_local_version]);

  // Menyimpan perubahan nama dan email ke server dan konteks lokal
  const handleAccountSubmit = async (event) => {
    event.preventDefault();
    setIsSavingAccount(true);
    try {
      const payload = {
        full_name: accountForm.full_name,
        email: accountForm.email,
      };
      await profileService.updateProfile(payload);
      toast.success("Profil berhasil diperbarui");
      updateUserContext(payload);
    } catch (error) {
      const message =
        error?.response?.data?.detail || "Gagal memperbarui profil";
      toast.error(message);
    } finally {
      setIsSavingAccount(false);
    }
  };

  // Validasi password baru lalu kirim ke backend untuk diperbarui
  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("Password baru dan konfirmasi tidak sama");
      return;
    }
    setIsSavingPassword(true);
    try {
      await profileService.updatePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success("Password berhasil diperbarui");
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (error) {
      const message =
        error?.response?.data?.detail || "Gagal memperbarui password";
      toast.error(message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Membaca file gambar yang dipilih dan menampilkan pratinjau base64
  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result?.toString() || "");
    };
    reader.readAsDataURL(file);
  };

  // Menyimpan avatar secara lokal agar tetap tersedia saat offline
  const handleAvatarSave = async (event) => {
    event.preventDefault();
    if (!avatarStorageKey) return;
    if (!avatarPreview) {
      toast.error("Silakan pilih foto terlebih dahulu");
      return;
    }

    setIsSavingAvatar(true);
    try {
      localStorage.setItem(avatarStorageKey, avatarPreview);
      updateUserContext({ avatar_local_version: Date.now() });
      toast.success("Foto profil tersimpan secara lokal");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  // Inisial fallback ketika foto profil belum tersedia
  const avatarInitials = useMemo(() => {
    if (user?.full_name) {
      return user.full_name
        .split(" ")
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
    }
    return "US";
  }, [user?.full_name]);

  return (
    <div className="space-y-8 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Profil</h1>
          <p className="text-gray-600 mt-1">
            Kelola informasi akun dan keamanan Anda
          </p>
        </div>
      </div>

      <section id="account" className="modern-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <User2 className="w-6 h-6 text-red-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Informasi Akun
            </h2>
            <p className="text-gray-500 text-sm">
              Perbarui nama lengkap dan email Anda
            </p>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleAccountSubmit}>
          <div>
            <label htmlFor="full_name" className="form-label">
              Nama Lengkap
            </label>
            <div className="relative">
              <UserCircle className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="full_name"
                type="text"
                className="modern-input input-with-icon-left"
                value={accountForm.full_name}
                onChange={(e) =>
                  setAccountForm((prev) => ({
                    ...prev,
                    full_name: e.target.value,
                  }))
                }
                placeholder="Masukkan nama lengkap"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                className="modern-input input-with-icon-left"
                value={accountForm.email}
                onChange={(e) =>
                  setAccountForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="nama@sekolah.sch.id"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary inline-flex items-center gap-2"
            disabled={isSavingAccount}
          >
            {isSavingAccount ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </form>
      </section>

      <section id="security" className="modern-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-6 h-6 text-red-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Keamanan Akun
            </h2>
            <p className="text-gray-500 text-sm">
              Atur ulang password akun Anda
            </p>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handlePasswordSubmit}>
          <div>
            <label htmlFor="current_password" className="form-label">
              Password Saat Ini
            </label>
            <div className="relative">
              <KeyRound className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="current_password"
                type="password"
                className="modern-input input-with-icon-left"
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    current_password: e.target.value,
                  }))
                }
                placeholder="Masukkan password saat ini"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="new_password" className="form-label">
                Password Baru
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="new_password"
                  type="password"
                  className="modern-input input-with-icon-left"
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      new_password: e.target.value,
                    }))
                  }
                  placeholder="Minimal 6 karakter"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm_password" className="form-label">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="confirm_password"
                  type="password"
                  className="modern-input input-with-icon-left"
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirm_password: e.target.value,
                    }))
                  }
                  placeholder="Ulangi password baru"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary inline-flex items-center gap-2"
            disabled={isSavingPassword}
          >
            {isSavingPassword ? "Memperbarui..." : "Perbarui Password"}
          </button>
        </form>
      </section>

      <section id="avatar" className="modern-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <ImageIcon className="w-6 h-6 text-red-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Foto Profil</h2>
            <p className="text-gray-500 text-sm">
              Perbarui foto profil yang tersimpan pada perangkat ini
            </p>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleAvatarSave}>
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center text-2xl font-semibold text-red-600 overflow-hidden">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Preview avatar"
                  className="object-cover w-full h-full"
                />
              ) : (
                avatarInitials
              )}
            </div>

            <div className="flex-1 space-y-3">
              <label className="form-label">Unggah Foto Baru</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="modern-input"
              />
              <p className="text-xs text-gray-500">
                Gunakan gambar dengan rasio persegi agar hasil tampilan lebih
                optimal.
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="btn-secondary inline-flex items-center gap-2"
            disabled={isSavingAvatar}
          >
            <UploadCloud className="w-4 h-4" />
            {isSavingAvatar ? "Menyimpan..." : "Simpan Foto Profil"}
          </button>
        </form>
      </section>
    </div>
  );
};

export default ProfileDashboard;
