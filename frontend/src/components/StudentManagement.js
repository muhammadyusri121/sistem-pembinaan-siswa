// Modul manajemen siswa yang memfasilitasi import massal, pencarian, dan CRUD per siswa
import React, { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../App";
import { apiClient } from "../services/api";
import { toast } from "sonner";
import {
  Users,
  Search,
  Plus,
  Upload,
  Filter,
  Edit,
  Trash2,
  Eye,
  FileSpreadsheet,
} from "lucide-react";
import { formatNumericId } from "../lib/formatters";

const formatStudentName = (value) => {
  if (value === null || value === undefined) return "";
  const trimmedValue = String(value).trim();
  if (!trimmedValue || trimmedValue.toLowerCase() === "nan") {
    return "";
  }
  return trimmedValue
    .split(/\s+/)
    .map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
};

const formatClassCode = (value) => {
  if (value === null || value === undefined) return "";
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === "nan") {
    return "";
  }
  return trimmed.toUpperCase();
};

const formatStudentNameInput = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  const hasTrailingSpace = /\s$/.test(str);
  const cleaned = str.replace(/\s+/g, " ");
  const formatted = cleaned
    .trimLeft()
    .split(" ")
    .map((word) =>
      word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ""
    )
    .join(" ");
  return hasTrailingSpace ? formatted + " " : formatted;
};

const formatClassCodeInput = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  const hasTrailingSpace = /\s$/.test(str);
  const cleaned = str.replace(/\s+/g, " ").toUpperCase();
  const trimmedStart = cleaned.replace(/^\s+/, "");
  return hasTrailingSpace ? trimmedStart + " " : trimmedStart;
};

const normalizeAngkatanValue = (value) => {
  if (value === null || value === undefined) return "";
  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === "nan") {
    return "";
  }
  const numeric = Number(raw);
  if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
    if (Number.isInteger(numeric)) {
      return String(numeric);
    }
  }
  return raw;
};

const STUDENT_STATUS_OPTIONS = [
  { value: "aktif", label: "Aktif" },
  { value: "lulus", label: "Lulus" },
  { value: "pindah", label: "Pindah" },
  { value: "dikeluarkan", label: "Dikeluarkan" },
];

const getStatusMeta = (status) => {
  switch (status) {
    case "lulus":
      return { label: "Lulus", className: "badge-info" };
    case "pindah":
      return { label: "Pindah", className: "badge-warning" };
    case "dikeluarkan":
      return { label: "Dikeluarkan", className: "badge-danger" };
    default:
      return { label: "Aktif", className: "badge-success" };
  }
};

// Use configured API client with auth header

