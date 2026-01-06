// Modul manajemen siswa yang memfasilitasi import massal, pencarian, dan CRUD per siswa
import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
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
  ChevronDown,
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
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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
      return {
        label: "Lulus",
        tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100",
      };
    case "pindah":
      return {
        label: "Pindah",
        tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100",
      };
    case "dikeluarkan":
      return {
        label: "Dikeluarkan",
        tone: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-200",
      };
    default:
      return {
        label: "Aktif",
        tone: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-100",
      };
  }
};

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
    nis: "",
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
  const [allStudents, setAllStudents] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const bulkStatusButtonRef = useRef(null);
  const bulkStatusMenuRef = useRef(null);

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
      const response = await apiClient.get(`/siswa/`);
      const normalized = response.data.map(normalizeStudentRow);
      setStudents(normalized);
      setAllStudents(normalized);
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
      const response = await apiClient.get(`/master-data/kelas/`);
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
      await apiClient.post(`/siswa/`, payload);
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
      const response = await apiClient.post(`/siswa/upload-csv/`, formData, {
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
        toast.info(
          `${deactivated_count} siswa ditandai tidak aktif karena tidak ada di roster terbaru.`
        );
      }
      if (error_count > 0) {
        toast.warning(
          `${error_count} baris gagal diproses. Periksa log unggahan.`
        );
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
      nis: normalized.nis,
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
        nama: formatStudentName(editStudent.nama),
        id_kelas: formatClassCode(editStudent.id_kelas),
        angkatan: editStudent.angkatan
          ? String(editStudent.angkatan).trim()
          : "",
        jenis_kelamin: editStudent.jenis_kelamin,
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

  const activeStudentsAll = allStudents.filter(
    (student) => student.status_siswa === "aktif"
  );
  const archivedCount = allStudents.length - activeStudentsAll.length;

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
      allStudents
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
  const studentSearchOptions = useMemo(
    () =>
      allStudents.map((student) => {
        const name = student.nama || "";
        const kelas = student.id_kelas ? ` • ${student.id_kelas}` : "";
        return {
          label: `${formatNumericId(student.nis)} • ${name}${kelas}`,
          value: name || formatNumericId(student.nis),
        };
      }),
    [allStudents]
  );
  const filteredSearchSuggestions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (query.length < 2) return [];
    return studentSearchOptions
      .filter((option) => option.label.toLowerCase().includes(query))
      .slice(0, 6);
  }, [searchTerm, studentSearchOptions]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedCount > 0 && !allVisibleSelected;
    }
  }, [selectedCount, allVisibleSelected]);

  // Tutup dropdown status massal saat klik di luar atau ESC
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!bulkStatusOpen) return;
      if (bulkStatusMenuRef.current?.contains(event.target)) return;
      if (bulkStatusButtonRef.current?.contains(event.target)) return;
      setBulkStatusOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setBulkStatusOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [bulkStatusOpen]);

  // Atur posisi dropdown aksi massal dan tutup saat klik di luar

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

  // Mengubah status massal untuk siswa terpilih
  const handleBulkStatusChange = async (newStatus) => {
    if (selectedCount === 0) {
      toast.error("Pilih siswa terlebih dahulu");
      return;
    }
    const statusOption = STUDENT_STATUS_OPTIONS.find(
      (item) => item.value === newStatus
    );
    if (!statusOption) return;

    const ok = window.confirm(
      `Ubah status ${selectedCount} siswa menjadi "${statusOption.label}"?`
    );
    if (!ok) return;

    setActionLoading(true);
    const failed = [];

    try {
      for (const nis of selectedNis) {
        const student = allStudents.find((s) => s.nis === nis);
        if (!student) continue;

        const payload = {
          nama: formatStudentName(student.nama),
          id_kelas: formatClassCode(student.id_kelas),
          angkatan: student.angkatan ? String(student.angkatan).trim() : "",
          jenis_kelamin: student.jenis_kelamin || "L",
          status_siswa: newStatus,
          aktif: newStatus === "aktif",
        };

        try {
          await apiClient.put(`/siswa/${student.nis}`, payload);
        } catch (error) {
          console.error(`Gagal memperbarui status siswa ${nis}:`, error);
          failed.push(nis);
        }
      }

      if (failed.length === 0) {
        toast.success(`Status ${selectedCount} siswa berhasil diperbarui`);
      } else {
        toast.error(
          `Gagal mengubah status untuk ${failed.length} siswa: ${failed.join(
            ", "
          )}`
        );
      }

      setSelectedNis(new Set());
      await fetchStudents();
    } finally {
      setActionLoading(false);
      setBulkStatusOpen(false);
    }
  };

  const pageShellClasses =
    "min-h-screen space-y-8 sm:space-y-5 bg-rose-50/80 text-gray-900 dark:bg-slate-950 dark:text-slate-100 px-4 sm:px-6 lg:px-8 py-8 transition-colors";
  const cardClasses =
    "rounded-[8px] bg-white/95 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/70 dark:shadow-xl dark:shadow-black/40 dark:ring-1 dark:ring-slate-700/60";
  const inputClasses =
    "w-full rounded-full border border-gray-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-rose-400 dark:focus:ring-rose-500/30";
  const textareaClasses =
    "w-full rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-rose-400 dark:focus:ring-rose-500/30";
  const primaryButtonClasses =
    "inline-flex items-center justify-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1 focus:ring-offset-rose-50 hover:bg-rose-600 dark:focus:ring-offset-slate-950";
  const secondaryButtonClasses =
    "inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:ring-offset-rose-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800/60 dark:focus:ring-rose-500/40 dark:focus:ring-offset-slate-950";
  const iconButtonClasses =
    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-gray-700 shadow-sm ring-1 ring-black/5 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:ring-offset-rose-50 dark:bg-slate-900/70 dark:text-slate-100 dark:ring-slate-800/70 dark:hover:bg-slate-800 dark:focus:ring-rose-500/40 dark:focus:ring-offset-slate-950";

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
            Pembinaan siswa
          </div> */}
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Data Siswa
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Kelola data siswa sekolah
          </p>
        </div>

        {user?.role === "admin" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className={secondaryButtonClasses}
            >
              <Upload className="h-4 w-4" />
              Upload Data Siswa
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className={primaryButtonClasses}
            >
              <Plus className="h-4 w-4" />
              Tambah Siswa
            </button>
          </div>
        )}
      </div>

      <div className={`${cardClasses} p-6 sm:p-5 overflow-visible`}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
              Ringkasan Siswa
            </p>
            {/* <p className="text-[11px] text-gray-600 dark:text-slate-400">Total dan distribusi cepat</p> */}
          </div>
          <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm dark:bg-rose-500/15 dark:text-rose-200">
            {allStudents.length} siswa
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            {
              label: "Aktif",
              value: activeStudentsAll.length,
              icon: Users,
              tone: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-100",
            },
            {
              label: "Laki-laki",
              value: activeStudentsAll.filter((s) => s.jenis_kelamin === "L")
                .length,
              icon: Users,
              tone: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-100",
            },
            {
              label: "Perempuan",
              value: activeStudentsAll.filter((s) => s.jenis_kelamin === "P")
                .length,
              icon: Users,
              tone: "bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-100",
            },
            {
              label: "Arsip",
              value: archivedCount,
              icon: Users,
              tone: "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200",
            },
          ].map(({ label, value, icon: IconComponent, tone }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-[10px] border border-gray-100/80 bg-white/70 px-3 py-2 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-inner dark:bg-rose-500/15 dark:text-rose-200">
                <IconComponent className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                  {label}
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-slate-100">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`${cardClasses} relative z-50 overflow-visible`}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Cari berdasarkan NIS, nama, atau kelas..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleSearch(e.target.value);
                }}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
                className={`${inputClasses} pl-12`}
              />
              {isSearchFocused && filteredSearchSuggestions.length > 0 && (
                <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-[8px] border border-rose-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                  {filteredSearchSuggestions.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-2 text-sm text-gray-700 transition hover:bg-rose-50 dark:text-slate-100 dark:hover:bg-slate-800"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setSearchTerm(option.value);
                        handleSearch(option.value);
                        setIsSearchFocused(false);
                      }}
                    >
                      <span className="truncate">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFiltersVisible((prev) => !prev)}
              className={secondaryButtonClasses}
            >
              <Filter className="h-4 w-4" />
              {filtersVisible ? "Sembunyikan Filter" : "Filter"}
            </button>
            {user?.role === "admin" && selectedCount > 0 && (
              <label
                className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm dark:border-slate-700 dark:text-slate-100"
                title="Pilih semua siswa yang tampil"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-rose-500"
                  checked={allVisibleSelected && selectedCount > 0}
                  onChange={toggleSelectAll}
                />
                <span>Semua</span>
              </label>
            )}
            {user?.role === "admin" && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className={`${secondaryButtonClasses} text-red-600 hover:text-red-700`}
                disabled={actionLoading || selectedCount === 0}
              >
                Hapus Terpilih {selectedCount > 0 ? `(${selectedCount})` : ""}
              </button>
            )}
            {user?.role === "admin" && selectedCount > 1 && (
              <div className="relative">
                <button
                  type="button"
                  ref={bulkStatusButtonRef}
                  onClick={() => setBulkStatusOpen((prev) => !prev)}
                  className={`${secondaryButtonClasses} pr-10`}
                  disabled={actionLoading}
                >
                  Ubah Status
                  <ChevronDown className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                </button>
                {bulkStatusOpen && (
                  <div
                    ref={bulkStatusMenuRef}
                    className="absolute right-0 z-[120] mt-2 w-64 overflow-hidden rounded-md border border-gray-200 bg-white text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
                  >
                    {STUDENT_STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className="flex w-full items-center justify-between px-4 py-2 text-left font-medium text-gray-800 transition hover:bg-gray-50 dark:text-slate-100 dark:hover:bg-slate-800"
                        onClick={() => handleBulkStatusChange(option.value)}
                        disabled={actionLoading}
                      >
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {filtersVisible && (
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="relative">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                  Filter Kelas
                </label>
                <div className="relative">
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className={`${inputClasses} w-full appearance-none pr-12`}
                  >
                    <option value="">Semua Kelas</option>
                    {availableClassNames.map((namaKelas) => (
                      <option key={namaKelas} value={namaKelas}>
                        {namaKelas}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                </div>
              </div>
              <div className="relative">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                  Filter Angkatan
                </label>
                <div className="relative">
                  <select
                    value={angkatanFilter}
                    onChange={(e) => setAngkatanFilter(e.target.value)}
                    className={`${inputClasses} w-full appearance-none pr-12`}
                  >
                    <option value="">Semua Angkatan</option>
                    {angkatanOptions.map((angkatan) => (
                      <option key={angkatan} value={angkatan}>
                        {angkatan}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                </div>
              </div>
              <div className="relative">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                  Filter Status
                </label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`${inputClasses} w-full appearance-none pr-12`}
                  >
                    <option value="all">Semua Status</option>
                    {STUDENT_STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`${cardClasses} !p-0 sm:!p-8 overflow-hidden`}>
        <div className="overflow-x-auto">
          <div className="max-h-[520px] overflow-y-auto">
            <table className="min-w-full table-auto text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-100 bg-[#C82020] text-xs font-semibold uppercase tracking-[0.2em] text-white dark:border-slate-800 dark:bg-[#a11818] dark:text-white">
                  {user?.role === "admin" && (
                    <th className="px-4 py-3 text-left rounded-tl-[8px]">
                      Pilih
                    </th>
                  )}
                  <th
                    className={`px-4 py-3 text-left ${user?.role !== "admin" ? "rounded-tl-[8px]" : ""
                      }`}
                  >
                    NIS
                  </th>
                  <th className="px-4 py-3 text-left">Nama</th>
                  <th className="px-4 py-3 text-left">Kelas</th>
                  <th className="px-4 py-3 text-left">Angkatan</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Jenis Kelamin</th>
                  <th className="px-4 py-3 text-left rounded-tr-[8px]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const statusMeta = getStatusMeta(student.status_siswa);
                  return (
                    <tr
                      key={student.nis}
                      className="border-b border-gray-100/80 transition hover:bg-rose-50 dark:border-slate-800/60 dark:hover:bg-slate-800"
                    >
                      {user?.role === "admin" && (
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            ref={allVisibleSelected ? selectAllRef : null}
                            checked={selectedNis.has(student.nis)}
                            onChange={() => toggleSelectStudent(student.nis)}
                            disabled={actionLoading}
                            className="h-4 w-4 accent-rose-500"
                          />
                        </td>
                      )}
                      <td className="px-4 py-4 font-semibold text-gray-900 dark:text-slate-100">
                        {formatNumericId(student.nis)}
                      </td>
                      <td className="px-4 py-4 text-gray-900 dark:text-slate-100">
                        {student.nama}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-100">
                          {student.id_kelas}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-900 dark:text-slate-100">
                        {formatNumericId(student.angkatan)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${student.jenis_kelamin === "L"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-100"
                            : "bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-100"
                            }`}
                        >
                          {student.jenis_kelamin === "L"
                            ? "Laki-laki"
                            : "Perempuan"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDetailModal(student)}
                            className={iconButtonClasses}
                            title="Lihat detail siswa"
                          >
                            <Eye className="h-4 w-4 text-gray-700 dark:text-slate-200" />
                          </button>
                          {user?.role === "admin" && (
                            <>
                              <button
                                onClick={() => openEditModal(student)}
                                className={iconButtonClasses}
                                title="Edit data siswa"
                              >
                                <Edit className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(student)}
                                className={iconButtonClasses}
                                title="Hapus data siswa"
                                disabled={actionLoading}
                              >
                                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-300" />
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
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-3xl rounded-[12px] bg-white/95 p-8 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/80 dark:ring-1 dark:ring-slate-700/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                Tambah Siswa
              </p>
              <h2 className="text-2xl font-semibold leading-tight">
                Tambah Siswa Baru
              </h2>
            </div>
            <form onSubmit={handleAddStudent} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    NIS
                  </span>
                  <input
                    type="text"
                    value={newStudent.nis}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, nis: e.target.value })
                    }
                    className={inputClasses}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Nama Lengkap
                  </span>
                  <input
                    type="text"
                    value={newStudent.nama}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        nama: formatStudentNameInput(e.target.value),
                      })
                    }
                    className={inputClasses}
                    required
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Kelas
                  </span>
                  <select
                    value={newStudent.id_kelas}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        id_kelas: formatClassCodeInput(e.target.value),
                      })
                    }
                    className={inputClasses}
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
                    <p className="mt-2 text-xs text-red-600">
                      Tambahkan data kelas terlebih dahulu di menu Master Data.
                    </p>
                  )}
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Angkatan
                  </span>
                  <input
                    type="text"
                    value={newStudent.angkatan}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, angkatan: e.target.value })
                    }
                    className={inputClasses}
                    placeholder="contoh: 2024"
                    required
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Jenis Kelamin
                  </span>
                  <select
                    value={newStudent.jenis_kelamin}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        jenis_kelamin: e.target.value,
                      })
                    }
                    className={inputClasses}
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Status Siswa
                  </span>
                  <select
                    value={newStudent.status_siswa}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        status_siswa: e.target.value,
                      })
                    }
                    className={inputClasses}
                  >
                    {STUDENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Status Nonaktif otomatis menonaktifkan akses proses bisnis.
                  </p>
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={secondaryButtonClasses}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={primaryButtonClasses}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="w-full max-w-3xl rounded-[12px] bg-white/95 p-8 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/80 dark:ring-1 dark:ring-slate-700/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                Upload Data Siswa
              </p>
              <h2 className="text-2xl font-semibold leading-tight">
                Upload Data Siswa (CSV/Excel)
              </h2>
            </div>

            <div className="mb-6">
              <div className="rounded-[10px] border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
                <h3 className="mb-2 font-medium text-blue-900 dark:text-blue-100">
                  Format File CSV/Excel:
                </h3>
                <p className="mb-2 text-sm text-blue-700 dark:text-blue-200">
                  File harus memiliki kolom berikut:
                </p>
                <code className="block rounded bg-blue-100 p-2 text-xs text-blue-900 dark:bg-blue-500/20 dark:text-blue-100">
                  nis,nama,id_kelas,angkatan,jeniskelamin[,aktif][,status_siswa][,tahun_ajaran]
                </code>
                <p className="mt-2 text-xs text-blue-700 dark:text-blue-200">
                  Kolom <span className="font-semibold">aktif</span>,{" "}
                  <span className="font-semibold">status_siswa</span>, dan{" "}
                  <span className="font-semibold">tahun_ajaran</span> bersifat
                  opsional. Jika status tidak diisi, sistem akan menganggap
                  siswa masih aktif.
                </p>
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-200">
                  Contoh: 20240001,Budi Setiawan,10A,2024,L,true,aktif,2024-2025
                </p>
              </div>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Pilih File
                </span>
                <div className="rounded-[12px] border-2 border-dashed border-gray-300 p-6 text-center dark:border-slate-700">
                  <FileSpreadsheet className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-slate-500" />
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-sm font-semibold text-blue-600 underline-offset-4 hover:underline dark:text-blue-200"
                  >
                    Klik untuk memilih file
                  </label>
                  <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                    Format yang didukung: CSV, Excel (.xlsx, .xls)
                  </p>
                  {uploadFile && (
                    <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-200">
                      File dipilih: {uploadFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className={secondaryButtonClasses}
                  disabled={uploadLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`${primaryButtonClasses} inline-flex items-center gap-2`}
                  disabled={uploadLoading}
                >
                  {uploadLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Mengupload...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
          onClick={() => setShowUploadErrors(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[12px] bg-white/95 p-8 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/80 dark:ring-1 dark:ring-slate-700/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                Detail Error Upload
              </h2>
              <button
                type="button"
                className={iconButtonClasses}
                onClick={() => setShowUploadErrors(false)}
              >
                ✕
              </button>
            </div>
            <p className="mb-3 text-sm text-gray-600 dark:text-slate-400">
              Hanya admin yang dapat melihat ringkasan ini. Gunakan informasi di
              bawah untuk memperbaiki file sebelum mengunggah ulang.
            </p>
            <div className="max-h-72 overflow-y-auto">
              <ol className="list-inside list-decimal space-y-2 text-sm text-red-600 dark:text-red-300">
                {uploadErrors.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 dark:border-red-500/30 dark:bg-red-500/10"
                  >
                    {item}
                  </li>
                ))}
              </ol>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className={primaryButtonClasses}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
          onClick={() => {
            setShowDetailModal(false);
            setSelectedStudent(null);
          }}
        >
          <div
            className="w-full max-w-xl rounded-[12px] bg-white/95 p-8 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/80 dark:ring-1 dark:ring-slate-700/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
                Detail Siswa
              </h2>
            </div>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                    NIS
                  </p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-slate-100">
                    {formatNumericId(selectedStudent.nis)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                    Nama Lengkap
                  </p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-slate-100">
                    {selectedStudent.nama}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                    Kelas
                  </p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-slate-100">
                    {selectedStudent.id_kelas}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                    Angkatan
                  </p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-slate-100">
                    {formatNumericId(selectedStudent.angkatan)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                    Jenis Kelamin
                  </p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-slate-100">
                    {selectedStudent.jenis_kelamin === "L"
                      ? "Laki-laki"
                      : "Perempuan"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                    Status
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {selectedStatusMeta && (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${selectedStatusMeta.tone}`}
                      >
                        {selectedStatusMeta.label}
                      </span>
                    )}
                    {selectedStudent.status_siswa !== "aktif" && (
                      <span className="text-xs text-amber-600 dark:text-amber-300">
                        Arsip/nonaktif
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedStudent(null);
                }}
                className={primaryButtonClasses}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
          onClick={() => {
            setShowEditModal(false);
            setSelectedStudent(null);
          }}
        >
          <div
            className="w-full max-w-3xl rounded-[12px] bg-white/95 p-8 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/80 dark:ring-1 dark:ring-slate-700/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                Edit Data Siswa
              </p>
              <h2 className="text-2xl font-semibold leading-tight">
                Edit Data Siswa
              </h2>
            </div>
            <form onSubmit={handleEditStudent} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    NIS
                  </span>
                  <input
                    type="text"
                    value={formatNumericId(editStudent.nis)}
                    readOnly
                    disabled
                    className={`${inputClasses} cursor-not-allowed bg-gray-100 dark:bg-slate-800/50`}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Nama Lengkap
                  </span>
                  <input
                    type="text"
                    value={editStudent.nama}
                    onChange={(e) =>
                      setEditStudent({
                        ...editStudent,
                        nama: formatStudentNameInput(e.target.value),
                      })
                    }
                    className={inputClasses}
                    required
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Kelas
                  </span>
                  <select
                    value={editStudent.id_kelas}
                    onChange={(e) =>
                      setEditStudent({
                        ...editStudent,
                        id_kelas: formatClassCodeInput(e.target.value),
                      })
                    }
                    className={inputClasses}
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
                    <p className="mt-2 text-xs text-red-600">
                      Tambahkan data kelas terlebih dahulu di menu Master Data.
                    </p>
                  )}
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Angkatan
                  </span>
                  <input
                    type="text"
                    value={editStudent.angkatan}
                    onChange={(e) =>
                      setEditStudent({
                        ...editStudent,
                        angkatan: e.target.value,
                      })
                    }
                    className={inputClasses}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Jenis Kelamin
                  </span>
                  <select
                    value={editStudent.jenis_kelamin}
                    onChange={(e) =>
                      setEditStudent({
                        ...editStudent,
                        jenis_kelamin: e.target.value,
                      })
                    }
                    className={inputClasses}
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Status Siswa
                  </span>
                  <select
                    value={editStudent.status_siswa}
                    onChange={(e) =>
                      setEditStudent({
                        ...editStudent,
                        status_siswa: e.target.value,
                      })
                    }
                    className={inputClasses}
                  >
                    {STUDENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Status nonaktif akan mengarsipkan siswa dari proses bisnis.
                  </p>
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedStudent(null);
                  }}
                  className={secondaryButtonClasses}
                  disabled={actionLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={primaryButtonClasses}
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
