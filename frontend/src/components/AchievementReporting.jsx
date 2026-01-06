// Form pelaporan prestasi yang memudahkan guru mencatat penghargaan siswa secara cepat
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Award,
  Search,
  Calendar as CalendarIcon,
  CornerUpLeft,
  Sparkles,
  Medal,
} from "lucide-react";

import { AuthContext } from "../App";
import { achievementService, studentService, apiClient } from "../services/api";
import { formatNumericId } from "../lib/formatters";

const tingkatOptions = [
  "Sekolah",
  "Kabupaten",
  "Provinsi",
  "Nasional",
  "Internasional",
];

const kategoriSuggestions = [
  "Akademik",
  "Non Akademik",
  "Organisasi",
  "Karya Ilmiah",
  "Olahraga",
  "Seni",
];

const defaultFormState = () => ({
  nis_siswa: "",
  judul: "",
  kategori: "",
  tingkat: "",

  tanggal_prestasi: new Date().toISOString().slice(0, 10),
  bukti: null,
  pemberi_penghargaan: "",
});

const AchievementReporting = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(() => defaultFormState());
  const activeStudents = useMemo(
    () => students.filter((student) => student.status_siswa === "aktif"),
    [students]
  );

  const cardClass = isDarkMode
    ? "rounded-[12px] border border-slate-800/60 bg-slate-900/60 p-6 shadow-xl shadow-black/40 ring-1 ring-slate-800/60 backdrop-blur-sm"
    : "rounded-[12px] bg-white/95 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur-sm";

  const headingTextClass = isDarkMode ? "text-slate-100" : "text-gray-900";
  const subTextClass = isDarkMode ? "text-slate-400" : "text-gray-500";
  const labelTextClass = isDarkMode ? "text-slate-200" : "text-gray-700";
  const dividerBorderClass = isDarkMode ? "border-slate-800" : "border-gray-100";
  const iconCircleClass = isDarkMode
    ? "bg-emerald-500/15 text-emerald-200"
    : "bg-emerald-50 text-emerald-600";
  const highlightPanelClass = isDarkMode
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
    : "border-emerald-200 bg-emerald-50/70 text-emerald-700";
  const highlightPanelMutedText = isDarkMode
    ? "text-emerald-100/80"
    : "text-emerald-700/80";
  const highlightEmptyText = isDarkMode ? "text-emerald-200" : "text-emerald-700";
  const inputSurfaceClass = isDarkMode
    ? "border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500"
    : "border-gray-200 bg-white text-gray-700 placeholder:text-gray-400";
  const inputBaseClass = `mt-2 w-full rounded-[10px] border px-4 py-2 text-sm shadow-sm ${inputSurfaceClass} focus:border-rose-400 focus:outline-none`;
  const textAreaClass = `mt-2 w-full rounded-[10px] border px-4 py-2 text-sm shadow-sm ${inputSurfaceClass} focus:border-rose-400 focus:outline-none`;
  const selectClass = inputBaseClass;
  const searchInputClass = `w-full rounded-full border px-4 py-2 pl-10 text-sm shadow-sm ${inputSurfaceClass} focus:border-rose-400 focus:outline-none`;
  const controlIconClass = isDarkMode ? "text-slate-500" : "text-gray-400";

  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const { data } = await studentService.list();
        setStudents(data);
      } catch (error) {
        console.error("Failed to fetch students:", error);
        toast.error("Gagal memuat data siswa");
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) {
      return activeStudents;
    }
    const keyword = searchTerm.toLowerCase();
    return activeStudents.filter((student) => {
      return (
        student.nama.toLowerCase().includes(keyword) ||
        student.nis.toLowerCase().includes(keyword) ||
        student.id_kelas.toLowerCase().includes(keyword)
      );
    });
  }, [searchTerm, activeStudents]);

  const selectedStudent = useMemo(
    () =>
      activeStudents.find((student) => student.nis === formData.nis_siswa) ||
      null,
    [activeStudents, formData.nis_siswa]
  );

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.nis_siswa) {
      toast.error("Pilih siswa terlebih dahulu");
      return;
    }
    if (!formData.judul.trim()) {
      toast.error("Isi judul prestasi");
      return;
    }
    if (!formData.tanggal_prestasi) {
      toast.error("Pilih tanggal prestasi");
      return;
    }

    setSubmitting(true);
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

      await apiClient.post("/prestasi/", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Prestasi berhasil dicatat");
      setFormData(() => defaultFormState());
      setSearchTerm("");
    } catch (error) {
      console.error("Failed to record achievement:", error);
      const message =
        error?.response?.data?.detail || "Gagal mencatat prestasi";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-3 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary flex items-center gap-2"
          >
            <CornerUpLeft className="h-4 w-4" />
            Kembali
          </button>
          <div>
            <h1 className={`text-3xl font-semibold ${headingTextClass}`}>
              Catat Prestasi
            </h1>
            <p className={`mt-1 ${subTextClass}`}>
              Catat prestasi siswa dan bantu sekolah merayakan pencapaian
              positif.
            </p>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div
          className={`flex flex-col gap-4 border-b ${dividerBorderClass} pb-4`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full ${iconCircleClass}`}
            >
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-500">
                Data Prestasi
              </p>
              <p className={`mt-1 text-sm ${subTextClass}`}>
                Isi formulir di bawah ini untuk menambahkan catatan prestasi
                siswa.
              </p>
            </div>
          </div>
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4">
              <label
                className={`block text-sm font-semibold ${labelTextClass}`}
              >
                Cari Siswa
              </label>
              <div className="relative">
                <Search
                  className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${controlIconClass}`}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Cari berdasarkan nama, NIS, atau kelas..."
                  className={searchInputClass}
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-semibold ${labelTextClass}`}
                >
                  Pilih Siswa
                </label>
                <select
                  name="nis_siswa"
                  value={formData.nis_siswa}
                  onChange={handleInputChange}
                  disabled={loadingStudents}
                  className={selectClass}
                >
                  <option value="">
                    {loadingStudents
                      ? "Memuat data siswa..."
                      : "Pilih siswa dari daftar"}
                  </option>
                  {filteredStudents.map((student) => (
                    <option key={student.nis} value={student.nis}>
                      {student.nama} · {formatNumericId(student.nis)} ·{" "}
                      {student.id_kelas.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              className={`rounded-[10px] border border-dashed p-4 text-sm ${highlightPanelClass}`}
            >
              {selectedStudent ? (
                <div className="space-y-2">
                  <div
                    className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] ${isDarkMode ? "text-emerald-300" : "text-emerald-500"
                      }`}
                  >
                    <Medal className="h-4 w-4" />
                    Siswa Terpilih
                  </div>
                  <p className="text-lg font-semibold">
                    {selectedStudent.nama}
                  </p>
                  <div className={`grid gap-1 text-sm ${highlightPanelMutedText}`}>
                    <span>NIS: {formatNumericId(selectedStudent.nis)}</span>
                    <span>Kelas: {selectedStudent.id_kelas.toUpperCase()}</span>
                    <span>
                      Angkatan: {formatNumericId(selectedStudent.angkatan)}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-3 text-sm font-medium ${highlightEmptyText}`}
                >
                  <Sparkles className="h-4 w-4" />
                  Pilih siswa untuk melihat detail singkat di sini.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                className={`block text-sm font-semibold ${labelTextClass}`}
              >
                Judul Prestasi
              </label>
              <input
                type="text"
                name="judul"
                value={formData.judul}
                onChange={handleInputChange}
                placeholder="Contoh: Juara 1 Lomba Matematika"
                className={inputBaseClass}
              />
            </div>
            <div>
              <label
                className={`block text-sm font-semibold ${labelTextClass}`}
              >
                Kategori
              </label>
              <input
                type="text"
                name="kategori"
                value={formData.kategori}
                onChange={handleInputChange}
                list="kategori-suggestions"
                placeholder="Pilih atau ketik kategori prestasi"
                className={inputBaseClass}
              />
              <datalist id="kategori-suggestions">
                {kategoriSuggestions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
            <div>
              <label
                className={`block text-sm font-semibold ${labelTextClass}`}
              >
                Tingkat Penghargaan
              </label>
              <select
                name="tingkat"
                value={formData.tingkat}
                onChange={handleInputChange}
                className={selectClass}
              >
                <option value="">Pilih tingkat penghargaan</option>
                {tingkatOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className={`block text-sm font-semibold ${labelTextClass}`}
              >
                Tanggal Prestasi
              </label>
              <div className="relative mt-2">
                <CalendarIcon
                  className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 ${controlIconClass}`}
                />
                <input
                  type="date"
                  name="tanggal_prestasi"
                  value={formData.tanggal_prestasi}
                  onChange={handleInputChange}
                  className={inputBaseClass}
                />
              </div>
            </div>
          </div>



          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                className={`block text-sm font-semibold ${labelTextClass}`}
              >
                Pemberi Penghargaan
              </label>
              <input
                type="text"
                name="pemberi_penghargaan"
                value={formData.pemberi_penghargaan}
                onChange={handleInputChange}
                placeholder="Contoh: Dinas Pendidikan Provinsi Kalbar"
                className={inputBaseClass}
              />
            </div>
            <div>
              <label
                className={`block text-sm font-semibold ${labelTextClass}`}
              >
                Bukti Foto / Scan (Opsional)
              </label>
              <input
                type="file"
                name="bukti"
                onChange={(event) => {
                  if (event.target.files && event.target.files[0])
                    setFormData((prev) => ({ ...prev, bukti: event.target.files[0] }));
                }}
                className={`${inputBaseClass} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-900/30 dark:file:text-emerald-400`}
                accept="image/*"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFormData(() => defaultFormState())}
              className="btn-secondary"
              disabled={submitting}
            >
              Reset
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Award className="h-4 w-4" />
                  Simpan Prestasi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AchievementReporting;
