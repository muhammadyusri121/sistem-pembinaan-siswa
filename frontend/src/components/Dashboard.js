import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { 
  Users, 
  AlertTriangle, 
  BookOpen, 
  TrendingUp,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Set default stats if request fails
      setStats({
        total_siswa: 0,
        total_pelanggaran: 0,
        total_users: 0,
        total_kelas: 0,
        recent_violations: 0
      });
    }
    setLoading(false);
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      admin: 'Administrator',
      kepala_sekolah: 'Kepala Sekolah/Wakil',
      wali_kelas: 'Wali Kelas',
      guru_bk: 'Guru BK',
      guru_umum: 'Guru Umum'
    };
    return roleNames[role] || role;
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {getWelcomeMessage()}, {user?.full_name}!
              </h1>
              <p className="text-xl text-gray-600 mb-4">
                {getRoleDisplayName(user?.role)} - Sistem Pembinaan Siswa
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date().toLocaleDateString('id-ID', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>Status: Aktif</span>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <img 
                src="https://images.unsplash.com/photo-1561346745-5db62ae43861" 
                alt="Student Guidance" 
                className="w-32 h-32 rounded-2xl object-cover shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {(user?.role === 'admin' || user?.role === 'kepala_sekolah') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Siswa</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.total_siswa || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-green-600 font-medium">+5%</span>
              <span className="text-gray-500">dari bulan lalu</span>
            </div>
          </div>

          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Pelanggaran</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.total_pelanggaran || 0}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-red-500" />
              <span className="text-red-600 font-medium">+12%</span>
              <span className="text-gray-500">dari bulan lalu</span>
            </div>
          </div>

          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Kelas</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.total_kelas || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-green-600 font-medium">Stabil</span>
              <span className="text-gray-500">tahun ajaran ini</span>
            </div>
          </div>

          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Pelanggaran Bulan Ini</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.recent_violations || 0}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-yellow-500" />
              <span className="text-yellow-600 font-medium">Perlu Perhatian</span>
              <span className="text-gray-500">monitoring aktif</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="modern-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Aktivitas Terbaru</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Pelanggaran baru dilaporkan</p>
                <p className="text-sm text-gray-600">Siswa Ahmad Rizki - Terlambat datang ke sekolah</p>
                <p className="text-xs text-gray-500 mt-1">2 jam yang lalu</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Data siswa baru ditambahkan</p>
                <p className="text-sm text-gray-600">15 siswa kelas X baru berhasil diimport</p>
                <p className="text-xs text-gray-500 mt-1">1 hari yang lalu</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Pembinaan selesai</p>
                <p className="text-sm text-gray-600">Siti Aminah - Konseling dengan Guru BK</p>
                <p className="text-xs text-gray-500 mt-1">2 hari yang lalu</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="modern-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Ringkasan Cepat</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-red-900">Perlu Tindak Lanjut</p>
                <p className="text-xs text-red-600">Pelanggaran berat</p>
              </div>
              <span className="text-xl font-bold text-red-600">3</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-yellow-900">Dalam Pembinaan</p>
                <p className="text-xs text-yellow-600">Proses konseling</p>
              </div>
              <span className="text-xl font-bold text-yellow-600">8</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-900">Selesai</p>
                <p className="text-xs text-green-600">Bulan ini</p>
              </div>
              <span className="text-xl font-bold text-green-600">24</span>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Tips */}
      <div className="modern-card p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Tips Penggunaan Sistem</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Upload Data Siswa</p>
              <p className="text-sm text-gray-600">Gunakan fitur upload CSV untuk menambah data siswa secara batch</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Lapor Pelanggaran</p>
              <p className="text-sm text-gray-600">Laporkan pelanggaran siswa dengan detail yang lengkap</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Monitor Progress</p>
              <p className="text-sm text-gray-600">Pantau perkembangan pembinaan siswa secara berkala</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;