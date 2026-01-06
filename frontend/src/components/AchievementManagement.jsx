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
  Search,
  Plus,
  Trash2,
  Filter,
  ArrowUpRight,
  Trophy,
  Medal,
  User,
  CalendarDays,
  ChevronDown,
} from "lucide-react";

import { AuthContext } from "../App";
import { achievementService, apiClient } from "../services/api";

// Nilai awal form prestasi agar setiap kali dibuka kembali selalu bersih
const defaultFormState = {
  nis_siswa: "",
  judul: "",
  kategori: "",
  tingkat: "",

  tanggal_prestasi: "",
  tanggal_prestasi: "",
  bukti: null,
  pemberi_penghargaan: "",
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
  const activeStudents = useMemo(
    () => students.filter((student) => student.status_siswa === "aktif"),
    [students]
  );

  const canCreateAchievement = useMemo(
    () =>
      [
        "admin",
        "kepala_sekolah",
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
        await Promise.all([
          fetchStudents(),
          fetchSummary(),
          fetchAchievements(),
        ]);
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
    if (
      !formData.nis_siswa ||
      !formData.judul ||
      !formData.kategori ||
      !formData.tanggal_prestasi
    ) {
      toast.error("Lengkapi NIS siswa, judul, kategori, dan tanggal prestasi");
      return;
    }

    setFormSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("nis_siswa", formData.nis_siswa);
      formDataToSend.append("judul", formData.judul);
      formDataToSend.append("kategori", formData.kategori);
      formDataToSend.append("tingkat", formData.tingkat || "");
      formDataToSend.append("tanggal_prestasi", formData.tanggal_prestasi);
      formDataToSend.append("pemberi_penghargaan", formData.pemberi_penghargaan || "");
      formDataToSend.append("poin", 0);

      if (formData.bukti) {
        formDataToSend.append("bukti", formData.bukti);
      }

      const { data } = await apiClient.post("/prestasi/", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setAchievements((prev) => [data, ...prev]);
      toast.success("Prestasi berhasil dicatat");
      handleCloseForm();
      fetchSummary();
    } catch (error) {
      console.error(error);
      const detail =
        error?.response?.data?.detail || "Gagal menyimpan data prestasi";
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

    const confirmDelete = window.confirm(
      "Hapus prestasi ini? Tindakan tidak dapat dibatalkan"
    );
    if (!confirmDelete) {
      return;
    }

    setDeleteLoadingId(achievement.id);
    try {
      await achievementService.remove(achievement.id);
      setAchievements((prev) =>
        prev.filter((item) => item.id !== achievement.id)
      );
      if (selectedAchievement?.id === achievement.id) {
        closeDetailModal();
      }
      toast.success("Prestasi berhasil dihapus");
      fetchSummary();
    } catch (error) {
      const detail =
        error?.response?.data?.detail || "Gagal menghapus data prestasi";
      toast.error(detail);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const kategoriOptions = useMemo(() => {
    const setKategori = new Set();
    achievements.forEach(
      (item) => item.kategori && setKategori.add(item.kategori)
    );
    summary?.kategori_populer?.forEach(
      (item) => item.kategori && setKategori.add(item.kategori)
    );
    return Array.from(setKategori);
  }, [achievements, summary]);

  const kelasOptions = useMemo(() => {
    const setKelas = new Set();
    students.forEach(
      (student) => student.id_kelas && setKelas.add(student.id_kelas)
    );
    achievements.forEach(
      (item) => item.kelas_snapshot && setKelas.add(item.kelas_snapshot)
    );
    return Array.from(setKelas);
  }, [students, achievements]);

  const formatDate = (value) => {
    if (!value) return "-";
    try {
      return format(parseISO(String(value)), "dd MMM yyyy", {
        locale: localeID,
      });
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

  const pageShellClasses =
    "min-h-screen space-y-8 sm:space-y-5 bg-rose-50/80 text-gray-900 dark:bg-slate-950 dark:text-slate-100 px-4 sm:px-6 lg:px-8 py-8 transition-colors";
  const cardClasses =
    "rounded-[8px] bg-white/95 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/70 dark:shadow-xl dark:shadow-black/40 dark:ring-1 dark:ring-slate-700/60";
  const inputClasses =
    "w-full rounded-full border border-gray-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-rose-400 dark:focus:ring-rose-500/30";
  const primaryButtonClasses =
    "inline-flex items-center justify-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1 focus:ring-offset-rose-50 hover:bg-rose-600 dark:focus:ring-offset-slate-950";
  const secondaryButtonClasses =
    "inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:ring-offset-rose-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800/60 dark:focus:ring-rose-500/40 dark:focus:ring-offset-slate-950";
  const iconButtonClasses =
    "inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 shadow-sm transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:ring-offset-rose-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800/60 dark:focus:ring-rose-500/40 dark:focus:ring-offset-slate-950";

  if (loading) {
    return (
      <div className={pageShellClasses}>
        <div className="flex h-64 items-center justify-center">
          <div className="loading-spinner h-8 w-8 rounded-full border-2 border-rose-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${pageShellClasses} fade-in`}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          {/* <div className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
            Pembinaan siswa
          </div> */}
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Kelola Prestasi
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Dokumentasikan setiap pencapaian siswa dengan rapi dan konsisten.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canCreateAchievement && (
            <button
              type="button"
              onClick={handleOpenForm}
              className={primaryButtonClasses}
            >
              <Plus className="h-4 w-4" />
              Catat Prestasi
            </button>
          )}
        </div>
      </header>

      <section className={cardClasses}>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className={`${inputClasses} pl-12`}
                placeholder="Cari berdasarkan nama siswa, judul, atau kategori..."
              />
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                <div className="relative md:w-48">
                  <select
                    value={filters.kategori}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        kategori: event.target.value,
                      }))
                    }
                    className={`${inputClasses} w-full appearance-none pr-12`}
                  >
                    <option value="all">Semua Kategori</option>
                    {kategoriOptions.map((kategori) => (
                      <option key={kategori} value={kategori}>
                        {kategori}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                <div className="relative md:w-48">
                  <select
                    value={filters.kelas}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        kelas: event.target.value,
                      }))
                    }
                    className={`${inputClasses} w-full appearance-none pr-12`}
                  >
                    <option value="all">Semua Kelas</option>
                    {kelasOptions.map((kelas) => (
                      <option key={kelas} value={kelas}>
                        {kelas}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${cardClasses} !p-0 sm:!p-8 overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-[#C82020] text-xs font-semibold uppercase tracking-[0.2em] text-white dark:border-slate-800 dark:bg-[#a11818] dark:text-white">
                <th className="w-56 px-4 py-3 text-left rounded-tl-[8px]">
                  Siswa
                </th>
                <th className="px-4 py-3 text-left">Nama Prestasi</th>
                <th className="px-4 py-3 text-left">Kategori</th>
                <th className="px-4 py-3 text-left">Tingkat</th>
                <th className="px-4 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3 text-right rounded-tr-[8px]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center">
                    <div className="loading-spinner h-7 w-7 rounded-full border-2 border-rose-500 border-t-transparent" />
                  </td>
                </tr>
              ) : achievements.length ? (
                achievements.map((achievement) => (
                  <tr
                    key={achievement.id}
                    className="border-b border-gray-100/80 transition hover:bg-rose-50 dark:border-slate-800/60 dark:hover:bg-slate-800"
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm font-semibold">
                        {renderStudentName(achievement)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        NIS: {achievement.nis_siswa}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {achievement.judul}
                      </p>

                    </td>
                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-slate-200">
                      {achievement.kategori || "-"}
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-slate-200">
                      {achievement.tingkat || "-"}
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-slate-200">
                      {formatDate(achievement.tanggal_prestasi)}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className={secondaryButtonClasses}
                          onClick={() => openDetailModal(achievement)}
                        >
                          Detail
                        </button>
                        {(canDeleteAchievement ||
                          achievement.pencatat_id === user?.id) && (
                            <button
                              type="button"
                              className={iconButtonClasses}
                              onClick={() => handleDeleteAchievement(achievement)}
                              disabled={deleteLoadingId === achievement.id}
                            >
                              {deleteLoadingId === achievement.id ? (
                                <div className="loading-spinner h-4 w-4 rounded-full border border-rose-500 border-t-transparent" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-10 text-center text-sm text-gray-500 dark:text-slate-400"
                  >
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
          <div className={cardClasses}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold leading-tight">
                Prestasi Terbaru
              </h2>
            </div>
            {summary.recent_achievements?.length ? (
              <ul className="space-y-4">
                {summary.recent_achievements.map((item) => (
                  <li
                    key={item.id}
                    className="group rounded-[12px] border border-gray-100/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/70"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-inner">
                          <Trophy className="h-5 w-5" />
                        </div>
                        <div
                          className="cursor-pointer"
                          onClick={() => {
                            const match = achievements.find((a) => a.id === item.id);
                            if (match) {
                              openDetailModal(match);
                            } else {
                              toast.info("Prestasi ada di luar filter saat ini");
                            }
                          }}
                        >
                          <p className="text-base font-semibold">
                            {item.judul}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600 dark:text-slate-400">
                            <User className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                            <span>{item.nama}</span>
                            <span className="text-gray-300 dark:text-slate-600">
                              •
                            </span>
                            <span>{item.kelas || "-"}</span>
                          </p>
                          <div className="mt-3 hidden flex-wrap items-center gap-2 text-xs sm:flex">
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-200">
                              {item.kategori}
                            </span>
                            {item.tingkat && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-600 dark:bg-sky-500/15 dark:text-sky-100">
                                {item.tingkat}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-600 dark:bg-slate-800 dark:text-slate-200">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(item.tanggal_prestasi)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="hidden items-center gap-2 whitespace-nowrap rounded-full border border-rose-100 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:ring-offset-rose-50 dark:border-rose-500/30 dark:text-rose-200 dark:hover:bg-rose-500/10 dark:focus:ring-rose-500/40 dark:focus:ring-offset-slate-950 sm:inline-flex"
                        onClick={() => {
                          const match = achievements.find(
                            (a) => a.id === item.id
                          );
                          if (match) {
                            openDetailModal(match);
                          } else {
                            toast.info("Prestasi ada di luar filter saat ini");
                          }
                        }}
                      >
                        Lihat detail
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Belum ada catatan prestasi terbaru.
              </p>
            )}
          </div>

          <div className={cardClasses}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold leading-tight">
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
                      className={`flex items-center justify-between gap-4 rounded-[12px] border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${style.container}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold ${style.badgeCircle}`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-slate-100">
                            {student.nama}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {student.kelas || "-"} • {student.nis}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`flex items-center gap-2 text-sm font-semibold ${style.accent}`}
                      >
                        <Medal className="h-4 w-4" />
                        <span>{student.total_prestasi} prestasi</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Belum ada data papan prestasi.
              </p>
            )}
          </div>
        </section>
      )}

      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
          onClick={handleCloseForm}
        >
          <div
            className="w-full max-w-2xl rounded-[12px] bg-white/95 p-8 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/80 dark:ring-1 dark:ring-slate-700/60"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                Form Prestasi
              </p>
              <h2 className="text-2xl font-semibold leading-tight">
                Catat Prestasi Siswa
              </h2>
            </div>
            <form className="space-y-6" onSubmit={handleCreateAchievement}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-4">
                  <label className="flex flex-col gap-1.5 md:gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                      Siswa
                    </span>
                    <select
                      name="nis_siswa"
                      value={formData.nis_siswa}
                      onChange={handleFormChange}
                      className={inputClasses}
                      required
                    >
                      <option value="">Pilih siswa</option>
                      {activeStudents.map((student) => (
                        <option key={student.nis} value={student.nis}>
                          {student.nama} • {student.id_kelas}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5 md:gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                      Tanggal Prestasi
                    </span>
                    <input
                      type="date"
                      name="tanggal_prestasi"
                      value={formData.tanggal_prestasi}
                      onChange={handleFormChange}
                      className={inputClasses}
                      required
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1.5 md:gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Judul Prestasi
                  </span>
                  <input
                    type="text"
                    name="judul"
                    value={formData.judul}
                    onChange={handleFormChange}
                    className={inputClasses}
                    placeholder="Contoh: Juara 1 Lomba Matematika"
                    required
                  />
                </label>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-4">
                  <label className="flex flex-col gap-1.5 md:gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                      Kategori
                    </span>
                    <input
                      type="text"
                      name="kategori"
                      value={formData.kategori}
                      onChange={handleFormChange}
                      className={inputClasses}
                      placeholder="Akademik / Non-Akademik / Karakter"
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 md:gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                      Tingkat
                    </span>
                    <input
                      type="text"
                      name="tingkat"
                      value={formData.tingkat}
                      onChange={handleFormChange}
                      className={inputClasses}
                      placeholder="Sekolah / Kecamatan / Provinsi"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-4">
                  <label className="flex flex-col gap-1.5 md:gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                      Pemberi Penghargaan
                    </span>
                    <input
                      type="text"
                      name="pemberi_penghargaan"
                      value={formData.pemberi_penghargaan}
                      onChange={handleFormChange}
                      className={inputClasses}
                      placeholder="Nama pihak pemberi penghargaan"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 md:gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                      Bukti Foto (Opsional)
                    </span>
                    <input
                      type="file"
                      name="bukti"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFormData(prev => ({ ...prev, bukti: e.target.files[0] }));
                        }
                      }}
                      className={`${inputClasses} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 dark:file:bg-rose-900/30 dark:file:text-rose-400`}
                      accept="image/*"
                    />
                    <p className="text-xs text-gray-500 mt-1">Upload foto sertifikat atau dokumentasi (Max 5MB)</p>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className={secondaryButtonClasses}
                  onClick={handleCloseForm}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={primaryButtonClasses}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? "Menyimpan..." : "Simpan Prestasi"}
                </button>
              </div>
            </form>
          </div>
        </div >
      )}

      {
        showDetailModal && selectedAchievement && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
            onClick={closeDetailModal}
          >
            <div
              className="w-full max-w-3xl rounded-[12px] bg-white/95 p-8 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/80 dark:ring-1 dark:ring-slate-700/60"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Detail Prestasi
                </p>
                <h2 className="text-2xl font-semibold leading-tight">
                  Rincian Pencapaian
                </h2>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                      Siswa
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {renderStudentName(selectedAchievement)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                      Tanggal
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {formatDate(selectedAchievement.tanggal_prestasi)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                      Kategori
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {selectedAchievement.kategori || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                      Tingkat
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {selectedAchievement.tingkat || "-"}
                    </p>
                  </div>
                </div>

                {selectedAchievement.deskripsi && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                      Deskripsi
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-300">
                      {selectedAchievement.deskripsi}
                    </p>
                  </div>
                )}

                {selectedAchievement.bukti && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                      Bukti
                    </p>
                    <div className="mt-2 text-sm text-gray-700 dark:text-slate-300">
                      {(() => {
                        // Construct URL for image display
                        const baseURL = apiClient.defaults.baseURL?.replace(/\/api\/?$/, "") || "";
                        let cleanPath = selectedAchievement.bukti.startsWith("/")
                          ? selectedAchievement.bukti.slice(1)
                          : selectedAchievement.bukti;

                        if (!cleanPath.startsWith("uploads/") && !cleanPath.startsWith("http")) {
                          cleanPath = `uploads/${cleanPath}`;
                        }
                        const imageUrl = cleanPath.startsWith("http") ? cleanPath : `${baseURL}/${cleanPath}`;

                        return (
                          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                            <img
                              src={imageUrl}
                              alt="Bukti Prestasi"
                              className="w-full max-h-[400px] object-contain bg-gray-50 dark:bg-slate-800"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentNode.innerHTML += '<span class="p-4 block text-red-500 italic">Gagal memuat gambar</span>';
                              }}
                            />
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}

                {selectedAchievement.pemberi_penghargaan && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                      Pemberi Penghargaan
                    </p>
                    <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
                      {selectedAchievement.pemberi_penghargaan}
                    </p>
                  </div>
                )}

                {(canDeleteAchievement ||
                  selectedAchievement.pencatat_id === user?.id) && (
                    <div className="flex justify-between gap-3">
                      <div />
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-1 focus:ring-offset-rose-50 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20 dark:focus:ring-red-500/40 dark:focus:ring-offset-slate-950"
                        onClick={() => handleDeleteAchievement(selectedAchievement)}
                        disabled={deleteLoadingId === selectedAchievement.id}
                      >
                        <Trash2 className="h-4 w-4" />
                        {deleteLoadingId === selectedAchievement.id
                          ? "Menghapus..."
                          : "Hapus"}
                      </button>
                    </div>
                  )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    className={secondaryButtonClasses}
                    onClick={closeDetailModal}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div >
        )
      }
    </div >
  );
};

export default AchievementManagement;
