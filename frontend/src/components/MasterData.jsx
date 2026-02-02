// Dashboard pengelolaan data master (kelas, pelanggaran, dan tahun ajaran)
import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import { apiClient } from "../services/api";
import { toast } from "sonner";
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  AlertTriangle,
  Calendar,
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";

// Use configured API client with auth header

// Pusat administrasi untuk referensi dasar yang digunakan modul lain
const MasterData = () => {
  const { user } = useContext(AuthContext);

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
  const [activeTab, setActiveTab] = useState("kelas");
  const [kelas, setKelas] = useState([]);
  const [violationTypes, setViolationTypes] = useState([]);
  const [tahunAjaran, setTahunAjaran] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isAddingYear, setIsAddingYear] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form states
  const [waliOptions, setWaliOptions] = useState([]);
  const [guruBKOptions, setGuruBKOptions] = useState([]);
  const [newKelas, setNewKelas] = useState({
    nama_kelas: "",
    tingkat: "",
    wali_kelas_nip: "",
    guru_bk_nip: "",
  });
  const [editKelas, setEditKelas] = useState({
    nama_kelas: "",
    tingkat: "",
    wali_kelas_nip: "",
    guru_bk_nip: "",
  });

  const [newViolationType, setNewViolationType] = useState({
    nama_pelanggaran: "",
    kategori: "Ringan",
    deskripsi: "",
  });
  const [editViolationType, setEditViolationType] = useState({
    nama_pelanggaran: "",
    kategori: "Ringan",
    deskripsi: "",
  });

  const [newTahunAjaran, setNewTahunAjaran] = useState({
    tahun: "",
    semester: "1",
    is_active: false,
  });
  const [editTahunAjaran, setEditTahunAjaran] = useState({
    tahun: "",
    semester: "1",
    is_active: false,
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

  const getSortedData = (dataList) => {
    if (!sortConfig.key) return dataList;
    const sorted = [...dataList].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = (bValue || "").toString().toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  };


  const tabs = [
    { id: "kelas", label: "Kelas", icon: BookOpen },
    { id: "violations", label: "Jenis Pelanggaran", icon: AlertTriangle },
  ];

  const formatAcademicOption = (item) =>
    `${(item.tahun || "").trim()} - Semester ${item.semester}`;

  const academicOptions = tahunAjaran.map((item) => ({
    value: formatAcademicOption(item),
    label: `${item.tahun} (Semester ${item.semester})${item.is_active ? " - Aktif" : ""
      }`,
  }));

  const formatClassName = (value) => {
    if (value === null || value === undefined) return "";
    const trimmed = String(value).trim();
    if (!trimmed || trimmed.toLowerCase() === "nan") {
      return "";
    }
    return trimmed.toUpperCase();
  };

  const formatClassInputValue = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    const hasTrailingSpace = /\s$/.test(str);
    const cleaned = str.replace(/\s+/g, " ").toUpperCase();
    const trimmed = cleaned.trimStart();
    return hasTrailingSpace ? trimmed + " " : trimmed;
  };

  useEffect(() => {
    if (user?.role === "admin") {
      fetchAllData();
    }
  }, [user]);

  // Memuat seluruh dataset master secara paralel agar UI siap digunakan
  const fetchAllData = async () => {
    try {
      const [kelasRes, violationsRes, tahunRes, usersRes] = await Promise.all([
        apiClient.get(`/master-data/kelas/`).catch(e => { console.error("Error Kelas:", e); throw e; }),
        apiClient.get(`/master-data/jenis-pelanggaran/`).catch(e => { console.error("Error Violations:", e); throw e; }),
        apiClient.get(`/master-data/tahun-ajaran/`).catch(e => { console.error("Error Tahun:", e); throw e; }),
        apiClient.get(`/users/`).catch(e => { console.error("Error Users:", e); throw e; }),
      ]);

      const sanitizedKelas = kelasRes.data.map((item) => ({
        ...item,
        nama_kelas: formatClassName(item.nama_kelas),
      }));
      setKelas(sanitizedKelas);
      setViolationTypes(violationsRes.data);
      setTahunAjaran(tahunRes.data);

      const allUsers = usersRes.data || [];

      // Filter Wali Kelas
      const waliList = allUsers
        .filter((u) => u.role === "wali_kelas" && u.is_active)
        .map((u) => ({ nip: u.nip, name: u.full_name }));

      // Filter Guru BK
      const bkList = allUsers
        .filter((u) => u.role === "guru_bk" && u.is_active)
        .map((u) => ({ nip: u.nip, name: u.full_name }));

      // Add existing assigned NIPs to lists if missing
      const existingWaliNips = new Set(waliList.map((w) => w.nip));
      const existingBKNips = new Set(bkList.map((b) => b.nip));

      sanitizedKelas.forEach((k) => {
        if (k.wali_kelas_nip && !existingWaliNips.has(k.wali_kelas_nip)) {
          waliList.push({
            nip: k.wali_kelas_nip,
            name: k.wali_kelas_name || k.wali_kelas_nip,
          });
          existingWaliNips.add(k.wali_kelas_nip);
        }
        if (k.guru_bk_nip && !existingBKNips.has(k.guru_bk_nip)) {
          bkList.push({
            nip: k.guru_bk_nip,
            name: k.guru_bk_name || k.guru_bk_nip,
          });
          existingBKNips.add(k.guru_bk_nip);
        }
      });

      waliList.sort((a, b) => a.name.localeCompare(b.name));
      bkList.sort((a, b) => a.name.localeCompare(b.name));

      setWaliOptions(waliList);
      setGuruBKOptions(bkList);
    } catch (error) {
      console.error("Failed to fetch master data:", error);
      toast.error("Gagal memuat data master");
    }
    setLoading(false);
  };

  // Menambah kelas baru ke master data setelah validasi dasar
  const handleAddKelas = async (e) => {
    e.preventDefault();
    try {
      const formattedName = formatClassName(newKelas.nama_kelas);

      // Validation: Check for duplicate class name
      const isDuplicate = kelas.some((k) => k.nama_kelas === formattedName);
      if (isDuplicate) {
        toast.error(`Kelas "${formattedName}" sudah ada! Mohon gunakan nama lain.`);
        return;
      }

      const payload = {
        ...newKelas,
        nama_kelas: formattedName,
        wali_kelas_nip: newKelas.wali_kelas_nip || null,
        tahun_ajaran: "AUTO", // Backend handles this
      };
      await apiClient.post(`/master-data/kelas`, payload);
      toast.success("Kelas berhasil ditambahkan");
      setShowAddModal(false);
      setNewKelas({
        nama_kelas: "",
        tingkat: "",
        wali_kelas_nip: "",
        guru_bk_nip: "",
      });
      fetchAllData();
    } catch (error) {
      console.error("Failed to add kelas:", error);
      const detail = error?.response?.data?.detail;
      toast.error(detail || "Gagal menambahkan kelas");
    }
  };

  // Menyimpan jenis pelanggaran baru lengkap dengan kategori dan deskripsi (poin telah dihapus)
  const handleAddViolationType = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/master-data/jenis-pelanggaran`, newViolationType);
      toast.success("Jenis pelanggaran berhasil ditambahkan");
      setShowAddModal(false);
      setNewViolationType({
        nama_pelanggaran: "",
        kategori: "Ringan",
        deskripsi: "",
      });
      fetchAllData();
    } catch (error) {
      console.error("Failed to add violation type:", error);
      toast.error("Gagal menambahkan jenis pelanggaran");
    }
  };

  // Menambahkan entri tahun ajaran baru dan opsi semester aktif
  const handleAddTahunAjaran = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/master-data/tahun-ajaran`, newTahunAjaran);
      toast.success("Tahun ajaran berhasil ditambahkan");
      setShowAddModal(false);
      setIsAddingYear(false); // Close the year form specifically
      setNewTahunAjaran({ tahun: "", semester: "1", is_active: false });
      fetchAllData();
    } catch (error) {
      console.error("Failed to add tahun ajaran:", error);
      const detail = error?.response?.data?.detail;
      toast.error(detail || "Gagal menambahkan tahun ajaran");
    }
  };

  // Mengatur state item yang akan diedit kemudian menampilkan modal edit
  const openEditModal = (item) => {
    setSelectedItem(item);

    // Check for specific item types first, before falling back to activeTab
    if (item && item.tahun) {
      // Logic for editing the global academic year
      setEditTahunAjaran({
        tahun: item.tahun,
        semester: item.semester,
        is_active: item.is_active,
      });
    } else if (activeTab === "kelas") {
      setEditKelas({
        nama_kelas: formatClassName(item.nama_kelas),
        tingkat: item.tingkat,
        wali_kelas_nip: item.wali_kelas_nip || "",
        guru_bk_nip: item.guru_bk_nip || "",
      });
    } else if (activeTab === "violations") {
      setEditViolationType({
        nama_pelanggaran: item.nama_pelanggaran,
        kategori: item.kategori,
        deskripsi: item.deskripsi || "",
      });
    }
    setShowEditModal(true);
  };

  // Menyimpan perubahan dari modal edit berdasarkan tab aktif
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      if (selectedItem?.tahun) {
        // Special case for submitting global academic year update (Prioritized)
        await apiClient.put(
          `/master-data/tahun-ajaran/${selectedItem.id}`,
          { ...editTahunAjaran, is_active: true } // Ensure it stays active
        );
        toast.success("Tahun ajaran berhasil diperbarui, seluruh kelas telah disesuaikan.");
      } else if (activeTab === "kelas") {
        const payload = {
          ...editKelas,
          nama_kelas: formatClassName(editKelas.nama_kelas),
          wali_kelas_nip: editKelas.wali_kelas_nip || null,
          guru_bk_nip: editKelas.guru_bk_nip || null,
        };
        await apiClient.put(`/master-data/kelas/${selectedItem.id}`, payload);
        toast.success("Kelas berhasil diperbarui");
      } else if (activeTab === "violations") {
        await apiClient.put(
          `/master-data/jenis-pelanggaran/${selectedItem.id}`,
          {
            ...editViolationType,
          }
        );
        toast.success("Jenis pelanggaran berhasil diperbarui");
      }
      setShowEditModal(false);
      setSelectedItem(null);
      fetchAllData();
    } catch (error) {
      console.error("Failed to update master data:", error);
      const msg = error?.response?.data?.detail || "Gagal memperbarui data";
      toast.error(msg);
    }
  };

  // Menghapus entri master data dengan konfirmasi terlebih dahulu
  const handleDeleteItem = async (item) => {
    const ok = window.confirm("Hapus data ini?");
    if (!ok) return;

    try {
      if (activeTab === "kelas") {
        await apiClient.delete(`/master-data/kelas/${item.id}`);
        toast.success("Kelas berhasil dihapus");
      } else if (activeTab === "violations") {
        await apiClient.delete(`/master-data/jenis-pelanggaran/${item.id}`);
        toast.success("Jenis pelanggaran berhasil dihapus");
      } else if (activeTab === "tahun") {
        await apiClient.delete(`/master-data/tahun-ajaran/${item.id}`);
        toast.success("Tahun ajaran berhasil dihapus");
      }
      fetchAllData();
    } catch (error) {
      console.error("Failed to delete master data:", error);
      const msg = error?.response?.data?.detail || "Gagal menghapus data";
      toast.error(msg);
    }
  };

  const currentAcademicYear = tahunAjaran.length > 0 ? tahunAjaran[0] : null;

  const getAddForm = () => {
    if (isAddingYear) {
      return (
        <form onSubmit={handleAddTahunAjaran} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                Tahun Ajaran
              </span>
              <input
                type="text"
                value={newTahunAjaran.tahun}
                onChange={(e) =>
                  setNewTahunAjaran({
                    ...newTahunAjaran,
                    tahun: e.target.value,
                  })
                }
                className={inputClasses}
                placeholder="contoh: 2024/2025"
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                Semester
              </span>
              <select
                value={newTahunAjaran.semester}
                onChange={(e) =>
                  setNewTahunAjaran({
                    ...newTahunAjaran,
                    semester: e.target.value,
                  })
                }
                className={inputClasses}
                required
              >
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900/50">
              <input
                type="checkbox"
                checked={newTahunAjaran.is_active}
                onChange={(e) =>
                  setNewTahunAjaran({
                    ...newTahunAjaran,
                    is_active: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                Set sebagai tahun ajaran aktif saat ini
              </span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowAddModal(false); setIsAddingYear(false); }}
              className={secondaryButtonClasses}
            >
              Batal
            </button>
            <button type="submit" className={primaryButtonClasses}>
              Tambah Tahun Ajaran
            </button>
          </div>
        </form>
      );
    }

    switch (activeTab) {
      case "kelas":
        const assignedWaliNipsAdd = new Set(
          kelas.map((k) => k.wali_kelas_nip).filter((nip) => nip)
        );
        const availableWaliOptionsAdd = waliOptions.filter(
          (w) => !assignedWaliNipsAdd.has(w.nip)
        );

        return (
          <form onSubmit={handleAddKelas} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Nama Kelas
                </span>
                <input
                  type="text"
                  value={newKelas.nama_kelas}
                  onChange={(e) =>
                    setNewKelas({
                      ...newKelas,
                      nama_kelas: formatClassInputValue(e.target.value),
                    })
                  }
                  className={inputClasses}
                  placeholder="contoh: 12 MIPA 1"
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Tingkat
                </span>
                <select
                  value={newKelas.tingkat}
                  onChange={(e) =>
                    setNewKelas({ ...newKelas, tingkat: e.target.value })
                  }
                  className={inputClasses}
                  required
                >
                  <option value="">Pilih tingkat</option>
                  <option value="10">Kelas 10</option>
                  <option value="11">Kelas 11</option>
                  <option value="12">Kelas 12</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Wali Kelas (Opsional)
                </span>
                <select
                  value={newKelas.wali_kelas_nip}
                  onChange={(e) =>
                    setNewKelas({ ...newKelas, wali_kelas_nip: e.target.value })
                  }
                  className={inputClasses}
                >
                  <option value="">Belum ditetapkan</option>
                  {availableWaliOptionsAdd.map((wali) => (
                    <option key={wali.nip} value={wali.nip}>
                      {wali.nip} - {wali.name}
                    </option>
                  ))}
                </select>
                {waliOptions.length === 0 ? (
                  <p className="text-xs text-red-500 mt-1">
                    *Tambahkan akun Wali Kelas terlebih dahulu di menu Manajemen Pengguna.
                  </p>
                ) : availableWaliOptionsAdd.length === 0 ? (
                  <p className="text-xs text-amber-500 mt-1">
                    *Semua wali kelas sudah memiliki kelas.
                  </p>
                ) : null}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Guru BK (Opsional)
                </span>
                <select
                  value={newKelas.guru_bk_nip}
                  onChange={(e) =>
                    setNewKelas({ ...newKelas, guru_bk_nip: e.target.value })
                  }
                  className={inputClasses}
                >
                  <option value="">Belum ditetapkan</option>
                  {guruBKOptions.map((bk) => (
                    <option key={bk.nip} value={bk.nip}>
                      {bk.nip} - {bk.name}
                    </option>
                  ))}
                </select>
                {guruBKOptions.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1">
                    *Tambahkan akun Guru BK di menu Manajemen Pengguna.
                  </p>
                )}
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className={secondaryButtonClasses}
              >
                Batal
              </button>
              <button type="submit" className={primaryButtonClasses}>
                Tambah Kelas
              </button>
            </div>
          </form>
        );

      case "violations":
        return (
          <form onSubmit={handleAddViolationType} className="space-y-6">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                Nama Pelanggaran
              </span>
              <input
                type="text"
                value={newViolationType.nama_pelanggaran}
                onChange={(e) =>
                  setNewViolationType({
                    ...newViolationType,
                    nama_pelanggaran: e.target.value,
                  })
                }
                className={inputClasses}
                placeholder="contoh: Terlambat datang ke sekolah"
                required
              />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Kategori
                </span>
                <select
                  value={newViolationType.kategori}
                  onChange={(e) =>
                    setNewViolationType({
                      ...newViolationType,
                      kategori: e.target.value,
                    })
                  }
                  className={inputClasses}
                  required
                >
                  <option value="Ringan">Ringan</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Berat">Berat</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                Deskripsi (Opsional)
              </span>
              <textarea
                value={newViolationType.deskripsi}
                onChange={(e) =>
                  setNewViolationType({
                    ...newViolationType,
                    deskripsi: e.target.value,
                  })
                }
                className={`${inputClasses} min-h-[100px] rounded-2xl py-3`}
                placeholder="Deskripsi detail pelanggaran..."
              />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className={secondaryButtonClasses}
              >
                Batal
              </button>
              <button type="submit" className={primaryButtonClasses}>
                Tambah Jenis Pelanggaran
              </button>
            </div>
          </form>
        );

      case "tahun":
        return (
          <form onSubmit={handleAddTahunAjaran} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Tahun Ajaran
                </span>
                <input
                  type="text"
                  value={newTahunAjaran.tahun}
                  onChange={(e) =>
                    setNewTahunAjaran({
                      ...newTahunAjaran,
                      tahun: e.target.value,
                    })
                  }
                  className={inputClasses}
                  placeholder="contoh: 2024/2025"
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Semester
                </span>
                <select
                  value={newTahunAjaran.semester}
                  onChange={(e) =>
                    setNewTahunAjaran({
                      ...newTahunAjaran,
                      semester: e.target.value,
                    })
                  }
                  className={inputClasses}
                  required
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
              </label>
            </div>
            {/* is_active checkbox removed as per single year request logic, assuming new year replaces current */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className={secondaryButtonClasses}
              >
                Batal
              </button>
              <button type="submit" className={primaryButtonClasses}>
                Tambah Tahun Ajaran
              </button>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  const getEditForm = () => {
    // Prioritize Academic Year Edit Form
    if (selectedItem && selectedItem.tahun) {
      return (
        <form onSubmit={handleEditSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                Tahun Ajaran
              </span>
              <input
                type="text"
                value={editTahunAjaran.tahun}
                onChange={(e) =>
                  setEditTahunAjaran({
                    ...editTahunAjaran,
                    tahun: e.target.value,
                  })
                }
                className={inputClasses}
                placeholder="contoh: 2024/2025"
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                Semester
              </span>
              <select
                value={editTahunAjaran.semester}
                onChange={(e) =>
                  setEditTahunAjaran({
                    ...editTahunAjaran,
                    semester: e.target.value,
                  })
                }
                className={inputClasses}
              >
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className={secondaryButtonClasses}
            >
              Batal
            </button>
            <button type="submit" className={primaryButtonClasses}>
              Simpan Perubahan
            </button>
          </div>
        </form>
      );
    }

    switch (activeTab) {
      case "kelas":
        const currentWaliNip = selectedItem?.wali_kelas_nip;
        const assignedWaliNipsEdit = new Set(
          kelas
            .map((k) => k.wali_kelas_nip)
            .filter((nip) => nip && nip !== currentWaliNip)
        );
        const availableWaliOptionsEdit = waliOptions.filter(
          (w) => !assignedWaliNipsEdit.has(w.nip)
        );

        return (
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Nama Kelas
                </span>
                <input
                  type="text"
                  value={editKelas.nama_kelas}
                  onChange={(e) =>
                    setEditKelas({
                      ...editKelas,
                      nama_kelas: formatClassInputValue(e.target.value),
                    })
                  }
                  className={inputClasses}
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Tingkat
                </span>
                <select
                  value={editKelas.tingkat}
                  onChange={(e) =>
                    setEditKelas({ ...editKelas, tingkat: e.target.value })
                  }
                  className={inputClasses}
                  required
                >
                  <option value="">Pilih tingkat</option>
                  <option value="10">Kelas 10</option>
                  <option value="11">Kelas 11</option>
                  <option value="12">Kelas 12</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Wali Kelas (Opsional)
                </span>
                <select
                  value={editKelas.wali_kelas_nip}
                  onChange={(e) =>
                    setEditKelas({
                      ...editKelas,
                      wali_kelas_nip: e.target.value,
                    })
                  }
                  className={inputClasses}
                >
                  <option value="">Belum ditetapkan</option>
                  {availableWaliOptionsEdit.map((wali) => (
                    <option key={wali.nip} value={wali.nip}>
                      {wali.nip} - {wali.name}
                    </option>
                  ))}
                </select>
                {waliOptions.length > 0 && availableWaliOptionsEdit.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1">
                    *Tidak ada wali kelas lain yang tersedia.
                  </p>
                )}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Guru BK (Opsional)
                </span>
                <select
                  value={editKelas.guru_bk_nip}
                  onChange={(e) =>
                    setEditKelas({
                      ...editKelas,
                      guru_bk_nip: e.target.value,
                    })
                  }
                  className={inputClasses}
                >
                  <option value="">Belum ditetapkan</option>
                  {guruBKOptions.map((bk) => (
                    <option key={bk.nip} value={bk.nip}>
                      {bk.nip} - {bk.name}
                    </option>
                  ))}
                </select>
                {guruBKOptions.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1">
                    *Daftar Guru BK tidak ditemukan.
                  </p>
                )}
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className={secondaryButtonClasses}
              >
                Batal
              </button>
              <button type="submit" className={primaryButtonClasses}>
                Simpan Perubahan
              </button>
            </div>
          </form>
        );

      case "violations":
        return (
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                Nama Pelanggaran
              </span>
              <input
                type="text"
                value={editViolationType.nama_pelanggaran}
                onChange={(e) =>
                  setEditViolationType({
                    ...editViolationType,
                    nama_pelanggaran: e.target.value,
                  })
                }
                className={inputClasses}
                required
              />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Kategori
                </span>
                <select
                  value={editViolationType.kategori}
                  onChange={(e) =>
                    setEditViolationType({
                      ...editViolationType,
                      kategori: e.target.value,
                    })
                  }
                  className={inputClasses}
                >
                  <option value="Ringan">Ringan</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Berat">Berat</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                Deskripsi (Opsional)
              </span>
              <textarea
                value={editViolationType.deskripsi}
                onChange={(e) =>
                  setEditViolationType({
                    ...editViolationType,
                    deskripsi: e.target.value,
                  })
                }
                className={`${inputClasses} min-h-[100px] rounded-2xl py-3`}
                placeholder="Tambahkan detail pelanggaran"
              />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className={secondaryButtonClasses}
              >
                Batal
              </button>
              <button type="submit" className={primaryButtonClasses}>
                Simpan Perubahan
              </button>
            </div>
          </form>
        );

      case "tahun":
        return (
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Tahun Ajaran
                </span>
                <input
                  type="text"
                  value={editTahunAjaran.tahun}
                  onChange={(e) =>
                    setEditTahunAjaran({
                      ...editTahunAjaran,
                      tahun: e.target.value,
                    })
                  }
                  className={inputClasses}
                  placeholder="contoh: 2024/2025"
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                  Semester
                </span>
                <select
                  value={editTahunAjaran.semester}
                  onChange={(e) =>
                    setEditTahunAjaran({
                      ...editTahunAjaran,
                      semester: e.target.value,
                    })
                  }
                  className={inputClasses}
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900/50">
                <input
                  type="checkbox"
                  checked={editTahunAjaran.is_active}
                  onChange={(e) =>
                    setEditTahunAjaran({
                      ...editTahunAjaran,
                      is_active: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  Jadikan tahun ajaran aktif
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className={secondaryButtonClasses}
              >
                Batal
              </button>
              <button type="submit" className={primaryButtonClasses}>
                Simpan Perubahan
              </button>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "kelas":
        return (
          <div className="space-y-6">
            {/* Class Statistics */}
            <div className={`${cardClasses} p-6 sm:p-5`}>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Statistik Kelas
                  </p>
                </div>
                <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm dark:bg-rose-500/15 dark:text-rose-200">
                  {kelas.length} kelas
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { label: "Total Kelas", value: kelas.length, icon: BookOpen },
                  { label: "Wali Kelas", value: waliOptions.length, icon: User },
                  { label: "Kelas 10", value: kelas.filter(k => k.tingkat === "10").length, icon: BookOpen },
                  { label: "Kelas 11", value: kelas.filter(k => k.tingkat === "11").length, icon: BookOpen },
                  { label: "Kelas 12", value: kelas.filter(k => k.tingkat === "12").length, icon: BookOpen },
                ].map(({ label, value, icon: IconComponent }) => (
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
                      <p className="text-base font-semibold text-gray-900 dark:text-slate-100">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Global Academic Year Configuration */}
            {currentAcademicYear ? (
              <div className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/50 p-4 dark:border-rose-900/30 dark:bg-rose-900/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                      Tahun Ajaran Aktif
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      {currentAcademicYear.tahun} - Semester {currentAcademicYear.semester}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openEditModal(currentAcademicYear)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-black/5 hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-slate-700"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Ubah Periode
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-yellow-100 bg-yellow-50/50 p-4 dark:border-yellow-900/30 dark:bg-yellow-900/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                      Belum ada Tahun Ajaran
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      Silakan atur tahun ajaran awal sistem.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsAddingYear(true);
                    setShowAddModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-black/5 hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-slate-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Inisialisasi
                </button>
              </div>
            )}

            <div className={`${cardClasses} !p-0 sm:!p-8 overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-gray-100 bg-[#C82020] text-xs font-semibold uppercase tracking-[0.2em] text-white dark:border-slate-800 dark:bg-[#a11818] dark:text-white">
                      <th className="px-4 py-3 text-left rounded-tl-[8px]">Nama Kelas</th>
                      <th className="px-4 py-3 text-left">Tingkat</th>
                      <th className="px-4 py-3 text-left">Wali Kelas / Guru BK</th>
                      <th className="px-4 py-3 text-left">Tahun Ajaran</th>
                      <th className="px-4 py-3 text-left rounded-tr-[8px]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kelas.map((k) => (
                      <tr
                        key={k.id}
                        className="border-b border-gray-100/80 transition hover:bg-rose-50 dark:border-slate-800/60 dark:hover:bg-slate-800"
                      >
                        <td className="px-4 py-4 align-top font-semibold text-gray-900 dark:text-slate-100">
                          {k.nama_kelas}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400">
                            Kelas {k.tingkat}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-3">
                            {/* Wali Kelas */}
                            <div className="flex flex-col">
                              {k.wali_kelas_name ? (
                                <>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400">Wali Kelas</span>
                                  <span className="font-semibold text-gray-900 dark:text-slate-100">{k.wali_kelas_name}</span>
                                  <span className="text-[11px] text-gray-500">{k.wali_kelas_nip}</span>
                                </>
                              ) : (
                                <span className="text-gray-400 italic text-xs">Wali Kelas belum diatur</span>
                              )}
                            </div>

                            {/* Guru BK */}
                            <div className="flex flex-col">
                              {k.guru_bk_nip ? (
                                <>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400">Guru BK</span>
                                  <span className="font-semibold text-gray-900 dark:text-slate-100">{k.guru_bk_name || k.guru_bk_nip}</span>
                                  <span className="text-[11px] text-gray-500">{k.guru_bk_nip}</span>
                                </>
                              ) : (
                                <span className="text-gray-400 italic text-xs">Guru BK belum diatur</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-gray-600 dark:text-slate-400">
                          {k.tahun_ajaran}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEditModal(k)} className={iconButtonClasses} title="Edit kelas">
                              <Edit className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                            </button>
                            <button onClick={() => handleDeleteItem(k)} className={iconButtonClasses} title="Hapus kelas">
                              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-300" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case "violations":
        return (
          <div className="space-y-6">
            <div className={`${cardClasses} p-6 sm:p-5`}>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                    Statistik Pelanggaran
                  </p>
                </div>
                <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm dark:bg-rose-500/15 dark:text-rose-200">
                  {violationTypes.length} jenis
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {[
                  { label: "Total Jenis", value: violationTypes.length, icon: AlertTriangle },
                  { label: "Ringan", value: violationTypes.filter(v => v.kategori === "Ringan").length, icon: AlertTriangle },
                  { label: "Sedang", value: violationTypes.filter(v => v.kategori === "Sedang").length, icon: AlertTriangle },
                  { label: "Berat", value: violationTypes.filter(v => v.kategori === "Berat").length, icon: AlertTriangle },
                ].map(({ label, value, icon: IconComponent }) => (
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
                      <p className="text-base font-semibold text-gray-900 dark:text-slate-100">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${cardClasses} !p-0 sm:!p-8 overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-gray-100 bg-[#C82020] text-xs font-semibold uppercase tracking-[0.2em] text-white dark:border-slate-800 dark:bg-[#a11818] dark:text-white">
                      <th className="px-4 py-3 text-left rounded-tl-[8px] cursor-pointer hover:bg-rose-600 transition-colors group" onClick={() => handleSort("nama_pelanggaran")}>
                        <div className="flex items-center gap-2">
                          Nama Pelanggaran
                          {sortConfig.key === "nama_pelanggaran" && (sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left cursor-pointer hover:bg-rose-600 transition-colors group" onClick={() => handleSort("kategori")}>
                        <div className="flex items-center gap-2">
                          Kategori
                          {sortConfig.key === "kategori" && (sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left cursor-pointer hover:bg-rose-600 transition-colors group" onClick={() => handleSort("deskripsi")}>
                        <div className="flex items-center gap-2">
                          Deskripsi
                          {sortConfig.key === "deskripsi" && (sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left rounded-tr-[8px]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedData(violationTypes).map((v) => (
                      <tr
                        key={v.id}
                        className="border-b border-gray-100/80 transition hover:bg-rose-50 dark:border-slate-800/60 dark:hover:bg-slate-800"
                      >
                        <td className="px-4 py-4 align-top font-semibold text-gray-900 dark:text-slate-100">
                          {v.nama_pelanggaran}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${v.kategori === "Berat"
                              ? "bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-900/30 dark:text-red-400"
                              : v.kategori === "Sedang"
                                ? "bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-green-50 text-green-700 ring-green-600/10 dark:bg-green-900/30 dark:text-green-400"
                              }`}
                          >
                            {v.kategori}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top max-w-xs truncate text-gray-600 dark:text-slate-400">
                          {v.deskripsi || "-"}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEditModal(v)} className={iconButtonClasses} title="Edit pelanggaran">
                              <Edit className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                            </button>
                            <button onClick={() => handleDeleteItem(v)} className={iconButtonClasses} title="Hapus pelanggaran">
                              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-300" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className={pageShellClasses}>
        <div className={`${cardClasses} flex flex-col items-center gap-3 text-center`}>
          <Settings className="h-14 w-14 text-gray-400 dark:text-slate-500" />
          <h2 className="text-2xl font-semibold">Akses Terbatas</h2>
          <p className="text-gray-600 dark:text-slate-400">
            Anda tidak memiliki akses untuk mengelola data master.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={pageShellClasses}>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${pageShellClasses} fade-in`}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          {/* <div className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
            Administrasi
          </div> */}
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Data Master</h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Kelola referensi kelas, jenis pelanggaran, dan tahun ajaran
          </p>
        </div>
        {activeTab !== "tahun" && ( // Only show "Tambah Data" for tabs that allow adding
          <button onClick={() => setShowAddModal(true)} className={primaryButtonClasses}>
            <Plus className="h-4 w-4" />
            Tambah Data
          </button>
        )}
      </div>

      {/* Tabs & Stats */}
      <div className={`${cardClasses} !p-0 overflow-hidden`}>
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 dark:border-slate-800">
          {tabs.filter(tab => tab.id !== "tahun").map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-medium transition-colors ${isActive
                  ? "border-rose-500 text-rose-600 dark:border-rose-400 dark:text-rose-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
              >
                <Icon
                  className={`h-4 w-4 transition-colors ${isActive
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-gray-400 group-hover:text-gray-500 dark:text-slate-500 dark:group-hover:text-slate-400"
                    }`}
                />
                {tab.label}
              </button>
            );
          })}
        </div>


      </div>

      {/* Main Content Area */}
      {renderTabContent()}

      {/* Add Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[12px] bg-white/95 p-8 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/80 dark:ring-1 dark:ring-slate-700/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Formulir Data Baru
              </p>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Tambah {tabs.find((t) => t.id === activeTab)?.label}
              </h2>
            </div>
            {getAddForm()}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[12px] bg-white/95 p-8 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/80 dark:ring-1 dark:ring-slate-700/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Mode Edit
              </p>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Perbarui {tabs.find((t) => t.id === activeTab)?.label}
              </h2>
            </div>
            {getEditForm()}
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterData;
