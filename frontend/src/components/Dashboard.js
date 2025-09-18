import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { dashboardService } from '../services/api'; 
import { 
  Users, 
  AlertTriangle, 
  BookOpen, 
  TrendingUp,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Plus
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReportAnimating, setIsReportAnimating] = useState(false);
  const animationTimeoutRef = useRef(null);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'kepala_sekolah' || user?.role === 'wakil_kepala_sekolah') {
        fetchDashboardStats();
    } else {
        setLoading(false);
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      const response = await dashboardService.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
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

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const getRoleDisplayName = (role) => {
    const roleNames = {
      admin: 'Administrator',
      kepala_sekolah: 'Kepala Sekolah',
      wakil_kepala_sekolah: 'Wakil Kepala Sekolah',
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

  const handleReportClick = () => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    setIsReportAnimating(true);
    animationTimeoutRef.current = setTimeout(() => {
      setIsReportAnimating(false);
    }, 450);
  };

  const canReportViolation = user?.role === 'guru_umum' || user?.role === 'wali_kelas' || user?.role === 'guru_bk';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
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
        {(user?.role === 'admin' || user?.role === 'kepala_sekolah' || user?.role === 'wakil_kepala_sekolah') && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="stats-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Siswa</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_siswa}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="stats-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Pelanggaran</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_pelanggaran}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="stats-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Kelas</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_kelas}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="stats-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Pelanggaran Bulan Ini</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.recent_violations}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {canReportViolation && (
        <Link
          to="/violations/report"
          onClick={handleReportClick}
          className={`floating-report-button ${isReportAnimating ? 'clicked' : ''}`}
          aria-label="Buka formulir laporan pelanggaran"
        >
          <span className="floating-report-button__icon">
            <Plus className="w-6 h-6" />
          </span>
          <span className="floating-report-button__label">Laporkan Pelanggaran</span>
        </Link>
      )}
    </>
  );
};

export default Dashboard;
