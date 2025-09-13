import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
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
  UserCheck
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserManagement = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'guru_umum',
    kelas_binaan: '',
    angkatan_binaan: ''
  });

  const roleOptions = [
    { value: 'admin', label: 'Administrator', icon: Crown },
    { value: 'kepala_sekolah', label: 'Kepala Sekolah/Wakil', icon: GraduationCap },
    { value: 'wali_kelas', label: 'Wali Kelas', icon: BookOpen },
    { value: 'guru_bk', label: 'Guru BK', icon: UserCheck },
    { value: 'guru_umum', label: 'Guru Umum/Tim Tatib', icon: Users }
  ];

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Gagal memuat data pengguna');
    }
    setLoading(false);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/users`, newUser);
      toast.success('Pengguna berhasil ditambahkan');
      setShowAddModal(false);
      setNewUser({
        username: '',
        email: '',
        full_name: '',
        password: '',
        role: 'guru_umum',
        kelas_binaan: '',
        angkatan_binaan: ''
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to add user:', error);
      toast.error('Gagal menambahkan pengguna');
    }
  };

  const getRoleIcon = (role) => {
    const roleOption = roleOptions.find(option => option.value === role);
    const IconComponent = roleOption?.icon || Users;
    return <IconComponent className="w-4 h-4" />;
  };

  const getRoleLabel = (role) => {
    const roleOption = roleOptions.find(option => option.value === role);
    return roleOption?.label || role;
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'badge-danger';
      case 'kepala_sekolah': return 'badge-warning';
      case 'wali_kelas': return 'badge-info';
      case 'guru_bk': return 'badge-success';
      default: return 'badge-info';
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Akses Terbatas</h2>
          <p className="text-gray-600">Anda tidak memiliki akses untuk mengelola pengguna.</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Pengguna</h1>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {roleOptions.map(({ value, label, icon: IconComponent }) => {
          const count = users.filter(u => u.role === value).length;
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
            placeholder="Cari berdasarkan username, nama, atau email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="modern-input pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="modern-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Nama Lengkap</th>
                <th>Email</th>
                <th>Role</th>
                <th>Kelas/Angkatan</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.username}</td>
                  <td>{u.full_name}</td>
                  <td className="text-gray-600">{u.email}</td>
                  <td>
                    <div className={`badge ${getRoleBadgeColor(u.role)} flex items-center gap-1`}>
                      {getRoleIcon(u.role)}
                      {getRoleLabel(u.role)}
                    </div>
                  </td>
                  <td>
                    {u.kelas_binaan && (
                      <span className="badge badge-info">Kelas {u.kelas_binaan}</span>
                    )}
                    {u.angkatan_binaan && (
                      <span className="badge badge-info">Angkatan {u.angkatan_binaan}</span>
                    )}
                    {!u.kelas_binaan && !u.angkatan_binaan && (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {u.is_active ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Tambah Pengguna Baru</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    className="modern-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
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
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
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
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="modern-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="modern-input"
                  >
                    {roleOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Conditional fields based on role */}
              {newUser.role === 'wali_kelas' && (
                <div className="form-group">
                  <label className="form-label">Kelas Binaan</label>
                  <input
                    type="text"
                    value={newUser.kelas_binaan}
                    onChange={(e) => setNewUser({...newUser, kelas_binaan: e.target.value})}
                    className="modern-input"
                    placeholder="contoh: 10A"
                  />
                </div>
              )}
              
              {newUser.role === 'guru_bk' && (
                <div className="form-group">
                  <label className="form-label">Angkatan Binaan</label>
                  <input
                    type="text"
                    value={newUser.angkatan_binaan}
                    onChange={(e) => setNewUser({...newUser, angkatan_binaan: e.target.value})}
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
    </div>
  );
};

export default UserManagement;