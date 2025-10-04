import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import { apiClient } from "../services/api";
import { toast } from "sonner";
import {
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Clock,
  MapPin,
  User,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { formatNumericId } from "../lib/formatters";

// Use configured API client with auth header

const ViolationManagement = () => {
  const { user } = useContext(AuthContext);
  const [violations, setViolations] = useState([]);
  const [students, setStudents] = useState([]);
  const [violationTypes, setViolationTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statusDraft, setStatusDraft] = useState("reported");
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  useEffect(() => {
    fetchViolations();
    fetchStudents();
    fetchViolationTypes();
    if (user?.role === "admin") {
      fetchUsers();
    }
  }, [user]);

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

  const fetchStudents = async () => {
    try {
      const response = await apiClient.get(`/siswa`);
      setStudents(response.data);
    } catch (error) {
      console.error("Failed to fetch students:", error);
    }
  };

  const fetchViolationTypes = async () => {
    try {
      const response = await apiClient.get(`/master-data/jenis-pelanggaran`);
      setViolationTypes(response.data);
    } catch (error) {
      console.error("Failed to fetch violation types:", error);
    }
  };

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

  const canManageStatus = [
    "admin",
    "kepala_sekolah",
    "wakil_kepala_sekolah",
  ].includes(user?.role);
  const canDeleteViolation = user?.role === "admin";

  const getStudentInfo = (nis) => {
    return students.find((s) => s.nis === nis);
  };

  const getViolationTypeInfo = (id) => {
    return violationTypes.find((v) => v.id === id);
  };

  const getReporterInfo = (id) => {
    return users.find((u) => u.id === id);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "reported":
        return (
          <span className="badge badge-warning flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Dilaporkan
          </span>
        );
      case "processed":
        return (
          <span className="badge badge-info flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Diproses
          </span>
        );
      case "resolved":
        return (
          <span className="badge badge-success flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Selesai
          </span>
        );
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  const getViolationCategoryBadge = (kategori) => {
    switch (kategori) {
      case "Berat":
        return <span className="badge badge-danger">{kategori}</span>;
      case "Sedang":
        return <span className="badge badge-warning">{kategori}</span>;
      case "Ringan":
        return <span className="badge badge-info">{kategori}</span>;
      default:
        return <span className="badge badge-info">{kategori}</span>;
    }
  };

  const filteredViolations = violations.filter((violation) => {
    const student = getStudentInfo(violation.nis_siswa);
    const violationType = getViolationTypeInfo(violation.jenis_pelanggaran_id);

    const matchesSearch =
      violation.nis_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student?.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violationType?.nama_pelanggaran
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      violation.tempat.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || violation.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const viewViolationDetail = (violation) => {
    setSelectedViolation(violation);
    setShowDetailModal(true);
  };

  useEffect(() => {
    if (selectedViolation) {
      setStatusDraft(selectedViolation.status);
    }
  }, [selectedViolation]);

  const handleStatusUpdate = async () => {
    if (!selectedViolation) return;
    if (statusDraft === selectedViolation.status) {
      toast.info("Status pelanggaran tidak berubah");
      return;
    }

    setStatusSaving(true);
    try {
      const { data } = await apiClient.put(
        `/pelanggaran/${selectedViolation.id}/status`,
        {
          status: statusDraft,
        }
      );
      setViolations((prev) => prev.map((v) => (v.id === data.id ? data : v)));
      setSelectedViolation(data);
      toast.success("Status pelanggaran berhasil diperbarui");
    } catch (error) {
      const msg =
        error?.response?.data?.detail || "Gagal memperbarui status pelanggaran";
      toast.error(msg);
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDeleteViolation = async (violation) => {
    if (!violation || !canDeleteViolation) return;
    const confirmDelete = window.confirm(
      "Hapus riwayat pelanggaran ini? Tindakan ini tidak dapat dibatalkan."
    );
    if (!confirmDelete) return;

    setDeleteLoadingId(violation.id);
    try {
      await apiClient.delete(`/pelanggaran/${violation.id}`);
      setViolations((prev) => prev.filter((v) => v.id !== violation.id));
      if (selectedViolation?.id === violation.id) {
        setShowDetailModal(false);
        setSelectedViolation(null);
      }
      toast.success("Riwayat pelanggaran berhasil dihapus");
    } catch (error) {
      const msg =
        error?.response?.data?.detail || "Gagal menghapus riwayat pelanggaran";
      toast.error(msg);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Kelola Pelanggaran
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.role === "admin" ||
            user?.role === "kepala_sekolah" ||
            user?.role === "wakil_kepala_sekolah"
              ? "Pantau dan kelola semua pelanggaran siswa"
              : "Kelola pelanggaran siswa di kelas/angkatan Anda"}
          </p>
        </div>

        <div className="text-sm text-gray-500">
          Total: {violations.length} pelanggaran
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Pelanggaran
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {violations.length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Menunggu Proses
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {violations.filter((v) => v.status === "reported").length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dalam Proses</p>
              <p className="text-2xl font-bold text-gray-900">
                {violations.filter((v) => v.status === "processed").length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Selesai</p>
              <p className="text-2xl font-bold text-gray-900">
                {violations.filter((v) => v.status === "resolved").length}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="modern-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berdasarkan NIS, nama siswa, jenis pelanggaran, atau tempat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="modern-input input-with-icon-left"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="modern-input w-48"
            >
              <option value="all">Semua Status</option>
              <option value="reported">Dilaporkan</option>
              <option value="processed">Diproses</option>
              <option value="resolved">Selesai</option>
            </select>
          </div>
        </div>
      </div>

      {/* Violations Table */}
      <div className="modern-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Jenis Pelanggaran</th>
                <th>Waktu & Tempat</th>
                <th>Status</th>
                <th>Pelapor</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredViolations.map((violation) => {
                const student = getStudentInfo(violation.nis_siswa);
                const violationType = getViolationTypeInfo(
                  violation.jenis_pelanggaran_id
                );
                const reporter = getReporterInfo(violation.pelapor_id);

                return (
                  <tr key={violation.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {student?.nama || "Unknown"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatNumericId(violation.nis_siswa)} • {student?.id_kelas}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">
                          {violationType?.nama_pelanggaran}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {violationType &&
                            getViolationCategoryBadge(violationType.kategori)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="w-3 h-3" />
                          {new Date(violation.waktu_kejadian).toLocaleString(
                            "id-ID"
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-3 h-3" />
                          {violation.tempat}
                        </div>
                      </div>
                    </td>
                    <td>{getStatusBadge(violation.status)}</td>
                    <td>
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">
                          {reporter?.full_name || "Unknown"}
                        </p>
                        <p className="text-gray-600 capitalize">
                          {reporter?.role?.replace("_", " ")}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewViolationDetail(violation)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        {canDeleteViolation && (
                          <button
                            onClick={() => handleDeleteViolation(violation)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Hapus Riwayat"
                            disabled={deleteLoadingId === violation.id}
                          >
                            <Trash2
                              className={`w-4 h-4 ${
                                deleteLoadingId === violation.id
                                  ? "text-gray-400 animate-pulse"
                                  : "text-red-600"
                              }`}
                            />
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

        {filteredViolations.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || statusFilter !== "all"
                ? "Tidak ada pelanggaran yang sesuai dengan filter"
                : "Belum ada data pelanggaran"}
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedViolation && (
        <div
          className="modal-overlay"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="modal-content max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Detail Pelanggaran
              </h2>
              {getStatusBadge(selectedViolation.status)}
            </div>

            <div className="space-y-6">
              {/* Student Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Informasi Siswa
                </h3>
                {(() => {
                  const student = getStudentInfo(selectedViolation.nis_siswa);
                  return student ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Nama:</p>
                        <p className="font-medium">{student.nama}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">NIS:</p>
                        <p className="font-medium">{formatNumericId(student.nis)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Kelas:</p>
                        <p className="font-medium">{student.id_kelas}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Angkatan:</p>
                        <p className="font-medium">{formatNumericId(student.angkatan)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Data siswa tidak ditemukan</p>
                  );
                })()}
              </div>

              {/* Violation Info */}
              <div className="p-4 bg-red-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Detail Pelanggaran
                </h3>
                {(() => {
                  const violationType = getViolationTypeInfo(
                    selectedViolation.jenis_pelanggaran_id
                  );
                  return (
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-gray-600">Jenis Pelanggaran:</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="font-medium">
                            {violationType?.nama_pelanggaran}
                          </p>
                          {violationType &&
                            getViolationCategoryBadge(violationType.kategori)}
                        </div>
                        {violationType?.deskripsi && (
                          <p className="text-gray-600 mt-1">
                            {violationType.deskripsi}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-600">Waktu Kejadian:</p>
                          <p className="font-medium">
                            {new Date(
                              selectedViolation.waktu_kejadian
                            ).toLocaleString("id-ID")}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Tempat:</p>
                          <p className="font-medium">
                            {selectedViolation.tempat}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-gray-600">Detail Kejadian:</p>
                        <p className="font-medium mt-1">
                          {selectedViolation.detail_kejadian}
                        </p>
                      </div>

                      {selectedViolation.bukti_foto && (
                        <div>
                          <p className="text-gray-600">Bukti Foto:</p>
                          <a
                            href={selectedViolation.bukti_foto}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 underline"
                          >
                            Lihat Bukti Foto
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Reporter Info */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Informasi Pelapor
                </h3>
                {(() => {
                  const reporter = getReporterInfo(
                    selectedViolation.pelapor_id
                  );
                  return reporter ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Nama:</p>
                        <p className="font-medium">{reporter.full_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Role:</p>
                        <p className="font-medium capitalize">
                          {reporter.role.replace("_", " ")}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Email:</p>
                        <p className="font-medium">{reporter.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Tanggal Lapor:</p>
                        <p className="font-medium">
                          {new Date(
                            selectedViolation.created_at
                          ).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      Data pelapor tidak ditemukan
                    </p>
                  );
                })()}
              </div>

              {canManageStatus && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Manajemen Laporan
                  </h3>
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">Status</span>
                      <select
                        value={statusDraft}
                        onChange={(e) => setStatusDraft(e.target.value)}
                        className="modern-input"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 md:ml-auto">
                      <button
                        type="button"
                        onClick={handleStatusUpdate}
                        className="btn-primary"
                        disabled={statusSaving}
                      >
                        {statusSaving ? "Menyimpan..." : "Simpan Status"}
                      </button>
                      {canDeleteViolation && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteViolation(selectedViolation)
                          }
                          className="btn-danger"
                          disabled={deleteLoadingId === selectedViolation.id}
                        >
                          {deleteLoadingId === selectedViolation.id
                            ? "Menghapus..."
                            : "Hapus Riwayat"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Follow-up Actions */}
              {selectedViolation.catatan_pembinaan && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Catatan Pembinaan
                  </h3>
                  <p className="text-sm">
                    {selectedViolation.catatan_pembinaan}
                  </p>
                </div>
              )}

              {selectedViolation.tindak_lanjut && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Tindak Lanjut
                  </h3>
                  <p className="text-sm">{selectedViolation.tindak_lanjut}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              {(user?.role === "admin" ||
                user?.role === "wali_kelas" ||
                user?.role === "guru_bk") && (
                <button className="btn-primary">Tambah Pembinaan</button>
              )}
              <button
                onClick={() => setShowDetailModal(false)}
                className="btn-secondary"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViolationManagement;
