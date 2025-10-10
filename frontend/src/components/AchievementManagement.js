// Modul manajemen prestasi siswa mencakup filter, CRUD, dan rangkuman statistik
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { format, parseISO } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { toast } from "sonner";
import {
  Award,
  Search,
  Plus,
  Trash2,
  Filter,
  Sparkles,
  ArrowUpRight,
  Trophy,
  Medal,
  User,
  CalendarDays,
} from "lucide-react";

import { AuthContext } from "../App";
import { achievementService, apiClient } from "../services/api";

// Nilai awal form prestasi agar setiap kali dibuka kembali selalu bersih
const defaultFormState = {
  nis_siswa: "",
  judul: "",
  kategori: "",
  tingkat: "",
  deskripsi: "",
  tanggal_prestasi: "",
  bukti: "",
  pemberi_penghargaan: "",
};

// Halaman administrasi prestasi yang menyatukan pencarian, filter, dan aksi pencatatan
const AchievementManagement = () => {
  const { user } = useContext(AuthContext);
  const [achievements, setAchievements] = useState([]);
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    kategori: "all",
    kelas: "all",
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState(defaultFormState);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  const canCreateAchievement = useMemo(
    () =>
      [
        "admin",
        "kepala_sekolah",
        "wakil_kepala_sekolah",
        "wali_kelas",
        "guru_bk",
        "guru_umum",
      ].includes(user?.role),
    [user?.role]
  );

  const canDeleteAchievement = useMemo(
    () => user?.role === "admin",
    [user?.role]
  );

  // Mengambil daftar prestasi dari server dengan filter berjalan
  const fetchAchievements = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setListLoading(true);
      }
      try {
        const params = {};
        if (filters.kategori !== "all") {
          params.kategori = filters.kategori;
        }
        if (filters.kelas !== "all") {
          params.kelas = filters.kelas;
        }
        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }
        const { data } = await achievementService.list(params);
        setAchievements(data);
      } catch (error) {
        console.error("Failed to fetch achievements", error);
        toast.error("Gagal memuat data prestasi");
      } finally {
        if (showLoader) {
          setListLoading(false);
        }
      }
    },
    [filters, searchTerm]
  );

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchStudents(), fetchSummary(), fetchAchievements()]);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [fetchAchievements]);

  useEffect(() => {
    if (!loading) {
      fetchAchievements();
    }
  }, [loading, fetchAchievements]);

  // Mendapatkan referensi siswa untuk ditampilkan pada form dan tabel
  const fetchStudents = async () => {
    try {
      const { data } = await apiClient.get("/siswa");
      setStudents(data);
    } catch (error) {
      console.error("Failed to fetch students", error);
      toast.error("Gagal memuat data siswa");
    }
  };

  // Mengambil ringkasan agregat prestasi untuk header statistik
  const fetchSummary = async () => {
    try {
      const { data } = await achievementService.summary();
      setSummary(data);
    } catch (error) {
      console.error("Failed to fetch achievement summary", error);
    }
  };

  // Utility kecil untuk menemukan data siswa tertentu berdasarkan NIS
  const getStudentInfo = (nis) => students.find((item) => item.nis === nis);

  // Membuka modal form sekaligus mengisi tanggal default hari ini
  const handleOpenForm = () => {
    const today = new Date().toISOString().slice(0, 10);
    setFormData({ ...defaultFormState, tanggal_prestasi: today });
    setIsFormOpen(true);
  };

  // Reset seluruh state form saat modal ditutup
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setFormSubmitting(false);
    setFormData(defaultFormState);
  };

  // Sinkronisasi input form dengan state lokal agar controlled component tetap konsisten
  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Submit form prestasi baru sekaligus menampilkan feedback ke pengguna
  const handleCreateAchievement = async (event) => {
    event.preventDefault();
    if (!formData.nis_siswa || !formData.judul || !formData.kategori || !formData.tanggal_prestasi) {
      toast.error("Lengkapi NIS siswa, judul, kategori, dan tanggal prestasi");
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        ...formData,
        poin: 0,
      };
      const { data } = await achievementService.create(payload);
      setAchievements((prev) => [data, ...prev]);
      toast.success("Prestasi berhasil dicatat");
      handleCloseForm();
      fetchSummary();
    } catch (error) {
      const detail = error?.response?.data?.detail || "Gagal menyimpan data prestasi";
      toast.error(detail);
    } finally {
      setFormSubmitting(false);
    }
  };

  const openDetailModal = (achievement) => {
    setSelectedAchievement(achievement);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setSelectedAchievement(null);
    setShowDetailModal(false);
  };

  // Menghapus data prestasi tertentu dengan konfirmasi loading pada baris terkait
  const handleDeleteAchievement = async (achievement) => {
    if (!achievement) {
      return;
    }
    if (!canDeleteAchievement && achievement.pencatat_id !== user?.id) {
      toast.error("Anda tidak memiliki akses menghapus prestasi ini");
      return;
    }

    const confirmDelete = window.confirm("Hapus prestasi ini? Tindakan tidak dapat dibatalkan");
    if (!confirmDelete) {
      return;
    }

    setDeleteLoadingId(achievement.id);
    try {
      await achievementService.remove(achievement.id);
      setAchievements((prev) => prev.filter((item) => item.id !== achievement.id));
      if (selectedAchievement?.id === achievement.id) {
        closeDetailModal();
      }
      toast.success("Prestasi berhasil dihapus");
      fetchSummary();
    } catch (error) {
      const detail = error?.response?.data?.detail || "Gagal menghapus data prestasi";
      toast.error(detail);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const kategoriOptions = useMemo(() => {
    const setKategori = new Set();
    achievements.forEach((item) => item.kategori && setKategori.add(item.kategori));
    summary?.kategori_populer?.forEach((item) => item.kategori && setKategori.add(item.kategori));
    return Array.from(setKategori);
  }, [achievements, summary]);

  const kelasOptions = useMemo(() => {
    const setKelas = new Set();
    students.forEach((student) => student.id_kelas && setKelas.add(student.id_kelas));
    achievements.forEach((item) => item.kelas_snapshot && setKelas.add(item.kelas_snapshot));
    return Array.from(setKelas);
  }, [students, achievements]);

  const formatDate = (value) => {
    if (!value) return "-";
    try {
      return format(parseISO(String(value)), "dd MMM yyyy", { locale: localeID });
    } catch (error) {
      return value;
    }
  };

  // Menyusun nama siswa dengan fall-back NIS untuk tampilan tabel
  const renderStudentName = (achievement) => {
    const info = getStudentInfo(achievement.nis_siswa);
    const kelasLabel = achievement.kelas_snapshot || info?.id_kelas || "-";
    if (!info) {
      return `${achievement.nis_siswa}${kelasLabel ? ` • ${kelasLabel}` : ""}`;
    }
    return `${info.nama} • ${kelasLabel}`;
  };

  const recentAchievementsCount = summary?.recent_achievements?.length ?? 0;
  const rankingStyles = [
    {
      container: "border-amber-200 bg-amber-50/80 shadow-sm",
      badgeCircle: "bg-amber-500 text-white",
      accent: "text-amber-600",
    },
    {
      container: "border-slate-200 bg-slate-50/80 shadow-sm",
      badgeCircle: "bg-slate-500 text-white",
      accent: "text-slate-600",
    },
    {
      container: "border-orange-200 bg-orange-50/80 shadow-sm",
      badgeCircle: "bg-orange-500 text-white",
      accent: "text-orange-600",
    },
  ];
  const defaultRankingStyle = {
    container: "border-gray-100 bg-white",
    badgeCircle: "bg-gray-100 text-gray-600",
    accent: "text-gray-600",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kelola Prestasi</h1>
          <p className="text-gray-600 mt-1">
            Dokumentasikan setiap pencapaian siswa dengan rapi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* <span className="text-sm text-gray-500">
            Total: {achievements.length} prestasi
          </span> */}
          {canCreateAchievement && (
            <button
              type="button"
              onClick={handleOpenForm}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Catat Prestasi
            </button>
          )}
        </div>
      </header>

      {/* {summary && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Prestasi</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.total_prestasi}
                </p>
              </div>
              <Award className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Kategori Aktif</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kategoriOptions.length}
                </p>
              </div>
              <Sparkles className="w-8 h-8 text-fuchsia-500" />
            </div>
          </div>
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Prestasi Terbaru</p>
                <p className="text-2xl font-bold text-gray-900">
                  {recentAchievementsCount}
                </p>
              </div>
              <ArrowUpRight className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </section>
      )} */}

      {/* Filters */}
      <section className="modern-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 transform" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="modern-input input-with-icon-left"
              placeholder="Cari berdasarkan nama siswa, judul, atau kategori..."
            />
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filters.kategori}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, kategori: event.target.value }))
                }
                className="modern-input md:w-48"
              >
                <option value="all">Semua Kategori</option>
                {kategoriOptions.map((kategori) => (
                  <option key={kategori} value={kategori}>
                    {kategori}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filters.kelas}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, kelas: event.target.value }))
                }
                className="modern-input md:w-48"
              >
                <option value="all">Semua Kelas</option>
                {kelasOptions.map((kelas) => (
                  <option key={kelas} value={kelas}>
                    {kelas}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="modern-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="modern-table min-w-full">
            <thead>
              <tr>
                <th className="w-56 text-left">Siswa</th>
                <th className="text-left">Judul Prestasi</th>
                <th className="text-left">Kategori</th>
                <th className="text-left">Tingkat</th>
                <th className="text-left">Tanggal</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center">
                    <div className="loading-spinner w-7 h-7 border-2 border-red-600 border-t-transparent rounded-full" />
                  </td>
                </tr>
              ) : achievements.length ? (
                achievements.map((achievement) => (
                  <tr key={achievement.id}>
                    <td>
                      <p className="font-semibold text-gray-900">
                        {renderStudentName(achievement)}
                      </p>
                      <p className="text-xs text-gray-500">NIS: {achievement.nis_siswa}</p>
                    </td>
                    <td>
                      <p className="font-medium text-gray-800">{achievement.judul}</p>
                      {achievement.deskripsi && (
                        <p className="text-xs text-gray-500 truncate max-w-xs">
                          {achievement.deskripsi}
                        </p>
                      )}
                    </td>
                    <td>{achievement.kategori || "-"}</td>
                    <td>{achievement.tingkat || "-"}</td>
                    <td>{formatDate(achievement.tanggal_prestasi)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => openDetailModal(achievement)}
                        >
                          Detail
                        </button>
                        {(canDeleteAchievement || achievement.pencatat_id === user?.id) && (
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleDeleteAchievement(achievement)}
                            disabled={deleteLoadingId === achievement.id}
                          >
                            {deleteLoadingId === achievement.id ? (
                              <div className="loading-spinner w-4 h-4 border border-red-600 border-t-transparent rounded-full" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-gray-500">
                    Belum ada prestasi yang dicatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="modern-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Prestasi Terbaru
              </h2>
            </div>
            {summary.recent_achievements?.length ? (
              <ul className="space-y-4">
                {summary.recent_achievements.map((item) => (
                  <li
                    key={item.id}
                    className="group rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                          <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-gray-900">
                            {item.judul}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{item.nama}</span>
                            <span className="text-gray-300">•</span>
                            <span>{item.kelas || "-"}</span>
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-600">
                              {item.kategori}
                            </span>
                            {item.tingkat && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-600">
                                {item.tingkat}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600">
                              <CalendarDays className="w-3 h-3" />
                              {formatDate(item.tanggal_prestasi)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-red-100 px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50"
                        onClick={() => {
                          const match = achievements.find((a) => a.id === item.id);
                          if (match) {
                            openDetailModal(match);
                          } else {
                            toast.info("Prestasi ada di luar filter saat ini");
                          }
                        }}
                      >
                        Lihat detail
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Belum ada catatan prestasi terbaru.</p>
            )}
          </div>

          <div className="modern-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 ">
                Papan Prestasi
              </h2>
            </div>
            {summary.top_students?.length ? (
              <ol className="space-y-4">
                {summary.top_students.map((student, index) => {
                  const style = rankingStyles[index] ?? defaultRankingStyle;
                  return (
                    <li
                      key={student.nis}
                      className={`flex items-center justify-between gap-4 rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${style.container}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold ${style.badgeCircle}`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{student.nama}</p>
                          <p className="text-xs text-gray-500">
                            {student.kelas || "-"} • {student.nis}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 text-sm font-semibold ${style.accent}`}>
                        <Medal className="w-4 h-4" />
                        <span>{student.total_prestasi} prestasi</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-gray-500">Belum ada data papan prestasi.</p>
            )}
          </div>
        </section>
      )}

      {isFormOpen && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal-content max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Catat Prestasi Siswa
            </h2>
            <form className="space-y-4" onSubmit={handleCreateAchievement}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Siswa</span>
                  <select
                    name="nis_siswa"
                    value={formData.nis_siswa}
                    onChange={handleFormChange}
                    className="modern-input"
                    required
                  >
                    <option value="">Pilih siswa</option>
                    {students.map((student) => (
                      <option key={student.nis} value={student.nis}>
                        {student.nama} • {student.id_kelas}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Tanggal Prestasi</span>
                  <input
                    type="date"
                    name="tanggal_prestasi"
                    value={formData.tanggal_prestasi}
                    onChange={handleFormChange}
                    className="modern-input"
                    required
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Judul Prestasi</span>
                  <input
                    type="text"
                    name="judul"
                    value={formData.judul}
                    onChange={handleFormChange}
                    className="modern-input"
                    placeholder="Contoh: Juara 1 Lomba Matematika"
                    required
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Kategori</span>
                  <input
                    type="text"
                    name="kategori"
                    value={formData.kategori}
                    onChange={handleFormChange}
                    className="modern-input"
                    placeholder="Akademik / Non-Akademik / Karakter"
                    required
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Tingkat</span>
                  <input
                    type="text"
                    name="tingkat"
                    value={formData.tingkat}
                    onChange={handleFormChange}
                    className="modern-input"
                    placeholder="Sekolah / Kecamatan / Provinsi"
                  />
                </label>

              </div>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">Deskripsi</span>
                <textarea
                  name="deskripsi"
                  rows="3"
                  value={formData.deskripsi}
                  onChange={handleFormChange}
                  className="modern-input"
                  placeholder="Tuliskan detail prestasi yang dicapai siswa"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Bukti</span>
                  <input
                    type="text"
                    name="bukti"
                    value={formData.bukti}
                    onChange={handleFormChange}
                    className="modern-input"
                    placeholder="URL bukti (opsional)"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Pemberi Penghargaan</span>
                  <input
                    type="text"
                    name="pemberi_penghargaan"
                    value={formData.pemberi_penghargaan}
                    onChange={handleFormChange}
                    className="modern-input"
                    placeholder="Nama pihak pemberi penghargaan"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={handleCloseForm}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={formSubmitting}>
                  {formSubmitting ? "Menyimpan..." : "Simpan Prestasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedAchievement && (
        <div className="modal-overlay" onClick={closeDetailModal}>
          <div className="modal-content max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Detail Prestasi</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500">Siswa</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {renderStudentName(selectedAchievement)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tanggal</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(selectedAchievement.tanggal_prestasi)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Kategori</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedAchievement.kategori || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tingkat</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedAchievement.tingkat || "-"}
                  </p>
                </div>
              </div>

              {selectedAchievement.deskripsi && (
                <div>
                  <p className="text-xs text-gray-500">Deskripsi</p>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                    {selectedAchievement.deskripsi}
                  </p>
                </div>
              )}

              {selectedAchievement.bukti && (
                <div>
                  <p className="text-xs text-gray-500">Bukti</p>
                  <a
                    href={selectedAchievement.bukti}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-red-600 hover:underline"
                  >
                    Lihat bukti
                  </a>
                </div>
              )}

              {selectedAchievement.pemberi_penghargaan && (
                <div>
                  <p className="text-xs text-gray-500">Pemberi Penghargaan</p>
                  <p className="text-sm text-gray-700 mt-1">
                    {selectedAchievement.pemberi_penghargaan}
                  </p>
                </div>
              )}

              {(canDeleteAchievement || selectedAchievement.pencatat_id === user?.id) && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="btn-danger flex items-center gap-2"
                    onClick={() => handleDeleteAchievement(selectedAchievement)}
                    disabled={deleteLoadingId === selectedAchievement.id}
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleteLoadingId === selectedAchievement.id ? "Menghapus..." : "Hapus"}
                  </button>
                </div>
              )}

              <div className="flex justify-end">
                <button type="button" className="btn-secondary" onClick={closeDetailModal}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AchievementManagement;
