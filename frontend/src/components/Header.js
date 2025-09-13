import React, { useContext } from 'react';
import { AuthContext } from '../App';
import { Bell, Search, Menu, UserCircle } from 'lucide-react';

const Header = () => {
  const { user } = useContext(AuthContext);

  return (
    <header className="header">
      <div className="flex items-center gap-4">
        <button className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari siswa, NIS, atau nama..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-6 h-6 text-gray-600" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
            <UserCircle className="w-6 h-6 text-white" />
          </div>
          <div className="hidden md:block">
            <p className="font-semibold text-gray-900">{user?.full_name}</p>
            <p className="text-sm text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;