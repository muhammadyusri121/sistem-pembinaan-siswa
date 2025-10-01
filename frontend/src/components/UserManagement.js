import React, { useState, useEffect, useContext } from "react";
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
  Eye,
  UserPlus,
  Crown,
  BookOpen,
  GraduationCap,
  UserCheck,
} from "lucide-react";

// Use configured API client with auth header

const UserManagement = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
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
    password: "", // optional
    role: "guru_umum",
    kelas_binaan: "",
    angkatan_binaan: "",
    is_active: true,
  });

  const parseKelasInput = (value) =>
    (value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const formatKelasDisplay = (value) =>
    Array.isArray(value) ? value.join(", ") : value || "";

  const roleMetadata = {
    admin: { label: "Administrator", icon: Crown },
    kepala_sekolah: { label: "Kepala Sekolah", icon: GraduationCap },
    wakil_kepala_sekolah: { label: "Wakil Kepala Sekolah", icon: UserPlus },
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

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      if (!newUser.nip) {
        toast.error("NIP wajib diisi");
        return;
      }
      const payload = { ...newUser };
      if (payload.role === "wali_kelas") {
        payload.kelas_binaan = parseKelasInput(payload.kelas_binaan);
      } else {
        delete payload.kelas_binaan;
      }
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
        ? detail
            .map((item) => item?.msg)
            .filter(Boolean)
            .join(", ")
        : detail;
      toast.error(message || "Gagal menambahkan pengguna");
    }
  };

  const getRoleIcon = (role) => {
    const meta = roleMetadata[role];
    const IconComponent = meta?.icon || Users;
    return <IconComponent className="w-4 h-4" />;
  };

  const getRoleLabel = (role) => {
    const meta = roleMetadata[role];
    return meta?.label || role;
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "badge-danger";
      case "kepala_sekolah":
      case "wakil_kepala_sekolah":
        return "badge-warning";
      case "wali_kelas":
        return "badge-info";
      case "guru_bk":
        return "badge-success";
      default:
        return "badge-info";
    }
  };

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

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...editUser };
      delete payload.id;
      if (!payload.password) delete payload.password;
      if (payload.role === "wali_kelas") {
        payload.kelas_binaan = parseKelasInput(payload.kelas_binaan);
      } else {
        delete payload.kelas_binaan;
      }
      await apiClient.put(`/users/${selectedUser.id}`, payload);
      toast.success("Pengguna berhasil diperbarui");
      setShowEditModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      console.error("Failed to update user:", error);
      const detail = error?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail
            .map((item) => item?.msg)
            .filter(Boolean)
            .join(", ")
        : detail;
      toast.error(message || "Gagal memperbarui pengguna");
    }
  };

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
      String(u.nip || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Akses Terbatas
          </h2>
          <p className="text-gray-600">
            Anda tidak memiliki akses untuk mengelola pengguna.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Manajemen Pengguna
          </h1>
          <p className="text-gray-600 mt-1">Kelola akun pengguna sistem</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Pengguna
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {statsRoleOptions.map(({ value, label, icon: IconComponent }) => {
          const count = users.filter((u) => u.role === value).length;
          return (
            <div key={value} className="stats-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
                <IconComponent className="w-8 h-8 text-red-600" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="modern-card p-6">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari berdasarkan NIP, nama, atau email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="modern-input input-with-icon-left"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="modern-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th>NIP</th>
                <th>Nama Lengkap</th>
                <th>Email</th>
                <th>Role</th>
                <th>Aksi</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.nip}</td>
                  <td>{u.full_name}</td>
                  <td className="text-gray-600">{u.email}</td>
                  <td>
                    <div
                      className={`badge ${getRoleBadgeColor(
                        u.role
                      )} flex items-center gap-1`}
                    >
                      {getRoleIcon(u.role)}
                      {getRoleLabel(u.role)}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit pengguna"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Hapus pengguna"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        u.is_active ? "badge-success" : "badge-danger"
                      }`}
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

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Tambah Pengguna Baru
            </h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">NIP</label>
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
                    className="modern-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    className="modern-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, full_name: e.target.value })
                  }
                  className="modern-input"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    className="modern-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                    className="modern-input"
                  >
                    {selectableRoleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditional fields based on role */}
              {newUser.role === "wali_kelas" && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                  Kelas binaan akan ditetapkan melalui menu Master Data Kelas
                  setelah akun dibuat.
                </div>
              )}

              {newUser.role === "guru_bk" && (
                <div className="form-group">
                  <label className="form-label">Angkatan Binaan</label>
                  <input
                    type="text"
                    value={newUser.angkatan_binaan}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        angkatan_binaan: e.target.value,
                      })
                    }
                    className="modern-input"
                    placeholder="contoh: 2024"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Tambah Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Edit Pengguna
            </h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">NIP</label>
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
                    className="modern-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={editUser.email}
                    onChange={(e) =>
                      setEditUser({ ...editUser, email: e.target.value })
                    }
                    className="modern-input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Nama Lengkap</label>
                  <input
                    type="text"
                    value={editUser.full_name}
                    onChange={(e) =>
                      setEditUser({ ...editUser, full_name: e.target.value })
                    }
                    className="modern-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password (opsional)</label>
                  <input
                    type="password"
                    value={editUser.password}
                    onChange={(e) =>
                      setEditUser({ ...editUser, password: e.target.value })
                    }
                    className="modern-input"
                    placeholder="Biarkan kosong jika tidak diubah"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    value={editUser.role}
                    onChange={(e) =>
                      setEditUser({ ...editUser, role: e.target.value })
                    }
                    className="modern-input"
                    disabled={editUser.role === "admin"}
                  >
                    {(editUser.role === "admin"
                      ? [{ value: "admin", ...roleMetadata.admin }]
                      : selectableRoleOptions
                    ).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {editUser.role === "admin" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Role admin tidak dapat diubah.
                    </p>
                  )}
                </div>
              </div>

              {/* Conditional fields based on role */}
              {editUser.role === "wali_kelas" && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                  Pengaturan kelas binaan kini dilakukan melalui menu Master
                  Data Kelas.
                </div>
              )}

              {editUser.role === "guru_bk" && (
                <div className="form-group">
                  <label className="form-label">Angkatan Binaan</label>
                  <input
                    type="text"
                    value={editUser.angkatan_binaan}
                    onChange={(e) =>
                      setEditUser({
                        ...editUser,
                        angkatan_binaan: e.target.value,
                      })
                    }
                    className="modern-input"
                    placeholder="contoh: 2024"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  value={editUser.is_active ? "1" : "0"}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      is_active: e.target.value === "1",
                    })
                  }
                  className="modern-input"
                >
                  <option value="1">Aktif</option>
                  <option value="0">Tidak Aktif</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
