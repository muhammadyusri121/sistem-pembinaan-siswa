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

// Use configured API client with auth header

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
  });
  const [editStudent, setEditStudent] = useState({
    nama: "",
    id_kelas: "",
    angkatan: "",
    jenis_kelamin: "L",
    aktif: true,
  });
  const [actionLoading, setActionLoading] = useState(false);
  const selectAllRef = useRef(null);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await apiClient.get(`/siswa`);
      setStudents(response.data);
      setSelectedNis(new Set());
    } catch (error) {
      console.error("Failed to fetch students:", error);
      toast.error("Gagal memuat data siswa");
    }
    setLoading(false);
  };

  const fetchClasses = async () => {
    try {
      const response = await apiClient.get(`/master-data/kelas`);
      setClasses(response.data);
    } catch (error) {
      console.error("Failed to fetch classes:", error);
      toast.error(
        "Gagal memuat data kelas. Pastikan data master sudah dibuat."
      );
    }
  };

  const handleSearch = async (term) => {
    if (term.trim()) {
      try {
        const response = await apiClient.get(`/siswa/search/${term}`);
        setStudents(response.data);
      } catch (error) {
        console.error("Search failed:", error);
      }
    } else {
      fetchStudents();
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/siswa`, newStudent);
      toast.success("Siswa berhasil ditambahkan");
      setShowAddModal(false);
      setNewStudent({
        nis: "",
        nama: "",
        id_kelas: "",
        angkatan: "",
        jenis_kelamin: "L",
        aktif: true,
      });
      fetchStudents();
    } catch (error) {
      console.error("Failed to add student:", error);
      toast.error("Gagal menambahkan siswa");
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Pilih file terlebih dahulu");
      return;
    }

    const formData = new FormData();
    formData.append("file", uploadFile);

    setUploadLoading(true);
    try {
      const response = await apiClient.post(`/siswa/upload-csv`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success(
        `Upload berhasil! ${response.data.success_count} siswa ditambahkan`
      );
      if (response.data.error_count > 0) {
        toast.warning(`${response.data.error_count} data gagal diproses`);
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

  const openDetailModal = (student) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setEditStudent({
      nama: student.nama,
      id_kelas: student.id_kelas,
      angkatan: student.angkatan,
      jenis_kelamin: student.jenis_kelamin || "L",
      aktif: Boolean(student.aktif),
    });
    setShowEditModal(true);
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setActionLoading(true);
    try {
      await apiClient.put(`/siswa/${selectedStudent.nis}`, editStudent);
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

  const filteredStudents = students.filter(
    (student) =>
      student.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id_kelas.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCount = selectedNis.size;
  const allVisibleSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) => selectedNis.has(student.nis));
  const sortedClasses = [...classes].sort((a, b) =>
    a.nama_kelas.localeCompare(b.nama_kelas)
  );
  const availableClassNames = sortedClasses.map((k) => k.nama_kelas);
  const editClassExists =
    !selectedStudent ||
    !editStudent.id_kelas ||
    availableClassNames.includes(editStudent.id_kelas);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedCount > 0 && !allVisibleSelected;
    }
  }, [selectedCount, allVisibleSelected]);

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
              <p className="text-sm font-medium text-gray-600">Total Siswa</p>
              <p className="text-2xl font-bold text-gray-900">
                {students.length}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Siswa Aktif</p>
              <p className="text-2xl font-bold text-gray-900">
                {students.filter((s) => s.aktif).length}
              </p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Laki-laki</p>
              <p className="text-2xl font-bold text-gray-900">
                {students.filter((s) => s.jenis_kelamin === "L").length}
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
                {students.filter((s) => s.jenis_kelamin === "P").length}
              </p>
            </div>
            <Users className="w-8 h-8 text-pink-600" />
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
              placeholder="Cari berdasarkan NIS, nama, atau kelas..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleSearch(e.target.value);
              }}
              className="modern-input input-with-icon-left"
            />
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          {user?.role === "admin" && (
            <button
              onClick={handleBulkDelete}
              className="btn-secondary text-red-600 hover:text-red-700"
              disabled={actionLoading || selectedCount === 0}
            >
              Hapus Terpilih {selectedCount > 0 ? `(${selectedCount})` : ""}
            </button>
          )}
        </div>
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
                <th>Jenis Kelamin</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
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
                    <span
                      className={`badge ${
                        student.aktif ? "badge-success" : "badge-danger"
                      }`}
                    >
                      {student.aktif ? "Aktif" : "Tidak Aktif"}
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
              ))}
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
                      setNewStudent({ ...newStudent, nama: e.target.value })
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
                      setNewStudent({ ...newStudent, id_kelas: e.target.value })
                    }
                    className="modern-input"
                    required
                    disabled={sortedClasses.length === 0}
                  >
                    <option value="">Pilih kelas...</option>
                    {sortedClasses.map((kelasItem) => (
                      <option key={kelasItem.id} value={kelasItem.nama_kelas}>
                        {kelasItem.nama_kelas}{" "}
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
                  nis,nama,id_kelas,angkatan,jeniskelamin,aktif
                </code>
                <p className="text-xs text-blue-600 mt-2">
                  Contoh: 20240001,Budi Setiawan,10A,2024,L,true
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
              <span
                className={`badge ${
                  selectedStudent.aktif ? "badge-success" : "badge-danger"
                }`}
              >
                {selectedStudent.aktif ? "Aktif" : "Tidak Aktif"}
              </span>
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
                  <p className="font-medium text-gray-900">
                    {selectedStudent.aktif ? "Aktif" : "Tidak Aktif"}
                  </p>
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
                      setEditStudent({ ...editStudent, nama: e.target.value })
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
                        id_kelas: e.target.value,
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
                      <option key={kelasItem.id} value={kelasItem.nama_kelas}>
                        {kelasItem.nama_kelas}{" "}
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
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  value={editStudent.aktif ? "1" : "0"}
                  onChange={(e) =>
                    setEditStudent({
                      ...editStudent,
                      aktif: e.target.value === "1",
                    })
                  }
                  className="modern-input"
                >
                  <option value="1">Aktif</option>
                  <option value="0">Tidak Aktif</option>
                </select>
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
