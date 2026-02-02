// Modul penanganan laporan pelanggaran berikut status tindak lanjutnya
import React, { useState, useEffect, useContext, useMemo } from "react";
import { AuthContext } from "../App";
import { apiClient } from "../services/api";
import { toast } from "sonner";
import {
  AlertTriangle,
  Search,
  Filter,
  Edit,
  Clock,
  MapPin,
  User,
  Trash2,
  CheckCircle2,
  AlertCircle,

  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { formatNumericId } from "../lib/formatters";

// Daftar pelanggaran dengan fitur filter, detail, dan perubahan status
const ViolationManagement = () => {
  const { user } = useContext(AuthContext);
  const [violations, setViolations] = useState([]);
  const [students, setStudents] = useState([]);
  const [violationTypes, setViolationTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusSavingId, setStatusSavingId] = useState(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  // Preview Image Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  useEffect(() => {
    fetchViolations();
    fetchStudents();
    fetchViolationTypes();
    if (user?.role === "admin") {
      fetchUsers();
    }
  }, [user]);

  // Mengambil data pelanggaran terbaru dari backend
  const fetchViolations = async () => {
    try {
      const response = await apiClient.get(`/pelanggaran`);
      setViolations(response.data);
    } catch (error) {
      console.error("Failed to fetch violations:", error);
      toast.error("Gagal memuat data pelanggaran");
    }
    setLoading(false);
  };

  // Mengisi referensi siswa untuk memperkaya detail pelanggaran
  const fetchStudents = async () => {
    try {
      const response = await apiClient.get(`/siswa`);
      setStudents(response.data);
    } catch (error) {
      console.error("Failed to fetch students:", error);
    }
  };

  // Mendapatkan daftar jenis pelanggaran sebagai metadata pendukung
  const fetchViolationTypes = async () => {
    try {
      const response = await apiClient.get(`/master-data/jenis-pelanggaran`);
      setViolationTypes(response.data);
    } catch (error) {
      console.error("Failed to fetch violation types:", error);
    }
  };

  // Memuat data pelapor hanya untuk admin (menampilkan nama petugas)
  const fetchUsers = async () => {
    try {
      const response = await apiClient.get(`/users`);
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const statusOptions = [
    { value: "reported", label: "Dilaporkan" },
    { value: "processed", label: "Diproses" },
    { value: "resolved", label: "Selesai" },
  ];

  const canManageStatus = ["admin", "kepala_sekolah"].includes(user?.role);
  const canDeleteViolation = user?.role === "admin";

  const statusBadgeTone = (status) => {
    switch (status) {
      case "reported":
        return "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100";
      case "processed":
        return "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-100";
      case "resolved":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
    }
  };

  // Helper untuk mencari informasi siswa berdasarkan NIS
  const getStudentInfo = (nis) => students.find((s) => s.nis === nis);

  // Helper untuk mendapatkan detail jenis pelanggaran tertentu
  const getViolationTypeInfo = (id) => violationTypes.find((v) => v.id === id);

  // Menemukan data pelapor guna ditampilkan di modal detail
  const getReporterInfo = (id) => users.find((u) => u.id === id);

  const filteredViolations = violations.filter((violation) => {
    const student = getStudentInfo(violation.nis_siswa);
    const violationType = getViolationTypeInfo(violation.jenis_pelanggaran_id);

    const matchesSearch =
      violation.nis_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student?.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violationType?.nama_pelanggaran.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.tempat.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || violation.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const handleSort = (key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  const sortedViolations = useMemo(() => {
    const sorted = [...filteredViolations];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aValue, bValue;

        switch (sortConfig.key) {
          case "student_name":
            aValue = getStudentInfo(a.nis_siswa)?.nama || "";
            bValue = getStudentInfo(b.nis_siswa)?.nama || "";
            break;
          case "type_name":
            aValue = getViolationTypeInfo(a.jenis_pelanggaran_id)?.nama_pelanggaran || "";
            bValue = getViolationTypeInfo(b.jenis_pelanggaran_id)?.nama_pelanggaran || "";
            break;
          case "date":
            aValue = new Date(a.waktu_kejadian).getTime();
            bValue = new Date(b.waktu_kejadian).getTime();
            break;
          case "status":
            aValue = a.status;
            bValue = b.status;
            break;
          case "reporter":
            aValue = getReporterInfo(a.pelapor_id)?.full_name || "";
            bValue = getReporterInfo(b.pelapor_id)?.full_name || "";
            break;
          default:
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }

        if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = (bValue || "").toString().toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filteredViolations, sortConfig, students, violationTypes, users]);

  // Mengubah status pelanggaran dari dropdown aksi
  const handleStatusUpdate = async (violation, nextStatus) => {
    if (!violation) return;
    if (nextStatus === violation.status) {
      toast.info("Status pelanggaran tidak berubah");
      return;
    }

    setStatusSavingId(violation.id);
    try {
      const { data } = await apiClient.put(`/pelanggaran/${violation.id}/status`, {
        status: nextStatus,
      });
      setViolations((prev) => prev.map((v) => (v.id === data.id ? data : v)));
      toast.success("Status pelanggaran berhasil diperbarui");
    } catch (error) {
      const msg = error?.response?.data?.detail || "Gagal memperbarui status pelanggaran";
      toast.error(msg);
    } finally {
      setStatusSavingId(null);
    }
  };

  const handleDeleteViolation = async (violation) => {
    if (!violation || !canDeleteViolation) return;
    const confirmDelete = window.confirm("Hapus riwayat pelanggaran ini? Tindakan ini tidak dapat dibatalkan.");
    if (!confirmDelete) return;

    setDeleteLoadingId(violation.id);
    try {
      await apiClient.delete(`/pelanggaran/${violation.id}`);
      setViolations((prev) => prev.filter((v) => v.id !== violation.id));
      toast.success("Riwayat pelanggaran berhasil dihapus");
    } catch (error) {
      const msg = error?.response?.data?.detail || "Gagal menghapus riwayat pelanggaran";
      toast.error(msg);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleViewProof = (violation) => {
    if (!violation.bukti_foto) {
      toast.info("Tidak ada bukti foto untuk pelanggaran ini");
      return;
    }

    // Construct simplified URL assuming standard setup
    // Remove /api suffix if present to get root base URL
    const baseURL = apiClient.defaults.baseURL?.replace(/\/api\/?$/, "") || "";
    // Clean leading slash from path if double slash risk
    let cleanPath = violation.bukti_foto.startsWith("/")
      ? violation.bukti_foto.slice(1)
      : violation.bukti_foto;

    // Add storage/uploads/ prefix if not present (backend saves only filename)
    if (!cleanPath.startsWith("storage/uploads/") && !cleanPath.startsWith("http")) {
      cleanPath = `storage/uploads/${cleanPath}`;
    }

    setPreviewImageUrl(`${baseURL}/${cleanPath}`);
    setShowPreviewModal(true);
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
    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-gray-700 shadow-sm ring-1 ring-black/5 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:ring-offset-rose-50 dark:bg-slate-900/70 dark:text-slate-100 dark:ring-slate-800/70 dark:hover:bg-slate-800 dark:focus:ring-rose-500/40 dark:focus:ring-offset-slate-950";

  const statusCounts = useMemo(
    () => ({
      reported: violations.filter((v) => v.status === "reported").length,
      processed: violations.filter((v) => v.status === "processed").length,
      resolved: violations.filter((v) => v.status === "resolved").length,
    }),
    [violations]
  );

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          {/* <div className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
            Pengelolaan
          </div> */}
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Kelola Pelanggaran</h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            {["admin", "kepala_sekolah"].includes(user?.role)
              ? "Pantau dan kelola semua pelanggaran siswa"
              : "Kelola pelanggaran siswa di kelas/angkatan Anda"}
          </p>
        </div>
        <div className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm dark:bg-rose-500/15 dark:text-rose-200">
          Total: {violations.length} pelanggaran
        </div>
      </div>

      <div className={`${cardClasses} p-6 sm:p-5`}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">Ringkasan Pelanggaran</p>
            {/* <p className="text-[11px] text-gray-600 dark:text-slate-400">Status laporan terkini</p> */}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { label: "Total", value: violations.length, icon: AlertTriangle, tone: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200" },
            { label: "Dilaporkan", value: statusCounts.reported, icon: AlertCircle, tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100" },
            { label: "Diproses", value: statusCounts.processed, icon: Clock, tone: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-100" },
            { label: "Selesai", value: statusCounts.resolved, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100" },
          ].map(({ label, value, icon: IconComponent, tone }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-[10px] border border-gray-100/80 bg-white/70 px-3 py-2 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-rose-600 shadow-inner dark:text-rose-200 ${tone}`}>
                <IconComponent className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">{label}</p>
                <p className="text-base font-semibold text-gray-900 dark:text-slate-100">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={cardClasses}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Cari berdasarkan NIS, nama, jenis pelanggaran, atau tempat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${inputClasses} pl-12`}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400 dark:text-slate-500" />
              <div className="relative md:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`${inputClasses} w-full appearance-none pr-12`}
                >
                  <option value="all">Semua Status</option>
                  <option value="reported">Dilaporkan</option>
                  <option value="processed">Diproses</option>
                  <option value="resolved">Selesai</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${cardClasses} !p-0 sm:!p-8 overflow-hidden`}>
        <div className="overflow-x-auto">
          <div className="max-h-[520px] overflow-y-auto">
            <table className="min-w-full table-auto text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-100 bg-[#C82020] text-xs font-semibold uppercase tracking-[0.2em] text-white dark:border-slate-800 dark:bg-[#a11818] dark:text-white">
                  <th className="px-4 py-3 text-left rounded-tl-[8px] cursor-pointer hover:bg-rose-600 transition-colors group" onClick={() => handleSort("student_name")}>
                    <div className="flex items-center gap-2">
                      Siswa
                      {sortConfig.key === "student_name" && (sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-rose-600 transition-colors group" onClick={() => handleSort("type_name")}>
                    <div className="flex items-center gap-2">
                      Jenis Pelanggaran
                      {sortConfig.key === "type_name" && (sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-rose-600 transition-colors group" onClick={() => handleSort("date")}>
                    <div className="flex items-center gap-2">
                      Waktu & Tempat
                      {sortConfig.key === "date" && (sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-rose-600 transition-colors group" onClick={() => handleSort("status")}>
                    <div className="flex items-center gap-2">
                      Status
                      {sortConfig.key === "status" && (sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-rose-600 transition-colors group" onClick={() => handleSort("reporter")}>
                    <div className="flex items-center gap-2">
                      Pelapor
                      {sortConfig.key === "reporter" && (sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center">Bukti</th>
                  <th className="px-4 py-3 text-left rounded-tr-[8px]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sortedViolations.map((violation) => {
                  const student = getStudentInfo(violation.nis_siswa);
                  const violationClass = violation.kelas_snapshot || student?.id_kelas || "-";
                  const violationType = getViolationTypeInfo(violation.jenis_pelanggaran_id);
                  const reporter = getReporterInfo(violation.pelapor_id);

                  return (
                    <tr
                      key={violation.id}
                      className="border-b border-gray-100/80 transition hover:bg-rose-50 dark:border-slate-800/60 dark:hover:bg-slate-800"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-inner dark:bg-rose-500/15 dark:text-rose-200">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                              {student?.nama || "Tidak diketahui"}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-slate-400">
                              {formatNumericId(violation.nis_siswa)} • {violationClass}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {violationType?.nama_pelanggaran || "-"}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
                          {violationType && (
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${violationType.kategori === "Berat"
                                ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-200"
                                : violationType.kategori === "Sedang"
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100"
                                  : "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-100"
                                }`}
                            >
                              {violationType.kategori}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1 text-sm text-gray-600 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(violation.waktu_kejadian).toLocaleString("id-ID")}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{violation.tempat}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeTone(
                            violation.status
                          )}`}
                        >
                          {violation.status === "reported" && <AlertCircle className="h-3 w-3" />}
                          {violation.status === "processed" && <Clock className="h-3 w-3" />}
                          {violation.status === "resolved" && <CheckCircle2 className="h-3 w-3" />}
                          {statusOptions.find((s) => s.value === violation.status)?.label || violation.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{reporter?.full_name || "-"}</p>
                        <p className="text-xs text-gray-600 capitalize dark:text-slate-400">{reporter?.role?.replace("_", " ")}</p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleViewProof(violation)}
                          className={`p-2 rounded-lg transition-colors ${violation.bukti_foto
                            ? "bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/30"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600"
                            }`}
                          title={violation.bukti_foto ? "Lihat Bukti Foto" : "Tidak ada bukti"}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="relative min-w-[180px]">
                            <select
                              value={violation.status}
                              onChange={(e) => handleStatusUpdate(violation, e.target.value)}
                              className={`${inputClasses} h-10 w-full appearance-none py-2 pr-12`}
                              disabled={statusSavingId === violation.id}
                              title="Kelola status"
                            >
                              {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                          </div>
                          {canDeleteViolation && (
                            <button
                              onClick={() => handleDeleteViolation(violation)}
                              className={iconButtonClasses}
                              title="Hapus Riwayat"
                              disabled={deleteLoadingId === violation.id}
                            >
                              {deleteLoadingId === violation.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border border-rose-500 border-t-transparent" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-300" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredViolations.length === 0 && (
          <div className="py-10 text-center">
            <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {searchTerm || statusFilter !== "all"
                ? "Tidak ada pelanggaran yang sesuai dengan filter"
                : "Belum ada data pelanggaran"}
            </p>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {
        showPreviewModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setShowPreviewModal(false)}
          >
            <div
              className="relative max-w-4xl w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Bukti Pelanggaran
                </h3>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-black/50 flex justify-center items-center min-h-[300px]">
                <img
                  src={previewImageUrl}
                  alt="Bukti Pelanggaran"
                  className="max-h-[70vh] w-auto object-contain rounded-lg shadow-md"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://placehold.co/600x400?text=Gagal+Memuat+Gambar";
                  }}
                />
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className={secondaryButtonClasses}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default ViolationManagement;
