import React, { useState, useEffect, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import "./App.css";

import { authService } from "./services/api";

import Login from "./components/Login";
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

const AuthContext = React.createContext();

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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark"
  );
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

  const login = async (nip, password) => {
    try {
      const response = await authService.login(nip, password);
      const { access_token, user: userData } = response.data;

      localStorage.setItem("token", access_token);
      setUser(userData);
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const updateUserContext = (data) => {
    setUser((prev) => (prev ? { ...prev, ...data } : prev));
  };

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  useEffect(() => {
    const classMethod = isDarkMode ? "add" : "remove";
    document.documentElement.classList[classMethod]("dark-mode");
    document.body.classList[classMethod]("dark-mode");
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

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
                  className={`fixed inset-0 bg-black/40 z-[900] ${
                    isAdmin ? "md:hidden" : ""
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                />
              )}

              <div
                className={`flex-1 flex flex-col overflow-hidden ${
                  isAdmin ? "md:ml-[280px]" : ""
                }`}
              >
                <Header
                  onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route
                      path="/students"
                      element={
                        <RoleRoute
                          component={StudentManagement}
                          allowedRoles={[
                            "admin",
                            "kepala_sekolah",
                            "wakil_kepala_sekolah",
                          ]}
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
                          allowedRoles={[
                            "admin",
                            "kepala_sekolah",
                            "wakil_kepala_sekolah",
                          ]}
                        />
                      }
                    />
                    <Route
                      path="/achievements"
                      element={
                        <RoleRoute
                          component={AchievementManagement}
                          allowedRoles={[
                            "admin",
                            "kepala_sekolah",
                            "wakil_kepala_sekolah",
                          ]}
                        />
                      }
                    />
                    <Route
                      path="/achievements/manage"
                      element={
                        <RoleRoute
                          component={AchievementManagement}
                          allowedRoles={[
                            "admin",
                            "kepala_sekolah",
                            "wakil_kepala_sekolah",
                          ]}
                        />
                      }
                    />
                    <Route
                      path="/reports/monthly"
                      element={
                        <RoleRoute
                          component={MonthlyReport}
                          allowedRoles={[
                            "admin",
                            "kepala_sekolah",
                            "wakil_kepala_sekolah",
                          ]}
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
                      className="app-footer__social w-30 h-5"
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
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
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
