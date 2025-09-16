import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import './App.css';

import { authService } from './services/api'; 

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import StudentManagement from './components/StudentManagement';
import UserManagement from './components/UserManagement';
import ViolationReporting from './components/ViolationReporting';
import ViolationManagement from './components/ViolationManagement';
import MasterData from './components/MasterData';
import ProfileDashboard from './components/ProfileDashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const AuthContext = React.createContext();

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
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
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    try {
      const response = await authService.login(username, password);
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      setUser(userData);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const updateUserContext = (data) => {
    setUser((prev) => (prev ? { ...prev, ...data } : prev));
  };

  const authValue = {
    user,
    login,
    logout,
    refreshUser,
    updateUserContext,
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={authValue}>
      <div className="App">
        <BrowserRouter>
          {user ? (
            <div className="flex h-screen bg-gray-50">
              <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                variant={isAdmin ? 'persistent' : 'overlay'}
              />

              {/* Mobile overlay when sidebar is open */}
              {isSidebarOpen && (
                <div
                  className={`fixed inset-0 bg-black/40 z-[900] ${isAdmin ? 'md:hidden' : ''}`}
                  onClick={() => setIsSidebarOpen(false)}
                />
              )}

              <div className={`flex-1 flex flex-col overflow-hidden ${isAdmin ? 'md:ml-[280px]' : ''}`}>
                <Header onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/students" element={<StudentManagement />} />
                    <Route path="/users" element={<UserManagement />} />
                    <Route path="/violations/report" element={<ViolationReporting />} />
                    <Route path="/violations/manage" element={<ViolationManagement />} />
                    <Route path="/master-data" element={<MasterData />} />
                    <Route path="/profile" element={<ProfileDashboard />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </main>
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
