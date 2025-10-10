// Form pelaporan pelanggaran yang memandu guru dalam proses input
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../App";
import { apiClient } from "../services/api";
import { toast } from "sonner";
import {
  AlertTriangle,
  Search,
  MapPin,
  Camera,
  Send,
  FileText,
  Clock,
  Clock3,
  User,
  CornerUpLeft,
  BookOpen,
} from "lucide-react";
import { formatNumericId } from "../lib/formatters";

// Use configured API client with auth header

// Komponen pelaporan dengan fitur pencarian siswa dan penjadwalan waktu kejadian
const ViolationReporting = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [violationTypes, setViolationTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeMode, setTimeMode] = useState("now");
  const [violation, setViolation] = useState({
    nis_siswa: "",
    jenis_pelanggaran_id: "",
    waktu_kejadian: "",
    tempat: "",
    detail_kejadian: "",
    bukti_foto: "",
  });

  // Mengubah objek Date menjadi format string yang kompatibel dengan input datetime-local
  const toDateTimeLocalValue = (date) => {
    const pad = (value) => `${value}`.padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  useEffect(() => {
    fetchStudents();
    fetchViolationTypes();
    setViolation((prev) => ({
      ...prev,
      waktu_kejadian: toDateTimeLocalValue(new Date()),
    }));
  }, []);

  useEffect(() => {
    if (timeMode !== "now") {
      return () => {};
    }

    const updateTime = () => {
      setViolation((prev) => ({
        ...prev,
        waktu_kejadian: toDateTimeLocalValue(new Date()),
      }));
    };

    updateTime();
    const intervalId = setInterval(updateTime, 60000);
    return () => clearInterval(intervalId);
  }, [timeMode]);

  // Mendapatkan daftar siswa untuk dipilih petugas pelapor
  const fetchStudents = async () => {
    try {
      const response = await apiClient.get(`/siswa`);
      setStudents(response.data);
    } catch (error) {
      console.error("Failed to fetch students:", error);
      toast.error("Gagal memuat data siswa");
    }
  };

  // Mengambil daftar jenis pelanggaran sebagai referensi form
  const fetchViolationTypes = async () => {
    try {
      const response = await apiClient.get(`/master-data/jenis-pelanggaran`);
      setViolationTypes(response.data);
    } catch (error) {
      console.error("Failed to fetch violation types:", error);
      toast.error("Gagal memuat jenis pelanggaran");
    }
  };

  // Pencarian cepat siswa berdasarkan teks bebas pada modal pemilihan
  const handleStudentSearch = async (term) => {
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

  // Menetapkan siswa yang dipilih sekaligus mengisi NIS di data pelanggaran
  const selectStudent = (student) => {
    setSelectedStudent(student);
    setViolation((prev) => ({ ...prev, nis_siswa: student.nis }));
    setShowStudentModal(false);
    setSearchTerm("");
  };

  // Mengirim laporan pelanggaran baru dan mereset form setelah berhasil
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!violation.nis_siswa) {
      toast.error("Pilih siswa terlebih dahulu");
      return;
    }

    if (!violation.jenis_pelanggaran_id) {
      toast.error("Pilih jenis pelanggaran");
      return;
    }

    setLoading(true);
    try {
      const violationData = {
        ...violation,
        waktu_kejadian: new Date(violation.waktu_kejadian).toISOString(),
      };

      await apiClient.post(`/pelanggaran`, violationData);
      toast.success("Pelanggaran berhasil dilaporkan");

      // Reset form
      setSelectedStudent(null);
      setViolation({
        nis_siswa: "",
        jenis_pelanggaran_id: "",
        waktu_kejadian: toDateTimeLocalValue(new Date()),
        tempat: "",
        detail_kejadian: "",
        bukti_foto: "",
      });
      setTimeMode("now");
    } catch (error) {
      console.error("Failed to report violation:", error);
      toast.error("Gagal melaporkan pelanggaran");
    }
    setLoading(false);
  };

  const filteredStudents = students.filter(
    (student) =>
      student.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id_kelas.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getViolationTypeInfo = (id) => {
    return violationTypes.find((v) => v.id === id);
  };

  const handleTimeModeChange = (mode) => {
    setTimeMode(mode);
    if (mode === "now") {
      setViolation((prev) => ({
        ...prev,
        waktu_kejadian: toDateTimeLocalValue(new Date()),
      }));
    } else {
      setViolation((prev) => ({
        ...prev,
        waktu_kejadian: prev.waktu_kejadian || toDateTimeLocalValue(new Date()),
      }));
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary flex items-center gap-2"
          >
            <CornerUpLeft className="w-4 h-4" />
            Kembali
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Lapor Pelanggaran
            </h1>
            <p className="text-gray-600 mt-1">
              Laporkan pelanggaran siswa dengan detail lengkap
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500">
          <User className="w-4 h-4" />
          <span>Pelapor: {user?.full_name}</span>
        </div>
      </div>

      {/* Warning Info */}
      <div className="modern-card p-6 violation-warning-card">
        <div className="flex items-start gap-4">
          <AlertTriangle className="violation-warning-card__icon" />
          <div>
            <h3 className="violation-warning-card__title">Panduan Pelaporan</h3>
            <ul className="violation-warning-card__list">
              <li>Pastikan informasi yang dilaporkan akurat dan sesuai fakta</li>
              <li>Isi detail kejadian dengan lengkap untuk memudahkan proses pembinaan</li>
              <li>Upload bukti foto jika tersedia (opsional)</li>
              <li>Laporan akan diteruskan ke wali kelas dan guru BK terkait</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="modern-card p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Selection */}
          <div className="form-group">
            <label className="form-label">Pilih Siswa</label>
            <div className="space-y-3">
              {selectedStudent ? (
                <div className="violation-student-card flex items-center justify-between p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="violation-student-card__meta">
                      <p className="violation-student-card__name font-semibold">
                        {selectedStudent.nama}
                      </p>
                      <p className="violation-student-card__info text-sm">
                        NIS: {formatNumericId(selectedStudent.nis)} • Kelas: {selectedStudent.id_kelas} • Angkatan: {formatNumericId(selectedStudent.angkatan)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowStudentModal(true)}
                    className="btn-secondary text-sm violation-change-button"
                  >
                    Ganti Siswa
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowStudentModal(true)}
                  className="violation-student-picker w-full p-4 rounded-lg text-center transition-colors"
                >
                  <Search className="violation-student-picker__icon w-6 h-6 mx-auto mb-2 pointer-events-none" />
                  <p className="violation-student-picker__text">Klik untuk memilih siswa</p>
                </button>
              )}
            </div>
          </div>

          {/* Violation Type */}
          <div className="form-group">
            <label className="form-label">Jenis Pelanggaran</label>
            <select
              value={violation.jenis_pelanggaran_id}
              onChange={(e) =>
                setViolation({
                  ...violation,
                  jenis_pelanggaran_id: e.target.value,
                })
              }
              className="modern-input"
              required
            >
              <option value="">Pilih jenis pelanggaran</option>
              {violationTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.nama_pelanggaran} - {type.kategori}
                </option>
              ))}
            </select>

            {violation.jenis_pelanggaran_id && (
              <div className="violation-type-info mt-2 p-3 rounded-lg">
                {(() => {
                  const typeInfo = getViolationTypeInfo(
                    violation.jenis_pelanggaran_id
                  );
                  return typeInfo ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`badge ${
                            typeInfo.kategori === "Berat"
                              ? "badge-danger"
                              : typeInfo.kategori === "Sedang"
                              ? "badge-warning"
                              : "badge-info"
                          }`}
                        >
                          {typeInfo.kategori}
                        </span>
                      </div>
                      {typeInfo.deskripsi && (
                        <p className="violation-type-info__description text-sm">
                          {typeInfo.deskripsi}
                        </p>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Waktu Kejadian</label>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => handleTimeModeChange("now")}
                  className={`violation-time-toggle flex items-center gap-2 ${
                    timeMode === "now" ? "violation-time-toggle--accent" : ""
                  }`}
                >
                  <Clock3 className="w-4 h-4" />
                  Gunakan Waktu Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeModeChange("manual")}
                  className={`violation-time-toggle flex items-center gap-2 ${
                    timeMode === "manual"
                      ? "violation-time-toggle--soft"
                      : ""
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Isi Manual
                </button>
              </div>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={violation.waktu_kejadian}
                  onChange={(e) =>
                    setViolation({
                      ...violation,
                      waktu_kejadian: e.target.value,
                    })
                  }
                  className={`modern-input input-with-icon-left ${
                    timeMode === "now" ? "violation-datetime-input--locked" : ""
                  }`}
                  required
                  disabled={timeMode === "now"}
                />
                <Clock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="form-group md:mt-12">
              <label className="form-label">Tempat Kejadian</label>
              <div className="relative">
                <input
                  type="text"
                  value={violation.tempat}
                  onChange={(e) =>
                    setViolation({ ...violation, tempat: e.target.value })
                  }
                  className="modern-input input-with-icon-left"
                  placeholder="contoh: Ruang Kelas 10A, Kantin, Halaman Sekolah"
                  required
                />
                <MapPin className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Detail */}
          <div className="form-group">
            <label className="form-label">Detail Kejadian</label>
            <div className="relative">
              <textarea
                value={violation.detail_kejadian}
                onChange={(e) =>
                  setViolation({
                    ...violation,
                    detail_kejadian: e.target.value,
                  })
                }
                className="modern-input input-with-icon-left min-h-32 pt-4"
                placeholder="Jelaskan secara detail kronologi kejadian, siapa saja yang terlibat, dan dampak yang ditimbulkan..."
                required
              />
              <FileText className="w-5 h-5 text-gray-400 absolute left-4 top-4 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Minimal 50 karakter. Berikan informasi sedetail mungkin untuk
              memudahkan proses pembinaan.
            </p>
          </div>

          {/* Evidence Photo (Optional) */}
          <div className="form-group">
            <label className="form-label">Bukti Foto (Opsional)</label>
            <div className="relative">
              <input
                type="text"
                value={violation.bukti_foto}
                onChange={(e) =>
                  setViolation({ ...violation, bukti_foto: e.target.value })
                }
                className="modern-input input-with-icon-left"
                placeholder="URL foto bukti (jika ada)"
              />
              <Camera className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Upload foto ke layanan cloud dan masukkan URL-nya di sini, atau
              kosongkan jika tidak ada bukti foto.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setSelectedStudent(null);
                setTimeMode("now");
                setViolation({
                  nis_siswa: "",
                  jenis_pelanggaran_id: "",
                  waktu_kejadian: toDateTimeLocalValue(new Date()),
                  tempat: "",
                  detail_kejadian: "",
                  bukti_foto: "",
                });
              }}
              className="btn-secondary"
              disabled={loading}
            >
              Reset Form
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Melaporkan...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Laporkan Pelanggaran
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Student Selection Modal */}
      {showStudentModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowStudentModal(false)}
        >
          <div
            className="modal-content max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Pilih Siswa
            </h2>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan NIS, nama, atau kelas..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    handleStudentSearch(e.target.value);
                  }}
                  className="modern-input input-with-icon-left"
                />
              </div>
            </div>

            {/* Students Grid */}
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredStudents.map((student) => (
                  <div
                    key={student.nis}
                    onClick={() => selectStudent(student)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {student.nama}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>NIS: {formatNumericId(student.nis)}</span>
                          <span>•</span>
                          <span className="badge badge-info text-xs">
                            {student.id_kelas}
                          </span>
                          <span>•</span>
                          <span>{formatNumericId(student.angkatan)}</span>
                        </div>
                      </div>
                      <BookOpen className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>

              {filteredStudents.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm
                      ? "Tidak ada siswa yang ditemukan"
                      : "Memuat data siswa..."}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowStudentModal(false)}
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

export default ViolationReporting;
