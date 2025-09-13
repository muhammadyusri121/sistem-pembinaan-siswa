import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  FileText, 
  AlertTriangle, 
  Settings, 
  LogOut,
  School,
  BookOpen,
  Shield
} from 'lucide-react';

const Sidebar = ({ isOpen = false, onClose }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const menuItems = [
    {
      path: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      roles: ['admin', 'kepala_sekolah', 'wali_kelas', 'guru_bk', 'guru_umum']
    },
    {
      path: '/students',
      icon: BookOpen,
      label: 'Data Siswa',
      roles: ['admin', 'kepala_sekolah', 'wali_kelas', 'guru_bk', 'guru_umum']
    },
    {
      path: '/users',
      icon: Users,
      label: 'Manajemen User',
      roles: ['admin']
    },
    {
      path: '/violations/report',
      icon: FileText,
      label: 'Lapor Pelanggaran',
      roles: ['guru_umum', 'wali_kelas', 'guru_bk']
    },
    {
      path: '/violations/manage',
      icon: AlertTriangle,
      label: 'Kelola Pelanggaran',
      roles: ['admin', 'kepala_sekolah', 'wali_kelas', 'guru_bk']
    },
    {
      path: '/master-data',
      icon: Settings,
      label: 'Data Master',
      roles: ['admin']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  const handleLogout = () => {
    logout();
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <div className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      {/* Logo and Title */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
            <School className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">SPS</h2>
            <p className="text-gray-400 text-xs">Sistem Pembinaan Siswa</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">{user?.full_name}</p>
            <p className="text-gray-400 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="sidebar-item w-full text-left hover:bg-red-600/20 hover:text-red-400"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Keluar</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