// Tabel dan formulir administrasi data siswa
const StudentManagement = () => {
  const { user } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [showUploadErrors, setShowUploadErrors] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedNis, setSelectedNis] = useState(() => new Set());
  const [classes, setClasses] = useState([]);
  const [newStudent, setNewStudent] = useState({
    nis: "",
    nama: "",
    id_kelas: "",
    angkatan: "",
    jenis_kelamin: "L",
    aktif: true,
    status_siswa: "aktif",
  });
  const [editStudent, setEditStudent] = useState({
    nama: "",
    id_kelas: "",
    angkatan: "",
    jenis_kelamin: "L",
    aktif: true,
    status_siswa: "aktif",
  });
  const [classFilter, setClassFilter] = useState("");
  const [angkatanFilter, setAngkatanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const selectAllRef = useRef(null);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  // Memuat daftar siswa dari server sekaligus mereset pilihan terpilih
  const normalizeStudentRow = (student) => ({
    ...student,
    nama: formatStudentName(student.nama),
    id_kelas: formatClassCode(student.id_kelas),
    angkatan: normalizeAngkatanValue(student?.angkatan),
    jenis_kelamin: student?.jenis_kelamin
      ? String(student.jenis_kelamin).trim().toUpperCase().charAt(0)
      : "",
    status_siswa: student?.status_siswa
      ? String(student.status_siswa).trim().toLowerCase()
      : "aktif",
  });

  const fetchStudents = async () => {
    try {
      const response = await apiClient.get(`/siswa`);
      setStudents(response.data.map(normalizeStudentRow));
      setSelectedNis(new Set());
    } catch (error) {
      console.error("Failed to fetch students:", error);
      toast.error("Gagal memuat data siswa");
    }
    setLoading(false);
  };

  // Mengambil data kelas sebagai referensi dropdown pada form siswa
  const fetchClasses = async () => {
    try {
      const response = await apiClient.get(`/master-data/kelas`);
      const sanitized = response.data.map((item) => ({
        ...item,
        nama_kelas: formatClassCode(item.nama_kelas),
      }));
      setClasses(sanitized);
    } catch (error) {
      console.error("Failed to fetch classes:", error);
      toast.error(
        "Gagal memuat data kelas. Pastikan data master sudah dibuat."
      );
    }
  };

  // Pencarian siswa berdasarkan kata kunci, fallback ke seluruh data saat kosong
  const handleSearch = async (term) => {
    if (term.trim()) {
      try {
        const response = await apiClient.get(`/siswa/search/${term}`);
        setStudents(response.data.map(normalizeStudentRow));
      } catch (error) {
        console.error("Search failed:", error);
      }
    } else {
      fetchStudents();
    }
  };

  // Menambahkan siswa baru melalui form modal
  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const statusValue = newStudent.status_siswa || "aktif";
      const payload = {
        ...newStudent,
        nama: formatStudentName(newStudent.nama),
        id_kelas: formatClassCode(newStudent.id_kelas),
        angkatan: newStudent.angkatan ? String(newStudent.angkatan).trim() : "",
        status_siswa: statusValue,
        aktif: statusValue === "aktif",
      };
      await apiClient.post(`/siswa`, payload);
      toast.success("Siswa berhasil ditambahkan");
      setShowAddModal(false);
      setNewStudent({
        nis: "",
        nama: "",
        id_kelas: "",
        angkatan: "",
        jenis_kelamin: "L",
        aktif: true,
        status_siswa: "aktif",
      });
      fetchStudents();
    } catch (error) {
      console.error("Failed to add student:", error);
      toast.error("Gagal menambahkan siswa");
    }
  };

  // Mengunggah file CSV untuk import massal data siswa
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Pilih file terlebih dahulu");
      return;
    }

    const formData = new FormData();
    formData.append("file", uploadFile);

    setUploadErrors([]);
    setShowUploadErrors(false);
    setUploadLoading(true);
    try {
      const response = await apiClient.post(`/siswa/upload-csv`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const {
        created_count = 0,
        updated_count = 0,
        deactivated_count = 0,
        error_count = 0,
      } = response.data;

      const summary = [];
      if (created_count > 0) summary.push(`${created_count} siswa baru`);
      if (updated_count > 0) summary.push(`${updated_count} siswa diperbarui`);

      if (summary.length) {
        toast.success(`Upload berhasil! ${summary.join(", ")}`);
      } else {
        toast.success("Upload selesai. Tidak ada perubahan data siswa.");
      }

      if (deactivated_count > 0) {
        toast.info(`${deactivated_count} siswa ditandai tidak aktif karena tidak ada di roster terbaru.`);
      }
      if (error_count > 0) {
        toast.warning(`${error_count} baris gagal diproses. Periksa log unggahan.`);
        setUploadErrors(response.data.errors || []);
        setShowUploadErrors(true);
      }

      setShowUploadModal(false);
      setUploadFile(null);
      fetchStudents();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Gagal upload file");
    }
    setUploadLoading(false);
  };

  // Membuka modal detail untuk melihat informasi lengkap siswa
  const openDetailModal = (student) => {
    setSelectedStudent(normalizeStudentRow(student));
    setShowDetailModal(true);
  };

  // Menyalin data siswa terpilih ke state edit sebelum menampilkan modal
  const openEditModal = (student) => {
    const normalized = normalizeStudentRow(student);
    setSelectedStudent(normalized);
    setEditStudent({
      nama: normalized.nama,
      id_kelas: normalized.id_kelas,
      angkatan: normalized.angkatan,
      jenis_kelamin: normalized.jenis_kelamin || "L",
      aktif: Boolean(normalized.aktif),
      status_siswa: normalized.status_siswa || "aktif",
    });
    setShowEditModal(true);
  };

  // Menyimpan perubahan data siswa yang diedit melalui modal edit
  const handleEditStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setActionLoading(true);
    try {
      const payload = {
        ...editStudent,
        nama: formatStudentName(editStudent.nama),
        id_kelas: formatClassCode(editStudent.id_kelas),
        angkatan: editStudent.angkatan ? String(editStudent.angkatan).trim() : "",
        status_siswa: editStudent.status_siswa || "aktif",
        aktif: (editStudent.status_siswa || "aktif") === "aktif",
      };
      await apiClient.put(`/siswa/${selectedStudent.nis}`, payload);
      toast.success("Data siswa berhasil diperbarui");
      setShowEditModal(false);
      setSelectedStudent(null);
      await fetchStudents();
    } catch (error) {
      console.error("Failed to update student:", error);
      const message =
        error?.response?.data?.detail || "Gagal memperbarui siswa";
      toast.error(message);
    }
    setActionLoading(false);
  };

  // Menghapus satu siswa setelah konfirmasi dialog
  const handleDeleteStudent = async (student) => {
    const ok = window.confirm(
      `Hapus data siswa ${student.nama} (${student.nis})?`
    );
    if (!ok) return;

    setActionLoading(true);
    try {
      await apiClient.delete(`/siswa/${student.nis}`);
      toast.success("Siswa berhasil dihapus");
      if (selectedStudent?.nis === student.nis) {
        setSelectedStudent(null);
      }
      setSelectedNis((prev) => {
        const next = new Set(prev);
        next.delete(student.nis);
        return next;
      });
      await fetchStudents();
    } catch (error) {
      console.error("Failed to delete student:", error);
      const message = error?.response?.data?.detail || "Gagal menghapus siswa";
      toast.error(message);
    }
    setActionLoading(false);
  };

  const filteredStudents = students.filter((student) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      student.nis.toLowerCase().includes(term) ||
      student.nama.toLowerCase().includes(term) ||
      student.id_kelas.toLowerCase().includes(term);
    const matchesClass =
      !classFilter || student.id_kelas.toUpperCase() === classFilter;
    const matchesAngkatan =
      !angkatanFilter || student.angkatan === angkatanFilter;
    const matchesStatus =
      statusFilter === "all" ? true : student.status_siswa === statusFilter;
    return matchesSearch && matchesClass && matchesAngkatan && matchesStatus;
  });

  const activeStudents = students.filter(
    (student) => student.status_siswa === "aktif"
  );
  const archivedCount = students.length - activeStudents.length;

  const selectedCount = selectedNis.size;
  const allVisibleSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) => selectedNis.has(student.nis));
  const sortedClasses = [...classes].sort((a, b) =>
    a.nama_kelas.localeCompare(b.nama_kelas)
  );
  const availableClassNames = sortedClasses.map((k) =>
    formatClassCode(k.nama_kelas)
  );
  const angkatanOptions = Array.from(
    new Set(
      students
        .map((student) => normalizeAngkatanValue(student.angkatan))
        .filter((angkatan) => angkatan)
    )
  ).sort();
  const editClassExists =
    !selectedStudent ||
    !editStudent.id_kelas ||
    availableClassNames.includes(editStudent.id_kelas);
  const selectedStatusMeta = selectedStudent
    ? getStatusMeta(selectedStudent.status_siswa)
    : null;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedCount > 0 && !allVisibleSelected;
    }
  }, [selectedCount, allVisibleSelected]);

  // Menandai atau membatalkan pilihan siswa tertentu untuk aksi bulk
  const toggleSelectStudent = (nis) => {
    setSelectedNis((prev) => {
      const next = new Set(prev);
      if (next.has(nis)) {
        next.delete(nis);
      } else {
        next.add(nis);
      }
      return next;
    });
  };

  // Memilih semua siswa yang sedang tampil atau mengosongkan pilihan sekaligus
  const toggleSelectAll = () => {
    setSelectedNis((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredStudents.forEach((student) => next.delete(student.nis));
      } else {
        filteredStudents.forEach((student) => next.add(student.nis));
      }
      return next;
    });
  };

  // Menghapus banyak siswa secara serentak dengan peringatan terhadap kegagalan parsial
  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;
    const ok = window.confirm(`Hapus ${selectedCount} siswa terpilih?`);
    if (!ok) return;

    setActionLoading(true);
    const failed = [];

    try {
      for (const nis of selectedNis) {
        try {
          await apiClient.delete(`/siswa/${nis}`);
        } catch (error) {
          console.error(`Failed to delete student ${nis}:`, error);
          failed.push(nis);
        }
      }

      if (failed.length === 0) {
        toast.success(`Berhasil menghapus ${selectedCount} siswa`);
      } else {
        toast.error(
          `Gagal menghapus ${failed.length} siswa: ${failed.join(", ")}`
        );
      }

      setSelectedNis(new Set());
      await fetchStudents();
    } finally {
      setActionLoading(false);
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
          <h1 className="text-3xl font-bold text-gray-900">Data Siswa</h1>
          <p className="text-gray-600 mt-1">Kelola data siswa sekolah</p>
        </div>

        {user?.role === "admin" && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Tambah Siswa
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Siswa Aktif</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeStudents.length}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Laki-laki</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeStudents.filter((s) => s.jenis_kelamin === "L").length}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Perempuan</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeStudents.filter((s) => s.jenis_kelamin === "P").length}
              </p>
            </div>
            <Users className="w-8 h-8 text-pink-600" />
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Arsip (Nonaktif)
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {archivedCount}
              </p>
            </div>
            <Users className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Termasuk status lulus, pindah, dan dikeluarkan
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="modern-card p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berdasarkan NIS, nama, atau kelas..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleSearch(e.target.value);
              }}
              className="modern-input input-with-icon-left"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersVisible((prev) => !prev)}
            className="btn-secondary flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            {filtersVisible ? "Sembunyikan Filter" : "Filter"}
          </button>
          {user?.role === "admin" && (
            <button
              onClick={handleBulkDelete}
              className="btn-secondary text-red-600 hover:text-red-700 ml-auto"
              disabled={actionLoading || selectedCount === 0}
            >
              Hapus Terpilih {selectedCount > 0 ? `(${selectedCount})` : ""}
            </button>
          )}
        </div>
        {filtersVisible && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Filter Kelas
              </label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="modern-input"
              >
                <option value="">Semua Kelas</option>
                {availableClassNames.map((namaKelas) => (
                  <option key={namaKelas} value={namaKelas}>
                    {namaKelas}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Filter Angkatan
              </label>
              <select
                value={angkatanFilter}
                onChange={(e) => setAngkatanFilter(e.target.value)}
                className="modern-input"
              >
                <option value="">Semua Angkatan</option>
                {angkatanOptions.map((angkatan) => (
                  <option key={angkatan} value={angkatan}>
                    {angkatan}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Filter Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="modern-input"
              >
                <option value="all">Semua Status</option>
                {STUDENT_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Students Table */}
      <div className="modern-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                {user?.role === "admin" && (
                  <th className="w-12">
                    <input
                      type="checkbox"
                      ref={selectAllRef}
                      checked={allVisibleSelected && selectedCount > 0}
                      onChange={toggleSelectAll}
                      disabled={filteredStudents.length === 0}
                    />
                  </th>
                )}
                <th>NIS</th>
                <th>Nama</th>
                <th>Kelas</th>
                <th>Angkatan</th>
                <th>Status</th>
                <th>Jenis Kelamin</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const statusMeta = getStatusMeta(student.status_siswa);
                return (
                  <tr key={student.nis}>
                  {user?.role === "admin" && (
                    <td className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedNis.has(student.nis)}
                        onChange={() => toggleSelectStudent(student.nis)}
                        disabled={actionLoading}
                      />
                    </td>
                  )}
                  <td className="font-medium">{formatNumericId(student.nis)}</td>
                  <td>{student.nama}</td>
                  <td>
                    <span className="badge badge-info">{student.id_kelas}</span>
                  </td>
                  <td>{formatNumericId(student.angkatan)}</td>
                  <td>
                    <span className={`badge ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        student.jenis_kelamin === "L"
                          ? "badge-info"
                          : "badge-warning"
                      }`}
                    >
                      {student.jenis_kelamin === "L"
                        ? "Laki-laki"
                        : "Perempuan"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openDetailModal(student)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Lihat detail siswa"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      {user?.role === "admin" && (
                        <>
                          <button
                            onClick={() => openEditModal(student)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit data siswa"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Hapus data siswa"
                            disabled={actionLoading}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </>
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

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Tambah Siswa Baru
            </h2>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">NIS</label>
                  <input
                    type="text"
                    value={newStudent.nis}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, nis: e.target.value })
                    }
                    className="modern-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap</label>
                  <input
                    type="text"
                    value={newStudent.nama}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        nama: formatStudentNameInput(e.target.value),
                      })
                    }
                    className="modern-input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="form-label">Kelas</label>
                  <select
                    value={newStudent.id_kelas}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        id_kelas: formatClassCodeInput(e.target.value),
                      })
                    }
                    className="modern-input"
                    required
                    disabled={sortedClasses.length === 0}
                  >
                    <option value="">Pilih kelas...</option>
                    {sortedClasses.map((kelasItem) => (
                      <option
                        key={kelasItem.id}
                        value={formatClassCode(kelasItem.nama_kelas)}
                      >
                        {formatClassCode(kelasItem.nama_kelas)}{" "}
                        {kelasItem.tingkat
                          ? `(Tingkat ${kelasItem.tingkat})`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {sortedClasses.length === 0 && (
                    <p className="text-xs text-red-600 mt-2">
                      Tambahkan data kelas terlebih dahulu di menu Master Data.
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Angkatan</label>
                  <input
                    type="text"
                    value={newStudent.angkatan}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, angkatan: e.target.value })
                    }
                    className="modern-input"
                    placeholder="contoh: 2024"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Jenis Kelamin</label>
                  <select
                    value={newStudent.jenis_kelamin}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        jenis_kelamin: e.target.value,
                      })
                    }
                    className="modern-input"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status Siswa</label>
                  <select
                    value={newStudent.status_siswa}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        status_siswa: e.target.value,
                      })
                    }
                    className="modern-input"
                  >
                    {STUDENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Status Nonaktif otomatis menonaktifkan akses proses bisnis.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={sortedClasses.length === 0}
                >
                  Tambah Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload CSV Modal */}
      {showUploadModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowUploadModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Upload Data Siswa
            </h2>

            <div className="mb-6">
              <div className="p-4 bg-blue-50 rounded-lg mb-4">
                <h3 className="font-medium text-blue-900 mb-2">
                  Format File CSV/Excel:
                </h3>
                <p className="text-sm text-blue-700 mb-2">
                  File harus memiliki kolom berikut:
                </p>
                <code className="text-xs bg-blue-100 p-2 rounded block">
                  nis,nama,id_kelas,angkatan,jeniskelamin[,aktif][,status_siswa][,tahun_ajaran]
                </code>
                <p className="text-xs text-blue-600 mt-2">
                  Kolom <span className="font-semibold">aktif</span>, <span className="font-semibold">status_siswa</span>, dan <span className="font-semibold">tahun_ajaran</span> bersifat opsional.
                  Jika status tidak diisi, sistem akan menganggap siswa masih aktif.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Contoh: 20240001,Budi Setiawan,10A,2024,L,true,aktif,2024-2025
                </p>
              </div>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Pilih File</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Klik untuk memilih file
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    Format yang didukung: CSV, Excel (.xlsx, .xls)
                  </p>
                  {uploadFile && (
                    <p className="text-sm text-green-600 mt-2">
                      File dipilih: {uploadFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn-secondary"
                  disabled={uploadLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                  disabled={uploadLoading}
                >
                  {uploadLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Mengupload...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUploadErrors && uploadErrors.length > 0 && (
        <div className="modal-overlay" onClick={() => setShowUploadErrors(false)}>
          <div
            className="modal-content max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Detail Error Upload
              </h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowUploadErrors(false)}
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Hanya admin yang dapat melihat ringkasan ini. Gunakan informasi di bawah untuk memperbaiki file sebelum mengunggah ulang.
            </p>
            <div className="max-h-72 overflow-y-auto">
              <ol className="space-y-2 text-sm text-red-600 list-decimal list-inside">
                {uploadErrors.map((item, index) => (
                  <li key={`${item}-${index}`} className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {item}
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowUploadErrors(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedStudent && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowDetailModal(false);
            setSelectedStudent(null);
          }}
        >
          <div
            className="modal-content max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Detail Siswa</h2>
            </div>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">NIS</p>
                  <p className="font-medium text-gray-900">
                    {formatNumericId(selectedStudent.nis)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Nama Lengkap</p>
                  <p className="font-medium text-gray-900">
                    {selectedStudent.nama}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Kelas</p>
                  <p className="font-medium text-gray-900">
                    {selectedStudent.id_kelas}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Angkatan</p>
                  <p className="font-medium text-gray-900">
                    {formatNumericId(selectedStudent.angkatan)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">Jenis Kelamin</p>
                  <p className="font-medium text-gray-900">
                    {selectedStudent.jenis_kelamin === "L"
                      ? "Laki-laki"
                      : "Perempuan"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <div className="flex items-center gap-2">
                    {selectedStatusMeta && (
                      <span className={`badge ${selectedStatusMeta.className}`}>
                        {selectedStatusMeta.label}
                      </span>
                    )}
                    {selectedStudent.status_siswa !== "aktif" && (
                      <span className="text-xs text-amber-600">
                        Arsip/nonaktif
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedStudent(null);
                }}
                className="btn-primary"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedStudent && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowEditModal(false);
            setSelectedStudent(null);
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Edit Data Siswa
            </h2>
            <form onSubmit={handleEditStudent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">NIS</label>
                  <input
                    type="text"
                    value={selectedStudent.nis}
                    disabled
                    className="modern-input bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap</label>
                  <input
                    type="text"
                    value={editStudent.nama}
                    onChange={(e) =>
                      setEditStudent({
                        ...editStudent,
                        nama: formatStudentNameInput(e.target.value),
                      })
                    }
                    className="modern-input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="form-label">Kelas</label>
                  <select
                    value={editStudent.id_kelas}
                    onChange={(e) =>
                      setEditStudent({
                        ...editStudent,
                        id_kelas: formatClassCodeInput(e.target.value),
                      })
                    }
                    className="modern-input"
                    required
                    disabled={
                      sortedClasses.length === 0 && !editStudent.id_kelas
                    }
                  >
                    <option value="">Pilih kelas...</option>
                    {!editClassExists && editStudent.id_kelas && (
                      <option value={editStudent.id_kelas}>
                        {editStudent.id_kelas} (tidak terdaftar di master data)
                      </option>
                    )}
                    {sortedClasses.map((kelasItem) => (
                      <option
                        key={kelasItem.id}
                        value={formatClassCode(kelasItem.nama_kelas)}
                      >
                        {formatClassCode(kelasItem.nama_kelas)}{" "}
                        {kelasItem.tingkat
                          ? `(Tingkat ${kelasItem.tingkat})`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {sortedClasses.length === 0 && (
                    <p className="text-xs text-red-600 mt-2">
                      Tambahkan data kelas terlebih dahulu di menu Master Data.
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Angkatan</label>
                  <input
                    type="text"
                    value={editStudent.angkatan}
                    onChange={(e) =>
                      setEditStudent({
                        ...editStudent,
                        angkatan: e.target.value,
                      })
                    }
                    className="modern-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Jenis Kelamin</label>
                  <select
                    value={editStudent.jenis_kelamin}
                    onChange={(e) =>
                      setEditStudent({
                        ...editStudent,
                        jenis_kelamin: e.target.value,
                      })
                    }
                    className="modern-input"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status Siswa</label>
                  <select
                    value={editStudent.status_siswa}
                    onChange={(e) =>
                      setEditStudent({
                        ...editStudent,
                        status_siswa: e.target.value,
                      })
                    }
                    className="modern-input"
                  >
                    {STUDENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Status nonaktif akan mengarsipkan siswa dari proses bisnis.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedStudent(null);
                  }}
                  className="btn-secondary"
                  disabled={actionLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
