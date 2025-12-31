// Entry utama aplikasi React yang mengatur routing, tema, dan konteks autentikasi global
import React, { useState, useEffect, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import "./App.css";

import { authService } from "./services/api";

import Login from "./components/Login";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import StudentManagement from "./components/StudentManagement";
import UserManagement from "./components/UserManagement";
import ViolationReporting from "./components/ViolationReporting";
import ViolationManagement from "./components/ViolationManagement";
import AchievementManagement from "./components/AchievementManagement";
import MasterData from "./components/MasterData";
import ProfileDashboard from "./components/ProfileDashboard";
import MonthlyReport from "./components/MonthlyReport";
import StudentReport from "./components/StudentReport";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { Instagram } from "lucide-react";

// Menyediakan data autentikasi agar dapat diakses lintas komponen
const AuthContext = React.createContext();

// Guard komponen yang membatasi akses berdasarkan peran pengguna terautentikasi
const RoleRoute = ({ component: Component, allowedRoles }) => {
  const { user } = useContext(AuthContext);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Component />;
};

// Komponen root yang memuat router, sinkronisasi tema, serta state autentikasi
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode] = useState(false);
  const appVersion = process.env.REACT_APP_APP_VERSION || "v1.5.0";
  const instagramHandle = process.env.REACT_APP_INSTAGRAM || "@y_usr1";
  const instagramUrl = instagramHandle.startsWith("http")
    ? instagramHandle
    : `https://instagram.com/${instagramHandle.replace(/^@/, "")}`;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Mengambil profil pengguna terbaru untuk mengisi konteks autentikasi
  const fetchCurrentUser = async () => {
    try {
      const response = await authService.getCurrentUser();
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      localStorage.removeItem("token");
    }
    setLoading(false);
  };

  // Melakukan login dan menyimpan token + profil pengguna
  const login = async (nip, password) => {
    try {
      const response = await authService.login(nip, password);
      const { access_token, user: userData } = response.data;

      localStorage.setItem("token", access_token);
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      const networkError = !error?.response;
      return { success: false, networkError };
    }
  };

  // Mengosongkan state autentikasi serta token saat logout
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  // Helper untuk memuat ulang data pengguna ketika profil berubah
  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  // Menggabungkan perubahan profil lokal ke konteks tanpa memanggil API
  const updateUserContext = (data) => {
    setUser((prev) => (prev ? { ...prev, ...data } : prev));
  };

  // Menyalakan atau mematikan mode gelap aplikasi
  const toggleDarkMode = () => { }; // Disabled

  useEffect(() => {
    document.documentElement.classList.remove("dark-mode");
    document.body.classList.remove("dark-mode");
    localStorage.setItem("theme", "light");
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // Paket fungsi dan state yang diekspos ke seluruh aplikasi melalui konteks
  const authValue = {
    user,
    login,
    logout,
    refreshUser,
    updateUserContext,
    isDarkMode,
    toggleDarkMode,
  };

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={authValue}>
      <div className={`App ${isDarkMode ? "dark-mode" : ""}`}>
        <BrowserRouter>
          {user ? (
            <div className="flex h-screen bg-gray-50">
              <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                variant={isAdmin ? "persistent" : "overlay"}
              />

              {/* Mobile overlay when sidebar is open */}
              {isSidebarOpen && (
                <div
                  className={`fixed inset-0 bg-black/40 z-[900] ${isAdmin ? "md:hidden" : ""
                    }`}
                  onClick={() => setIsSidebarOpen(false)}
                />
              )}

              <div
                className={`flex-1 flex flex-col overflow-hidden ${isAdmin ? "md:ml-[280px]" : ""
                  }`}
              >
                <Header
                  onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route
                      path="/students"
                      element={
                        <RoleRoute
                          component={StudentManagement}
                          allowedRoles={["admin", "kepala_sekolah"]}
                        />
                      }
                    />
                    <Route
                      path="/users"
                      element={
                        <RoleRoute
                          component={UserManagement}
                          allowedRoles={["admin"]}
                        />
                      }
                    />
                    <Route
                      path="/violations/report"
                      element={<ViolationReporting />}
                    />
                    <Route
                      path="/violations/manage"
                      element={
                        <RoleRoute
                          component={ViolationManagement}
                          allowedRoles={["admin", "kepala_sekolah"]}
                        />
                      }
                    />
                    <Route
                      path="/achievements"
                      element={
                        <RoleRoute
                          component={AchievementManagement}
                          allowedRoles={["admin", "kepala_sekolah"]}
                        />
                      }
                    />
                    <Route
                      path="/achievements/manage"
                      element={
                        <RoleRoute
                          component={AchievementManagement}
                          allowedRoles={["admin", "kepala_sekolah"]}
                        />
                      }
                    />
                    <Route
                      path="/reports/monthly"
                      element={
                        <RoleRoute
                          component={MonthlyReport}
                          allowedRoles={["admin", "kepala_sekolah"]}
                        />
                      }
                    />
                    <Route
                      path="/reports/students"
                      element={
                        <RoleRoute
                          component={StudentReport}
                          allowedRoles={["admin", "guru_bk", "wali_kelas"]}
                        />
                      }
                    />
                    <Route
                      path="/master-data"
                      element={
                        <RoleRoute
                          component={MasterData}
                          allowedRoles={["admin"]}
                        />
                      }
                    />
                    <Route path="/profile" element={<ProfileDashboard />} />
                    <Route
                      path="*"
                      element={<Navigate to="/dashboard" replace />}
                    />
                  </Routes>
                </main>
                <footer className="app-footer">
                  <div className="app-footer__credit">
                    <span className="app-footer__label">
                      Developed by
                    </span>
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="app-footer__social"
                      aria-label="Instagram sekolah"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  </div>
                  <span className="app-footer__version">
                    Versi {appVersion}
                  </span>
                </footer>
              </div>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </BrowserRouter>
        <Toaster position="top-right" />
      </div>
    </AuthContext.Provider>
  );
}

export { AuthContext };
export default App;
