// Panel administrasi pengguna dengan manajemen peran dan statistik akun
import React, { useState, useEffect, useContext, useMemo } from "react";
import { AuthContext } from "../App";
import { apiClient } from "../services/api";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Search,
  Shield,
  Edit,
  Trash2,
  Crown,
  BookOpen,
  GraduationCap,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Manajemen akun bagi admin untuk mengatur akses pengguna lain
const UserManagement = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [newUser, setNewUser] = useState({
    nip: "",
    email: "",
    full_name: "",
    password: "",
    role: "guru_umum",
    kelas_binaan: "",
    angkatan_binaan: "",
  });

  const [editUser, setEditUser] = useState({
    id: "",
    nip: "",
    email: "",
    full_name: "",
    password: "",
    role: "guru_umum",
    kelas_binaan: "",
    angkatan_binaan: "",
    is_active: true,
  });

  const formatKelasDisplay = (value) => (Array.isArray(value) ? value.join(", ") : value || "");

  const kelasOptions = ["10", "11", "12"];

  const roleMetadata = {
    admin: { label: "Administrator", icon: Crown },
    kepala_sekolah: { label: "Kepala/Wakil Kepala Sekolah", icon: GraduationCap },
    wali_kelas: { label: "Wali Kelas", icon: BookOpen },
    guru_bk: { label: "Guru BK", icon: UserCheck },
    guru_umum: { label: "Guru Umum/Tim Tatib", icon: Users },
  };

  const selectableRoleOptions = Object.entries(roleMetadata)
    .filter(([value]) => value !== "admin")
    .map(([value, meta]) => ({ value, ...meta }));

  const statsRoleOptions = Object.entries(roleMetadata)
    .filter(([value]) => !["admin", "kepala_sekolah"].includes(value))
    .map(([value, meta]) => ({ value, ...meta }));

  useEffect(() => {
    if (user?.role === "admin") {
      fetchUsers();
    }
  }, [user]);

  // Mengambil daftar pengguna terkini dari backend
  const fetchUsers = async () => {
    try {
      const response = await apiClient.get(`/users`);
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Gagal memuat data pengguna");
    }
    setLoading(false);
  };

  // Menambah pengguna baru dengan validasi tambahan sesuai peran
  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      if (!newUser.nip) {
        toast.error("NIP wajib diisi");
        return;
      }
      const payload = { ...newUser };
      if (payload.role === "guru_bk" || payload.role === "wali_kelas") {
        payload.angkatan_binaan = null;
      }
      delete payload.kelas_binaan;
      delete payload.kelas_binaan;
      await apiClient.post(`/users`, payload);
      toast.success("Pengguna berhasil ditambahkan");
      setShowAddModal(false);
      setNewUser({
        nip: "",
        email: "",
        full_name: "",
        password: "",
        role: "guru_umum",
        kelas_binaan: "",
        angkatan_binaan: "",
      });
      fetchUsers();
    } catch (error) {
      console.error("Failed to add user:", error);
      const detail = error?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item?.msg).filter(Boolean).join(", ")
        : detail;
      toast.error(message || "Gagal menambahkan pengguna");
    }
  };

  const getRoleIcon = (role) => {
    const meta = roleMetadata[role];
    const IconComponent = meta?.icon || Users;
    return <IconComponent className="h-4 w-4" />;
  };

  const getRoleLabel = (role) => {
    const meta = roleMetadata[role];
    return meta?.label || role;
  };

  const roleBadgeTone = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-200";
      case "kepala_sekolah":
        return "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100";
      case "wali_kelas":
        return "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-100";
      case "guru_bk":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
    }
  };

  const statusBadgeTone = (active) =>
    active
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100"
      : "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-200";

  // Menampilkan modal edit dengan mengisi state berdasarkan user terpilih
  const openEditModal = (u) => {
    setSelectedUser(u);
    setEditUser({
      id: u.id,
      nip: u.nip,
      email: u.email,
      full_name: u.full_name,
      password: "",
      role: u.role,
      kelas_binaan: formatKelasDisplay(u.kelas_binaan),
      angkatan_binaan: u.angkatan_binaan || "",
      is_active: u.is_active,
    });
    setShowEditModal(true);
  };

  // Menyimpan perubahan pengguna yang diedit sekaligus validasi peran BK
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...editUser };
      delete payload.id;
      if (!payload.password) delete payload.password;
      if (payload.role === "guru_bk" || payload.role === "wali_kelas") {
        payload.angkatan_binaan = null;
      }
      delete payload.kelas_binaan;
      await apiClient.put(`/users/${selectedUser.id}`, payload);
      toast.success("Pengguna berhasil diperbarui");
      setShowEditModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      console.error("Failed to update user:", error);
      const detail = error?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item?.msg).filter(Boolean).join(", ")
        : detail;
      toast.error(message || "Gagal memperbarui pengguna");
    }
  };

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!newEmail) return;
    if (newEmail === editUser.email) {
      toast.error("Email baru sama dengan yang lama");
      return;
    }

    try {
      await apiClient.put(`/users/${editUser.id}/email`, { new_email: newEmail });
      toast.success("Email berhasil diperbarui");
      setEditUser(prev => ({ ...prev, email: newEmail }));
      setShowEmailModal(false);
      setNewEmail("");
      fetchUsers();
    } catch (error) {
      console.error("Failed to update email:", error);
      const detail = error?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item?.msg).filter(Boolean).join(", ")
        : detail;
      toast.error(message || "Gagal memperbarui email");
    }
  };

  // Menghapus akun pengguna tertentu setelah konfirmasi pengguna
  const handleDeleteUser = async (u) => {
    const ok = window.confirm(`Hapus pengguna ${u.full_name}?`);
    if (!ok) return;
    try {
      await apiClient.delete(`/users/${u.id}`);
      toast.success("Pengguna berhasil dihapus");
      await fetchUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
      const msg = error?.response?.data?.detail || "Gagal menghapus pengguna";
      toast.error(msg);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      String(u.nip || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const userSearchOptions = useMemo(
    () =>
      users.map((u) => {
        const nip = u.nip ? `${u.nip}` : "";
        const email = u.email ? ` • ${u.email}` : "";
        return {
          label: `${u.full_name}${nip ? ` • ${nip}` : ""}${email}`,
          value: u.full_name || u.email || nip,
        };
      }),
    [users]
  );
  const filteredSearchSuggestions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (query.length < 2) return [];
    return userSearchOptions.filter((opt) => opt.label.toLowerCase().includes(query)).slice(0, 6);
  }, [searchTerm, userSearchOptions]);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const handleSort = (key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = (bValue || "").toString().toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sorted;
  }, [filteredUsers, sortConfig]);

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
  const iconButtonClasses =
    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-gray-700 shadow-sm ring-1 ring-black/5 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:ring-offset-rose-50 dark:bg-slate-900/70 dark:text-slate-100 dark:ring-slate-800/70 dark:hover:bg-slate-800 dark:focus:ring-rose-500/40 dark:focus:ring-offset-slate-950";

  if (user?.role !== "admin") {
    return (
      <div className={pageShellClasses}>
        <div className={`${cardClasses} flex flex-col items-center gap-3 text-center`}>
          <Shield className="h-14 w-14 text-gray-400 dark:text-slate-500" />
          <h2 className="text-2xl font-semibold">Akses Terbatas</h2>
          <p className="text-gray-600 dark:text-slate-400">
            Anda tidak memiliki akses untuk mengelola pengguna.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={pageShellClasses}>
        <div className="flex h-64 items-center justify-center">
          <div className="loading-spinner h-8 w-8 rounded-full border-2 border-rose-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${pageShellClasses} fade-in`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          {/* <div className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
            Administrasi
          </div> */}
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Manajemen Pengguna</h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Kelola akun, peran, dan akses pengguna sistem.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className={primaryButtonClasses}>
          <Plus className="h-50 w-4" />
          Tambah Pengguna
        </button>
      </div>

      <div className={`${cardClasses} p-6 sm:p-5`}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
              Ringkasan Pengguna
            </p>
            {/* <p className="text-[11px] text-gray-600 dark:text-slate-400">Total akun per peran</p> */}
          </div>
          <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm dark:bg-rose-500/15 dark:text-rose-200">
            {users.length} pengguna
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {statsRoleOptions.map(({ value, label, icon: IconComponent }) => {
            const count = users.filter((u) => u.role === value).length;
            return (
              <div
                key={value}
                className="flex items-center gap-2 rounded-[10px] border border-gray-100/80 bg-white/70 px-3 py-2 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-inner dark:bg-rose-500/15 dark:text-rose-200">
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                    {label}
                  </p>
                  <p className="text-base font-semibold text-gray-900 dark:text-slate-100">{count}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${cardClasses} !p-0 sm:!p-8 overflow-hidden`}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Cari berdasarkan NIP, nama, atau email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
            className={`${inputClasses} pl-12`}
          />
          {isSearchFocused && filteredSearchSuggestions.length > 0 && (
            <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-[8px] border border-rose-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
              {filteredSearchSuggestions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-2 text-sm text-gray-700 transition hover:bg-rose-50 dark:text-slate-100 dark:hover:bg-slate-800"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setSearchTerm(option.value);
                    setIsSearchFocused(false);
                  }}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`${cardClasses} !p-0 sm:!p-8 overflow-hidden`}>
        <div className="overflow-x-auto">
          <div className="max-h-[520px] overflow-y-auto">
            <table className="min-w-full table-auto text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-100 bg-[#C82020] text-xs font-semibold uppercase tracking-[0.2em] text-white dark:border-slate-800 dark:bg-[#a11818] dark:text-white">
                  <th
                    className="px-4 py-3 text-left rounded-tl-[8px] cursor-pointer hover:bg-rose-600 transition-colors group"
                    onClick={() => handleSort("nip")}
                  >
                    <div className="flex items-center gap-2">
                      NIP
                      {sortConfig.key === "nip" && (
                        sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-rose-600 transition-colors group"
                    onClick={() => handleSort("full_name")}
                  >
                    <div className="flex items-center gap-2">
                      Nama Lengkap
                      {sortConfig.key === "full_name" && (
                        sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-rose-600 transition-colors group"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      {sortConfig.key === "email" && (
                        sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-rose-600 transition-colors group"
                    onClick={() => handleSort("role")}
                  >
                    <div className="flex items-center gap-2">
                      Role
                      {sortConfig.key === "role" && (
                        sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left">Aksi</th>
                  <th className="px-4 py-3 text-left rounded-tr-[8px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-gray-100/80 transition hover:bg-rose-50 dark:border-slate-800/60 dark:hover:bg-slate-800"
                  >
                    <td className="px-4 py-4 align-top font-semibold text-gray-900 dark:text-slate-100">
                      {u.nip}
                    </td>
                    <td className="px-4 py-4 align-top text-gray-900 dark:text-slate-100">
                      {u.full_name}
                    </td>
                    <td className="px-4 py-4 align-top text-gray-600 dark:text-slate-400">
                      {u.email}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${roleBadgeTone(
                          u.role
                        )}`}
                      >
                        {getRoleIcon(u.role)}
                        {getRoleLabel(u.role)}
                      </div>
                      {(u.role === "wali_kelas" || u.role === "guru_bk") &&
                        Array.isArray(u.kelas_binaan) &&
                        u.kelas_binaan.length > 0 && (
                          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                            Kelas binaan: {formatKelasDisplay(u.kelas_binaan)}
                          </p>
                        )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(u)} className={iconButtonClasses} title="Edit pengguna">
                          <Edit className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                        </button>
                        {u.role !== "admin" && (
                          <button onClick={() => handleDeleteUser(u)} className={iconButtonClasses} title="Hapus pengguna">
                            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-300" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeTone(
                          u.is_active
                        )}`}
                      >
                        {u.is_active ? "Aktif" : "Tidak Aktif"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-3xl rounded-[12px] bg-white/95 p-8 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/80 dark:ring-1 dark:ring-slate-700/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                Tambah Pengguna
              </p>
              <h2 className="text-2xl font-semibold leading-tight">Tambah Pengguna Baru</h2>
            </div>
            <form onSubmit={handleAddUser} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    NIP
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={newUser.nip}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value)) {
                        setNewUser({ ...newUser, nip: value });
                      }
                    }}
                    className={inputClasses}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Email
                  </span>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className={inputClasses}
                    required
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Nama Lengkap
                </span>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className={inputClasses}
                  required
                />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Password
                  </span>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className={inputClasses}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Role
                  </span>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser((prev) => ({
                        ...prev,
                        role: e.target.value,
                        angkatan_binaan: e.target.value === "guru_bk" ? prev.angkatan_binaan : "",
                      }))
                    }
                    className={inputClasses}
                  >
                    {selectableRoleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {(newUser.role === "wali_kelas" || newUser.role === "guru_bk") && (
                <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                  Kelas binaan akan ditetapkan melalui menu Master Data Kelas setelah akun dibuat.
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className={secondaryButtonClasses}>
                  Batal
                </button>
                <button type="submit" className={primaryButtonClasses}>
                  Tambah Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="w-full max-w-3xl rounded-[12px] bg-white/95 p-8 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/80 dark:ring-1 dark:ring-slate-700/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                Edit Pengguna
              </p>
              <h2 className="text-2xl font-semibold leading-tight">Edit Pengguna</h2>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    NIP
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editUser.nip}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value)) {
                        setEditUser({ ...editUser, nip: value });
                      }
                    }}
                    className={inputClasses}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Email
                  </span>
                  <div className="relative">
                    <input
                      type="email"
                      value={editUser.email}
                      readOnly
                      className={`${inputClasses} bg-gray-100 dark:bg-slate-800 text-gray-500 cursor-not-allowed`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setNewEmail(editUser.email);
                        setShowEmailModal(true);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm ring-1 ring-gray-200 transition hover:bg-rose-50 dark:bg-slate-700 dark:text-rose-300 dark:ring-slate-600 dark:hover:bg-slate-600"
                    >
                      Ubah Email
                    </button>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Nama Lengkap
                  </span>
                  <input
                    type="text"
                    value={editUser.full_name}
                    onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                    className={inputClasses}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Password (opsional)
                  </span>
                  <input
                    type="password"
                    value={editUser.password}
                    onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                    className={inputClasses}
                    placeholder="Biarkan kosong jika tidak diubah"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Role
                  </span>
                  <select
                    value={editUser.role}
                    onChange={(e) =>
                      setEditUser((prev) => ({
                        ...prev,
                        role: e.target.value,
                        angkatan_binaan: e.target.value === "guru_bk" ? prev.angkatan_binaan : "",
                      }))
                    }
                    className={inputClasses}
                    disabled={editUser.role === "admin"}
                  >
                    {(editUser.role === "admin" ? [{ value: "admin", ...roleMetadata.admin }] : selectableRoleOptions).map(
                      (option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      )
                    )}
                  </select>
                  {editUser.role === "admin" && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Role admin tidak dapat diubah.</p>
                  )}
                </label>
              </div>

              {(editUser.role === "wali_kelas" || editUser.role === "guru_bk") && (
                <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                  Pengaturan kelas binaan kini dilakukan melalui menu Master Data Kelas.
                </div>
              )}

              {editUser.role !== "admin" && (
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Status
                  </span>
                  <select
                    value={editUser.is_active ? "1" : "0"}
                    onChange={(e) =>
                      setEditUser({
                        ...editUser,
                        is_active: e.target.value === "1",
                      })
                    }
                    className={inputClasses}
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Tidak Aktif</option>
                  </select>
                </label>
              )}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className={secondaryButtonClasses}>
                  Batal
                </button>
                <button type="submit" className={primaryButtonClasses}>
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEmailModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
          onClick={() => setShowEmailModal(false)}
        >
          <div
            className="w-full max-w-md rounded-[12px] bg-white/95 p-6 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/80 dark:ring-1 dark:ring-slate-700/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                Ubah Email
              </p>
              <h2 className="text-xl font-semibold leading-tight">Ganti Alamat Email</h2>
              <p className="text-xs text-rose-600 font-medium">
                Peringatan: Notifikasi kredensial akan dikirim ke email baru ini.
              </p>
            </div>
            <form onSubmit={handleUpdateEmail} className="space-y-6">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Email Baru
                </span>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={inputClasses}
                  placeholder="Masukkan email baru..."
                  autoFocus
                  required
                />
              </label>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowEmailModal(false)} className={secondaryButtonClasses}>
                  Batal
                </button>
                <button type="submit" className={primaryButtonClasses}>
                  Simpan Email Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div >
  );
};

export default UserManagement;
