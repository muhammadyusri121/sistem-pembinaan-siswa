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

  const pageShellClasses =
    "min-h-screen space-y-8 sm:space-y-5 bg-rose-50/80 text-gray-900 dark:bg-slate-950 dark:text-slate-100 px-4 sm:px-6 lg:px-8 py-8 transition-colors";
  const cardClasses =
    "rounded-[8px] bg-white/95 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/70 dark:shadow-xl dark:shadow-black/40 dark:ring-1 dark:ring-slate-700/60";
  const inputClasses =
    "w-full rounded-full border border-gray-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-rose-400 dark:focus:ring-rose-500/30";
  const primaryButtonClasses =
    "inline-flex items-center justify-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1 focus:ring-offset-rose-50 hover:bg-rose-600 dark:focus:ring-offset-slate-950";
  const secondaryButtonClasses =
    "inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:ring-offset-rose-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800/60 dark:focus:ring-rose-500/40 dark:focus:ring-offset-slate-950";

  return (
    <div className={`${pageShellClasses} fade-in`}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Dashboard Profil
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Kelola informasi akun dan keamanan Anda
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <section id="account" className={cardClasses}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-inner">
                <User2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">
                  Informasi Akun
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Perbarui nama lengkap dan email Anda
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleAccountSubmit}>
              <div className="space-y-2">
                <label htmlFor="full_name" className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400 ml-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserCircle className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="full_name"
                    type="text"
                    className={`${inputClasses} pl-12`}
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

              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400 ml-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    type="email"
                    className={`${inputClasses} pl-12`}
                    value={accountForm.email}
                    onChange={(e) =>
                      setAccountForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="nama@sekolah.sch.id"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className={primaryButtonClasses}
                  disabled={isSavingAccount}
                >
                  {isSavingAccount ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </section>

          <section id="avatar" className={cardClasses}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-inner">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">Foto Profil</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Perbarui foto profil lokal Anda
                </p>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleAvatarSave}>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-rose-50 flex items-center justify-center text-2xl font-semibold text-rose-600 overflow-hidden ring-4 ring-rose-50 dark:ring-slate-800">
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

                <div className="flex-1 space-y-3 w-full text-center sm:text-left">
                  <label className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Unggah Foto Baru
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-rose-50 file:text-rose-700
                      hover:file:bg-rose-100
                      dark:file:bg-slate-800 dark:file:text-slate-200
                    "
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Gunakan gambar rasio persegi untuk hasil optimal.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className={secondaryButtonClasses}
                  disabled={isSavingAvatar}
                >
                  <UploadCloud className="w-4 h-4" />
                  {isSavingAvatar ? "Menyimpan..." : "Simpan Foto Profil"}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div>
          <section id="security" className={cardClasses}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-inner">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">
                  Keamanan Akun
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Atur ulang password akun Anda
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handlePasswordSubmit}>
              <div className="space-y-2">
                <label htmlFor="current_password" className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400 ml-1">
                  Password Saat Ini
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="current_password"
                    type="password"
                    className={`${inputClasses} pl-12`}
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

              <div className="space-y-2">
                <label htmlFor="new_password" className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400 ml-1">
                  Password Baru
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="new_password"
                    type="password"
                    className={`${inputClasses} pl-12`}
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

              <div className="space-y-2">
                <label htmlFor="confirm_password" className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400 ml-1">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="confirm_password"
                    type="password"
                    className={`${inputClasses} pl-12`}
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

              <div className="pt-2">
                <button
                  type="submit"
                  className={primaryButtonClasses}
                  disabled={isSavingPassword}
                >
                  {isSavingPassword ? "Memperbarui..." : "Perbarui Password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfileDashboard;
