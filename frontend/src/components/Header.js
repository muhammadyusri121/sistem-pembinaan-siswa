import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../App';
import { Bell, Search, Menu, UserCircle, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/api';

const Header = ({ onToggleSidebar }) => {
  const { user } = useContext(AuthContext);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [studentsMap, setStudentsMap] = useState({});
  const [typesMap, setTypesMap] = useState({});

  const lastSeenKey = 'notif_last_seen';
  const getLastSeen = () => {
    const v = localStorage.getItem(lastSeenKey);
    return v ? new Date(v) : new Date(0);
  };
  const setLastSeen = (date) => localStorage.setItem(lastSeenKey, date.toISOString());

  useEffect(() => {
    // Prefetch helper data (students and violation types)
    const fetchHelpers = async () => {
      try {
        const [sRes, tRes] = await Promise.all([
          apiClient.get('/siswa'),
          apiClient.get('/master-data/jenis-pelanggaran'),
        ]);
        const sm = {};
        sRes.data.forEach((s) => (sm[s.nis] = s));
        setStudentsMap(sm);
        const tm = {};
        tRes.data.forEach((t) => (tm[t.id] = t));
        setTypesMap(tm);
      } catch (_) {
        // ignore helper fetch errors
      }
    };
    fetchHelpers();
  }, []);

  useEffect(() => {
    let active = true;
    const fetchNotifs = async () => {
      setLoadingNotif(true);
      try {
        const res = await apiClient.get('/pelanggaran');
        // Keep only newly reported, sort by created_at desc and limit
        const list = (res.data || [])
          .filter((v) => v.status === 'reported')
          .slice()
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 10);
        if (!active) return;
        setNotifications(list);
        const lastSeen = getLastSeen();
        const unread = list.filter((v) => new Date(v.created_at) > lastSeen);
        setUnreadCount(unread.length);
      } catch (e) {
        // noop
      } finally {
        if (active) setLoadingNotif(false);
      }
    };
    fetchNotifs();
    const id = setInterval(fetchNotifs, 30000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const markAllRead = () => {
    setLastSeen(new Date());
    setUnreadCount(0);
  };

  return (
    <header className="header">
      <div className="flex items-center gap-4">
        <button
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
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
        <div className="relative">
          <button
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => {
              setIsNotifOpen((v) => !v);
              if (!isNotifOpen) markAllRead();
            }}
            aria-label="Notifikasi"
          >
            <Bell className="w-6 h-6 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <p className="font-semibold text-gray-900">Notifikasi</p>
                <button onClick={markAllRead} className="text-sm text-blue-600 hover:underline">
                  Tandai sudah dibaca
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {loadingNotif ? (
                  <div className="p-4 text-sm text-gray-500">Memuat...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">Belum ada laporan</div>
                ) : (
                  notifications.map((n) => {
                    const s = studentsMap[n.nis_siswa];
                    const t = typesMap[n.jenis_pelanggaran_id];
                    return (
                      <div key={n.id} className="p-4 border-b last:border-b-0 hover:bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">
                              Laporan baru untuk <span className="font-semibold">{s?.nama || n.nis_siswa}</span>
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {t ? `${t.nama_pelanggaran} • ${t.kategori} (${t.poin} poin)` : 'Pelanggaran'}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(n.created_at).toLocaleString('id-ID')}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {n.tempat}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="px-4 py-3 bg-gray-50 rounded-b-xl">
                <Link to="/violations/manage" className="text-sm text-blue-600 hover:underline">
                  Lihat semua pelanggaran
                </Link>
              </div>
            </div>
          )}
        </div>

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
