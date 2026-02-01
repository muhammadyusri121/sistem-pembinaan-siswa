// Form pelaporan pelanggaran yang memandu guru dalam proses input
import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
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
  X,
  Aperture,
  Image as ImageIcon,
  RefreshCw,
  Check,
  Loader2,
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
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Success modal state
  const [successStep, setSuccessStep] = useState('idle'); // idle, loading, success
  const [loading, setLoading] = useState(false);
  const [timeMode, setTimeMode] = useState("now");
  const [violation, setViolation] = useState({
    nis_siswa: "",
    jenis_pelanggaran_id: "",
    waktu_kejadian: "",
    tempat: "",
    detail_kejadian: "",
    detail_kejadian: "",
    bukti_foto: null,
  });
  const activeStudents = useMemo(
    () => students.filter((student) => student.status_siswa === "aktif"),
    [students]
  );

  // Camera handler refs and state
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const pageShellClasses =
    "min-h-screen space-y-8 sm:space-y-5 bg-rose-50/80 text-gray-900 dark:bg-slate-950 dark:text-slate-100 px-4 sm:px-6 lg:px-8 py-8 transition-colors";
  const cardClasses =
    "rounded-[8px] bg-white/95 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/70 dark:shadow-xl dark:shadow-black/40 dark:ring-1 dark:ring-slate-700/60";


  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setCameraStream(stream);
      setIsCameraOpen(true);
      // Wait for state update then assign stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 0);
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("Gagal mengakses kamera. Pastikan izin diberikan.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to file
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
          setViolation(prev => ({ ...prev, bukti_foto: file }));

          // Create preview URL
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);

          stopCamera();
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const clearPhoto = () => {
    setViolation(prev => ({ ...prev, bukti_foto: null }));
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

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
      return () => { };
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

  // Handle animation sequence for success modal
  useEffect(() => {
    if (showSuccessModal) {
      setSuccessStep('loading');
      // Spin for 800ms then show success
      const timer = setTimeout(() => {
        setSuccessStep('success');
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setSuccessStep('idle');
    }
  }, [showSuccessModal]);

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
      const formData = new FormData();
      formData.append("nis_siswa", violation.nis_siswa);
      formData.append("jenis_pelanggaran_id", violation.jenis_pelanggaran_id);
      formData.append("waktu_kejadian", new Date(violation.waktu_kejadian).toISOString());
      formData.append("tempat", violation.tempat);
      formData.append("detail_kejadian", violation.detail_kejadian);

      if (violation.bukti_foto) {
        formData.append("bukti_foto", violation.bukti_foto);
      }

      await apiClient.post("/pelanggaran/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      // toast.success("Pelanggaran berhasil dilaporkan"); 
      setShowSuccessModal(true); // Show success modal instead of toast


      setViolation({
        nis_siswa: "",
        jenis_pelanggaran_id: "",
        waktu_kejadian: toDateTimeLocalValue(new Date()),
        tempat: "",
        detail_kejadian: "",
        bukti_foto: null,
      });
      setPreviewUrl(null);
      setTimeMode("now");
    } catch (error) {
      console.error("Failed to report violation:", error);
      toast.error("Gagal melaporkan pelanggaran");
    }
    setLoading(false);
  };

  const filteredStudents = activeStudents.filter(
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
    <div className={`${pageShellClasses} fade-in`}>
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
      <div className={`${cardClasses} p-6 violation-warning-card`}>
        <div className="flex items-start gap-4">
          <AlertTriangle className="violation-warning-card__icon" />
          <div>
            <h3 className="violation-warning-card__title">Panduan Pelaporan</h3>
            <ul className="violation-warning-card__list">
              <li>
                Pastikan informasi yang dilaporkan akurat dan sesuai fakta
              </li>
              <li>
                Isi detail kejadian dengan lengkap untuk memudahkan proses
                pembinaan
              </li>
              <li>Upload bukti foto jika tersedia (opsional)</li>
              <li>Laporan akan diteruskan ke wali kelas dan guru BK terkait</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className={cardClasses}>
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
                        NIS: {formatNumericId(selectedStudent.nis)} • Kelas:{" "}
                        {selectedStudent.id_kelas} • Angkatan:{" "}
                        {formatNumericId(selectedStudent.angkatan)}
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
                  <p className="violation-student-picker__text">
                    Klik untuk memilih siswa
                  </p>
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
                          className={`badge ${typeInfo.kategori === "Berat"
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
                  className={`violation-time-toggle flex items-center gap-2 ${timeMode === "now" ? "violation-time-toggle--accent" : ""
                    }`}
                >
                  <Clock3 className="w-4 h-4" />
                  Gunakan Waktu Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeModeChange("manual")}
                  className={`violation-time-toggle flex items-center gap-2 ${timeMode === "manual" ? "violation-time-toggle--soft" : ""
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
                  className={`modern-input input-with-icon-left ${timeMode === "now" ? "violation-datetime-input--locked" : ""
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

          <div className="form-group">
            <label className="form-label">Bukti Foto (Opsional)</label>

            {!isCameraOpen && !violation.bukti_foto && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                >
                  <Camera className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mb-2" />
                  <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">Buka Kamera</span>
                </button>

                <div className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group">
                  <ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mb-2" />
                  <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">Upload File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setViolation({ ...violation, bukti_foto: file });
                        setPreviewUrl(URL.createObjectURL(file));
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Camera Modal Pop-up */}
            {isCameraOpen && (
              <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
                <div className="relative w-full h-full sm:max-w-4xl sm:h-auto sm:aspect-video bg-black sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  {/* Close button top right */}
                  <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all border border-white/20"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Capture controls bottom */}
                  <div className="absolute bottom-6 sm:bottom-10 left-0 right-0 flex flex-col items-center gap-4">
                    <p className="text-white/80 text-xs sm:text-sm font-medium bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                      Posisikan bukti pelanggaran dengan jelas
                    </p>
                    <div className="flex justify-center items-center gap-10">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="p-6 bg-white rounded-full text-red-600 hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] border-4 border-gray-100"
                        title="Ambil Foto"
                      >
                        <Camera className="w-10 h-10" />
                      </button>
                    </div>
                  </div>

                  {/* Grid overlay for better framing (optional luxury feel) */}
                  <div className="absolute inset-0 pointer-events-none border-[0.5px] border-white/10 grid grid-cols-3 grid-rows-3">
                    <div className="border-[0.5px] border-white/5"></div>
                    <div className="border-[0.5px] border-white/5"></div>
                    <div className="border-[0.5px] border-white/5"></div>
                    <div className="border-[0.5px] border-white/5"></div>
                    <div className="border-[0.5px] border-white/5"></div>
                    <div className="border-[0.5px] border-white/5"></div>
                    <div className="border-[0.5px] border-white/5"></div>
                    <div className="border-[0.5px] border-white/5"></div>
                    <div className="border-[0.5px] border-white/5"></div>
                  </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            {violation.bukti_foto && !isCameraOpen && (
              <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <img
                  src={previewUrl}
                  alt="Preview Bukti"
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 bg-white border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm text-gray-600 truncate max-w-[200px]">
                    {violation.bukti_foto.name}
                  </span>
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="text-xs text-red-600 font-medium hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              Mendukung format JPG, PNG, WEBP. Maksimal 5MB.
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
                  bukti_foto: null,
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
                    className="p-4 border border-gray-200 rounded-lg hover:border-red-500 hover:bg-gradient-to-br hover:from-white hover:to-red-100/50 cursor-pointer transition-all duration-300"
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

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-sm w-full text-center transform scale-100 animate-in zoom-in-95 duration-300">

            <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 mb-6 relative transition-all duration-500">
              {/* Rotating outer ring - shows during loading, disappears or stays as border during success */}
              <div className={`absolute inset-0 border-4 border-green-500/30 rounded-full transition-all duration-500 ${successStep === 'success' ? 'scale-100 opacity-100' : 'scale-100 opacity-100'}`}></div>

              {/* Spinning segment */}
              <div className={`absolute inset-0 border-4 border-green-500 border-t-transparent rounded-full ${successStep === 'loading' ? 'animate-spin' : 'opacity-0'} transition-opacity duration-300`}></div>

              {/* Full circle completion ring */}
              <div className={`absolute inset-0 border-4 border-green-500 rounded-full ${successStep === 'success' ? 'scale-100 opacity-100' : 'scale-90 opacity-0'} transition-all duration-500 ease-out`}></div>

              {/* Checkmark icon - pops in when success */}
              <Check
                className={`h-10 w-10 text-green-600 relative z-10 ${successStep === 'success' ? 'scale-100 opacity-100 animate-in zoom-in-50 duration-300' : 'scale-0 opacity-0'} transition-all duration-300`}
                strokeWidth={3}
              />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Laporan Berhasil!
            </h3>
            <p className="text-gray-500 dark:text-slate-400 mb-8">
              Data pelanggaran siswa telah berhasil disimpan ke sistem.
            </p>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViolationReporting;
