import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { toast } from 'sonner';
import { Eye, EyeOff, School, Shield, Users } from 'lucide-react';

const Login = () => {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nip || !password) {
      toast.error('NIP/email dan password harus diisi');
      return;
    }

    setLoading(true);
    const success = await login(nip, password);
    setLoading(false);

    if (success) {
      toast.success('Login berhasil!');
    } else {
      toast.error('NIP/email atau password salah');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-red-500/5"></div>
      
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-red-600 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-red-400 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-red-300 rounded-full blur-2xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
            <School className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistem Pembinaan Siswa</h1>
          <p className="text-gray-600">Masuk ke akun Anda untuk mengakses sistem</p>
        </div>

        {/* Login Form */}
        <div className="modern-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <label className="form-label">NIP atau Email</label>
              <div className="relative">
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  className="modern-input input-with-icon-left"
                  placeholder="Masukkan NIP atau email Anda"
                  disabled={loading}
                />
                <Users className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="modern-input input-with-icon-left input-with-icon-right"
                  placeholder="Masukkan password Anda"
                  disabled={loading}
                />
                <Shield className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary h-14 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          {/* Demo credentials info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-2 font-medium">Demo Credentials:</p>
        <div className="space-y-1 text-xs text-gray-500">
          <p><strong>Admin:</strong> nip admin / admin123 atau admin@example.com</p>
          <p><strong>Guru:</strong> nip guru / guru123 atau guru@example.com</p>
          <p><strong>Wali Kelas:</strong> nip wali / wali123 atau wali@example.com</p>
        </div>
      </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © 2024 Sistem Pembinaan Siswa. Semua hak dilindungi.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
