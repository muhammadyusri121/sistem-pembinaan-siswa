import axios from 'axios';

// URL dasar untuk semua permintaan API
const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Membuat instance axios dengan konfigurasi dasar
const apiClient = axios.create({
  baseURL: API_URL,
});

// Ini adalah "interceptor" yang akan menambahkan token otorisasi
// ke setiap request yang dikirim jika token tersedia di localStorage.
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// --- Kumpulan Service untuk Setiap Fitur ---

// Service untuk Autentikasi
export const authService = {
  login: (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    return apiClient.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  getCurrentUser: () => {
    return apiClient.get('/auth/me');
  },
};

// Service untuk Dashboard
export const dashboardService = {
  getStats: () => {
    return apiClient.get('/dashboard/stats');
  },
};

// Service untuk Manajemen Siswa
export const studentService = {
  getAll: () => apiClient.get('/siswa'),
  create: (studentData) => apiClient.post('/siswa', studentData),
  uploadCsv: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/siswa/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // Tambahkan fungsi update dan delete di sini jika diperlukan
};

// Service untuk Manajemen Pengguna
export const userService = {
  getAll: () => apiClient.get('/users'),
  create: (userData) => apiClient.post('/users', userData),
  // Tambahkan fungsi update dan delete di sini jika diperlukan
};

// Service untuk Pelanggaran
export const violationService = {
  // Mengambil jenis pelanggaran dari master data
  getViolationTypes: () => apiClient.get('/master-data/jenis-pelanggaran'),
  // Melaporkan pelanggaran baru
  report: (violationData) => apiClient.post('/pelanggaran', violationData),
  // Mengambil semua data pelanggaran (dengan filter berbasis peran di backend)
  getAll: () => apiClient.get('/pelanggaran'),
  // Tambahkan fungsi update status pelanggaran di sini jika diperlukan
};

// Service untuk Data Master
export const masterDataService = {
    getAllKelas: () => apiClient.get('/master-data/kelas'),
    createKelas: (data) => apiClient.post('/master-data/kelas', data),
    
    getAllJenisPelanggaran: () => apiClient.get('/master-data/jenis-pelanggaran'),
    createJenisPelanggaran: (data) => apiClient.post('/master-data/jenis-pelanggaran', data),

    getAllTahunAjaran: () => apiClient.get('/master-data/tahun-ajaran'),
    createTahunAjaran: (data) => apiClient.post('/master-data/tahun-ajaran', data),
};