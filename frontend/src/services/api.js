// Abstraksi client HTTP berbasis Axios untuk seluruh modul frontend
// import axios from 'axios';

// const API_BASE = process.env.REACT_APP_API_URL || '/api';

// const apiClient = axios.create({
//   baseURL: API_BASE,
// });
import axios from "axios";

// Fallback endpoint default ketika variabel lingkungan tidak disediakan
const fallback =
  process.env.NODE_ENV === "development" ? "http://localhost:8000/api" : "/api";

const API_BASE = process.env.REACT_APP_API_URL || fallback;

// Klien utama dengan baseURL dinamis sesuai environment
const apiClient = axios.create({
  baseURL: API_BASE,

});

// Sisipkan header Authorization otomatis jika token tersedia di localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);



// Layanan autentikasi: login dan informasi pengguna terautentikasi
export const authService = {
  login: (nip, password) => {
    const formData = new URLSearchParams();
    formData.append("username", nip);
    formData.append("password", password);
    return apiClient.post("/auth/login/", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  getCurrentUser: () => apiClient.get("/auth/me/"),
};

// Layanan dashboard untuk mengambil statistik agregat
export const dashboardService = {
  getStats: (params) => apiClient.get("/dashboard/stats/", { params }),
};

// Layanan prestasi siswa mencakup CRUD dan ringkasan agregat
export const achievementService = {
  list: (params) => apiClient.get("/prestasi/", { params }),
  create: (payload) => apiClient.post("/prestasi/", payload),
  update: (id, payload) => apiClient.put(`/prestasi/${id}/`, payload),
  updateStatus: (id, payload) =>
    apiClient.put(`/prestasi/${id}/status/`, payload),
  remove: (id) => apiClient.delete(`/prestasi/${id}/`),
  summary: () => apiClient.get("/prestasi/summary/"),
};

// Layanan profil pengguna untuk perubahan data personal dan password
export const profileService = {
  updateProfile: (payload) => apiClient.put("/auth/me/profile/", payload),
  updatePassword: (payload) => apiClient.put("/auth/me/password/", payload),
};

// Layanan siswa dengan endpoint publik yang sering digunakan
export const studentService = {
  list: () => apiClient.get("/siswa/"),
};

// Layanan pelanggaran untuk tindakan pembinaan cepat
export const violationService = {
  applyCounseling: (nis, payload) =>
    apiClient.post(`/pelanggaran/students/${nis}/pembinaan/`, payload),
};

// Layanan perwalian untuk manajemen guru wali dan siswa binaan
export const guardianshipService = {
  getConfig: () => apiClient.get("/perwalian/config/"),
  toggleConfig: (active) =>
    apiClient.post("/perwalian/config/toggle/", { active }),
  getTeachers: () => apiClient.get("/perwalian/teachers/"),
  updateTeachers: (userIds) =>
    apiClient.put("/perwalian/teachers/", { user_ids: userIds }),
  getMyStudents: () => apiClient.get("/perwalian/students/me/"),
  addStudent: (nis) =>
    apiClient.post("/perwalian/students/", { nis_siswa: nis }),
  removeStudent: (nis) => apiClient.delete(`/perwalian/students/${nis}/`),
  getMonitorStats: () => apiClient.get("/perwalian/admin/monitor/"),
  getStudentDetails: (nis) => apiClient.get(`/perwalian/students/${nis}/details/`),
  getTeacherStudents: (teacherId) => apiClient.get(`/perwalian/admin/teachers/${teacherId}/students`),
};

// Layanan data master (kelas, dsb) yang dibutuhkan banyak halaman
export const masterDataService = {
  classes: () => apiClient.get("/master-data/kelas/"),
};

// Layanan CMS untuk manajemen konten landing page
export const cmsService = {
  getLandingPageContent: () => apiClient.get("/cms/landing-page"),
  getPublicStats: () => apiClient.get("/cms/stats"),
  updateHeroText: (payload) => apiClient.put("/cms/hero-text", payload),
  uploadHeroImage: (formData) =>
    apiClient.post("/cms/hero-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  addGalleryItem: (formData) =>
    apiClient.post("/cms/gallery", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteGalleryItem: (id) => apiClient.delete(`/cms/gallery/${id}`),
  getDashboardCarousel: () => apiClient.get("/cms/dashboard-carousel"),
  addDashboardCarouselItem: (formData, params) =>
    apiClient.post("/cms/dashboard-carousel", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      params: params
    }),
  deleteDashboardCarouselItem: (id) => apiClient.delete(`/cms/dashboard-carousel/${id}`),
};

export { apiClient };
