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
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Filter,
  Sparkles,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

import { AuthContext } from "../App";
import { achievementService, apiClient } from "../services/api";

const defaultFormState = {
  nis_siswa: "",
  judul: "",
  kategori: "",
  tingkat: "",
  deskripsi: "",
  poin: 0,
  tanggal_prestasi: "",
  bukti: "",
  pemberi_penghargaan: "",
};

const AchievementManagement = () => {
  const { user } = useContext(AuthContext);
  const [achievements, setAchievements] = useState([]);
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    kategori: "all",
    kelas: "all",
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState(defaultFormState);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statusDraft, setStatusDraft] = useState("submitted");
  const [statusSaving, setStatusSaving] = useState(false);
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

  const canVerifyAchievement = useMemo(
    () =>
      [
        "admin",
        "kepala_sekolah",
        "wakil_kepala_sekolah",
        "guru_bk",
      ].includes(user?.role),
    [user?.role]
  );

  const canDeleteAchievement = useMemo(
    () => user?.role === "admin",
    [user?.role]
  );

  const fetchAchievements = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setListLoading(true);
      }
      try {
        const params = {};
        if (filters.status !== "all") {
          params.status = filters.status;
        }
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

  const fetchStudents = async () => {
    try {
      const { data } = await apiClient.get("/siswa");
      setStudents(data);
    } catch (error) {
      console.error("Failed to fetch students", error);
      toast.error("Gagal memuat data siswa");
    }
  };

  const fetchSummary = async () => {
    try {
      const { data } = await achievementService.summary();
      setSummary(data);
    } catch (error) {
      console.error("Failed to fetch achievement summary", error);
    }
  };

  const getStudentInfo = (nis) => students.find((item) => item.nis === nis);

  const handleOpenForm = () => {
    const today = new Date().toISOString().slice(0, 10);
    setFormData({ ...defaultFormState, tanggal_prestasi: today });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setFormSubmitting(false);
    setFormData(defaultFormState);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "poin" ? Number(value) : value,
    }));
  };

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
        poin: Number(formData.poin || 0),
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
    setStatusSaving(false);
  };

  useEffect(() => {
    if (selectedAchievement) {
      setStatusDraft(selectedAchievement.status);
    }
  }, [selectedAchievement]);

  const handleStatusUpdate = async () => {
    if (!selectedAchievement || statusDraft === selectedAchievement.status) {
      toast.info("Status prestasi tidak berubah");
      return;
    }

    setStatusSaving(true);
    try {
      const { data } = await achievementService.updateStatus(selectedAchievement.id, {
        status: statusDraft,
      });
      setAchievements((prev) => prev.map((item) => (item.id === data.id ? data : item)));
      setSelectedAchievement(data);
      toast.success("Status prestasi diperbarui");
      fetchSummary();
    } catch (error) {
      const detail = error?.response?.data?.detail || "Gagal memperbarui status prestasi";
      toast.error(detail);
    } finally {
      setStatusSaving(false);
    }
  };

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

  const totalPoin = useMemo(
    () => achievements.reduce((acc, item) => acc + Number(item.poin || 0), 0),
    [achievements]
  );

  const statusOptions = [
    { value: "submitted", label: "Menunggu Verifikasi" },
    { value: "verified", label: "Terverifikasi" },
    { value: "rejected", label: "Ditolak" },
  ];

  const kategoriOptions = useMemo(() => {
    const setKategori = new Set();
    achievements.forEach((item) => item.kategori && setKategori.add(item.kategori));
    summary?.kategori_populer?.forEach((item) => item.kategori && setKategori.add(item.kategori));
    return Array.from(setKategori);
  }, [achievements, summary]);

  const kelasOptions = useMemo(() => {
    const setKelas = new Set();
    students.forEach((student) => student.id_kelas && setKelas.add(student.id_kelas));
    return Array.from(setKelas);
  }, [students]);

  const formatDate = (value) => {
    if (!value) return "-";
    try {
      return format(parseISO(String(value)), "dd MMM yyyy", { locale: localeID });
    } catch (error) {
      return value;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "verified":
        return (
          <span className="badge badge-success flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Disetujui
          </span>
        );
      case "rejected":
        return (
          <span className="badge badge-danger flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Ditolak
          </span>
        );
      default:
        return (
          <span className="badge badge-warning flex items-center gap-1">
            <Clock className="w-3 h-3" /> Menunggu
          </span>
        );
    }
  };

  const renderStudentName = (achievement) => {
    const info = getStudentInfo(achievement.nis_siswa);
    if (!info) return achievement.nis_siswa;
    return `${info.nama} • ${info.id_kelas}`;
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
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Prestasi Siswa</h1>
          <p className="text-gray-600 mt-1">
            Dokumentasikan pencapaian siswa dan kelola proses verifikasinya.
          </p>
        </div>
        {canCreateAchievement && (
          <button
            type="button"
            onClick={handleOpenForm}
            className="btn-primary flex items-center gap-2 self-start"
          >
            <Plus className="w-4 h-4" />
            Catat Prestasi
          </button>
        )}
      </header>

      {summary && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                <p className="text-sm font-medium text-gray-600">Menunggu Verifikasi</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.pending_prestasi}
                </p>
              </div>
              <Clock className="w-8 h-8 text-sky-500" />
            </div>
          </div>
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Prestasi Terverifikasi</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.verified_prestasi}
                </p>
              </div>
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
            </div>
          </div>
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Poin</p>
                <p className="text-2xl font-bold text-gray-900">{totalPoin}</p>
              </div>
              <Sparkles className="w-8 h-8 text-fuchsia-500" />
            </div>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="modern-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="modern-input pl-9"
                placeholder="Cari nama siswa, judul, atau kategori"
              />
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <label className="modern-select">
                <Filter className="w-4 h-4" />
                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, status: event.target.value }))
                  }
                >
                  <option value="all">Semua Status</option>
                  <option value="submitted">Menunggu</option>
                  <option value="verified">Terverifikasi</option>
                  <option value="rejected">Ditolak</option>
                </select>
                <ChevronDown className="w-4 h-4" />
              </label>
              <label className="modern-select">
                <Filter className="w-4 h-4" />
                <select
                  value={filters.kategori}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, kategori: event.target.value }))
                  }
                >
                  <option value="all">Semua Kategori</option>
                  {kategoriOptions.map((kategori) => (
                    <option key={kategori} value={kategori}>
                      {kategori}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4" />
              </label>
              <label className="modern-select">
                <Filter className="w-4 h-4" />
                <select
                  value={filters.kelas}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, kelas: event.target.value }))
                  }
                >
                  <option value="all">Semua Kelas</option>
                  {kelasOptions.map((kelas) => (
                    <option key={kelas} value={kelas}>
                      {kelas}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4" />
              </label>
            </div>
          </div>
          <p className="text-sm text-gray-500">Total {achievements.length} prestasi</p>
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
                <th className="text-left">Poin</th>
                <th className="text-left">Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center">
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
                    <td>{achievement.poin || 0}</td>
                    <td>{getStatusBadge(achievement.status)}</td>
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
                  <td colSpan="8" className="py-10 text-center text-gray-500">
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
              <ul className="space-y-3">
                {summary.recent_achievements.map((item) => (
                  <li
                    key={item.id}
                    className="p-4 rounded-xl border border-gray-100 flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{item.judul}</p>
                      <p className="text-sm text-gray-600">
                        {item.nama} • {item.kelas || "-"}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                        <span>{item.kategori}</span>
                        {item.tingkat && <span>• {item.tingkat}</span>}
                        <span>• {formatDate(item.tanggal_prestasi)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(item.status)}
                      <button
                        type="button"
                        className="btn-link text-sm"
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
              <h2 className="text-lg font-semibold text-gray-900">
                Papan Prestasi
              </h2>
            </div>
            {summary.top_students?.length ? (
              <ol className="space-y-3">
                {summary.top_students.map((student, index) => (
                  <li
                    key={student.nis}
                    className="p-4 rounded-xl border border-gray-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{student.nama}</p>
                        <p className="text-xs text-gray-500">
                          {student.kelas || "-"} • {student.nis}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{student.total_poin} poin</p>
                      <p className="text-xs text-gray-500">
                        {student.total_prestasi} prestasi, {student.verified} terverifikasi
                      </p>
                    </div>
                  </li>
                ))}
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

                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Poin Penghargaan</span>
                  <input
                    type="number"
                    min="0"
                    name="poin"
                    value={formData.poin}
                    onChange={handleFormChange}
                    className="modern-input"
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
                <div>
                  <p className="text-xs text-gray-500">Poin</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedAchievement.poin || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedAchievement.status)}</div>
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

              {(canVerifyAchievement || selectedAchievement.pencatat_id === user?.id) && (
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  {canVerifyAchievement ? (
                    <div className="flex items-center gap-3">
                      <select
                        value={statusDraft}
                        onChange={(event) => setStatusDraft(event.target.value)}
                        className="modern-input"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleStatusUpdate}
                        disabled={statusSaving}
                      >
                        {statusSaving ? "Menyimpan..." : "Perbarui Status"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Menunggu verifikasi dari tim BK atau pimpinan.
                    </p>
                  )}

                  {(canDeleteAchievement || selectedAchievement.pencatat_id === user?.id) && (
                    <button
                      type="button"
                      className="btn-danger flex items-center gap-2"
                      onClick={() => handleDeleteAchievement(selectedAchievement)}
                      disabled={deleteLoadingId === selectedAchievement.id}
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleteLoadingId === selectedAchievement.id ? "Menghapus..." : "Hapus"}
                    </button>
                  )}
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
