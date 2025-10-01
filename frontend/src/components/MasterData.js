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
} from "lucide-react";

// Use configured API client with auth header

const MasterData = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("kelas");
  const [kelas, setKelas] = useState([]);
  const [violationTypes, setViolationTypes] = useState([]);
  const [tahunAjaran, setTahunAjaran] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form states
  const [waliOptions, setWaliOptions] = useState([]);
  const [newKelas, setNewKelas] = useState({
    nama_kelas: "",
    tingkat: "",
    wali_kelas_nip: "",
    tahun_ajaran: "",
  });
  const [editKelas, setEditKelas] = useState({
    nama_kelas: "",
    tingkat: "",
    wali_kelas_nip: "",
    tahun_ajaran: "",
  });

  const [newViolationType, setNewViolationType] = useState({
    nama_pelanggaran: "",
    kategori: "Ringan",
    poin: 0,
    deskripsi: "",
  });
  const [editViolationType, setEditViolationType] = useState({
    nama_pelanggaran: "",
    kategori: "Ringan",
    poin: 0,
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

  const tabs = [
    { id: "kelas", label: "Kelas", icon: BookOpen },
    { id: "violations", label: "Jenis Pelanggaran", icon: AlertTriangle },
    { id: "tahun", label: "Tahun Ajaran", icon: Calendar },
  ];

  const formatAcademicOption = (item) =>
    `${(item.tahun || "").trim()} - Semester ${item.semester}`;

  const academicOptions = tahunAjaran.map((item) => ({
    value: formatAcademicOption(item),
    label: `${item.tahun} (Semester ${item.semester})${
      item.is_active ? " - Aktif" : ""
    }`,
  }));

  useEffect(() => {
    if (user?.role === "admin") {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    try {
      const [kelasRes, violationsRes, tahunRes, usersRes] = await Promise.all([
        apiClient.get(`/master-data/kelas`),
        apiClient.get(`/master-data/jenis-pelanggaran`),
        apiClient.get(`/master-data/tahun-ajaran`),
        apiClient.get(`/users`),
      ]);

      setKelas(kelasRes.data);
      setViolationTypes(violationsRes.data);
      setTahunAjaran(tahunRes.data);
      const waliList = usersRes.data
        .filter((u) => u.role === "wali_kelas")
        .filter((u) => u.is_active)
        .map((u) => ({ nip: u.nip, name: u.full_name }));
      const existingNips = new Set(waliList.map((w) => w.nip));
      kelasRes.data.forEach((k) => {
        if (k.wali_kelas_nip && !existingNips.has(k.wali_kelas_nip)) {
          waliList.push({
            nip: k.wali_kelas_nip,
            name: k.wali_kelas_name || k.wali_kelas_nip,
          });
          existingNips.add(k.wali_kelas_nip);
        }
      });
      waliList.sort((a, b) => a.name.localeCompare(b.name));
      setWaliOptions(waliList);
      const defaultAcademic =
        tahunRes.data.find((item) => item.is_active) || tahunRes.data[0];
      setNewKelas((prev) => ({
        ...prev,
        tahun_ajaran: defaultAcademic
          ? formatAcademicOption(defaultAcademic)
          : prev.tahun_ajaran,
      }));
    } catch (error) {
      console.error("Failed to fetch master data:", error);
      toast.error("Gagal memuat data master");
    }
    setLoading(false);
  };

  const handleAddKelas = async (e) => {
    e.preventDefault();
    try {
      if (!newKelas.tahun_ajaran) {
        toast.error("Pilih tahun ajaran terlebih dahulu");
        return;
      }
      const payload = {
        ...newKelas,
        wali_kelas_nip: newKelas.wali_kelas_nip || null,
        tahun_ajaran: (newKelas.tahun_ajaran || "").trim(),
      };
      await apiClient.post(`/master-data/kelas`, payload);
      toast.success("Kelas berhasil ditambahkan");
      setShowAddModal(false);
      setNewKelas({
        nama_kelas: "",
        tingkat: "",
        wali_kelas_nip: "",
        tahun_ajaran: academicOptions[0]?.value || "",
      });
      fetchAllData();
    } catch (error) {
      console.error("Failed to add kelas:", error);
      const detail = error?.response?.data?.detail;
      toast.error(detail || "Gagal menambahkan kelas");
    }
  };

  const handleAddViolationType = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/master-data/jenis-pelanggaran`, newViolationType);
      toast.success("Jenis pelanggaran berhasil ditambahkan");
      setShowAddModal(false);
      setNewViolationType({
        nama_pelanggaran: "",
        kategori: "Ringan",
        poin: 0,
        deskripsi: "",
      });
      fetchAllData();
    } catch (error) {
      console.error("Failed to add violation type:", error);
      toast.error("Gagal menambahkan jenis pelanggaran");
    }
  };

  const handleAddTahunAjaran = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/master-data/tahun-ajaran`, newTahunAjaran);
      toast.success("Tahun ajaran berhasil ditambahkan");
      setShowAddModal(false);
      setNewTahunAjaran({ tahun: "", semester: "1", is_active: false });
      fetchAllData();
    } catch (error) {
      console.error("Failed to add tahun ajaran:", error);
      const detail = error?.response?.data?.detail;
      toast.error(detail || "Gagal menambahkan tahun ajaran");
    }
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    if (activeTab === "kelas") {
      setEditKelas({
        nama_kelas: item.nama_kelas,
        tingkat: item.tingkat,
        wali_kelas_nip: item.wali_kelas_nip || "",
        tahun_ajaran: item.tahun_ajaran,
      });
    } else if (activeTab === "violations") {
      setEditViolationType({
        nama_pelanggaran: item.nama_pelanggaran,
        kategori: item.kategori,
        poin: item.poin,
        deskripsi: item.deskripsi || "",
      });
    } else if (activeTab === "tahun") {
      setEditTahunAjaran({
        tahun: item.tahun,
        semester: item.semester,
        is_active: item.is_active,
      });
    }
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      if (activeTab === "kelas" && !editKelas.tahun_ajaran) {
        toast.error("Pilih tahun ajaran terlebih dahulu");
        return;
      }
      if (activeTab === "kelas") {
        const payload = {
          ...editKelas,
          wali_kelas_nip: editKelas.wali_kelas_nip || null,
          tahun_ajaran: (editKelas.tahun_ajaran || "").trim(),
        };
        await apiClient.put(`/master-data/kelas/${selectedItem.id}`, payload);
        toast.success("Kelas berhasil diperbarui");
      } else if (activeTab === "violations") {
        await apiClient.put(
          `/master-data/jenis-pelanggaran/${selectedItem.id}`,
          {
            ...editViolationType,
            poin: Number(editViolationType.poin) || 0,
          }
        );
        toast.success("Jenis pelanggaran berhasil diperbarui");
      } else if (activeTab === "tahun") {
        await apiClient.put(
          `/master-data/tahun-ajaran/${selectedItem.id}`,
          editTahunAjaran
        );
        toast.success("Tahun ajaran berhasil diperbarui");
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

  const getAddForm = () => {
    switch (activeTab) {
      case "kelas":
        return (
          <form onSubmit={handleAddKelas} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Nama Kelas</label>
                <input
                  type="text"
                  value={newKelas.nama_kelas}
                  onChange={(e) =>
                    setNewKelas({ ...newKelas, nama_kelas: e.target.value })
                  }
                  className="modern-input"
                  placeholder="contoh: 10A"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tingkat</label>
                <select
                  value={newKelas.tingkat}
                  onChange={(e) =>
                    setNewKelas({ ...newKelas, tingkat: e.target.value })
                  }
                  className="modern-input"
                  required
                >
                  <option value="">Pilih tingkat</option>
                  <option value="10">Kelas 10</option>
                  <option value="11">Kelas 11</option>
                  <option value="12">Kelas 12</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Wali Kelas (Opsional)</label>
                <select
                  value={newKelas.wali_kelas_nip}
                  onChange={(e) =>
                    setNewKelas({ ...newKelas, wali_kelas_nip: e.target.value })
                  }
                  className="modern-input"
                >
                  <option value="">Belum ditetapkan</option>
                  {waliOptions.map((wali) => (
                    <option key={wali.nip} value={wali.nip}>
                      {wali.nip} - {wali.name}
                    </option>
                  ))}
                </select>
                {waliOptions.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Tambahkan akun dengan role Wali Kelas terlebih dahulu.
                  </p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Tahun Ajaran</label>
                <select
                  value={newKelas.tahun_ajaran}
                  onChange={(e) =>
                    setNewKelas({ ...newKelas, tahun_ajaran: e.target.value })
                  }
                  className="modern-input"
                  required
                  disabled={academicOptions.length === 0}
                >
                  <option value="" disabled={academicOptions.length > 0}>
                    {academicOptions.length
                      ? "Pilih tahun ajaran"
                      : "Tambahkan tahun ajaran terlebih dahulu"}
                  </option>
                  {academicOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {academicOptions.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Tambahkan data tahun ajaran melalui tab "Tahun Ajaran".
                  </p>
                )}
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
              <button type="submit" className="btn-primary">
                Tambah Kelas
              </button>
            </div>
          </form>
        );

      case "violations":
        return (
          <form onSubmit={handleAddViolationType} className="space-y-4">
            <div className="form-group">
              <label className="form-label">Nama Pelanggaran</label>
              <input
                type="text"
                value={newViolationType.nama_pelanggaran}
                onChange={(e) =>
                  setNewViolationType({
                    ...newViolationType,
                    nama_pelanggaran: e.target.value,
                  })
                }
                className="modern-input"
                placeholder="contoh: Terlambat datang ke sekolah"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select
                  value={newViolationType.kategori}
                  onChange={(e) =>
                    setNewViolationType({
                      ...newViolationType,
                      kategori: e.target.value,
                    })
                  }
                  className="modern-input"
                  required
                >
                  <option value="Ringan">Ringan</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Berat">Berat</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Poin</label>
                <input
                  type="number"
                  value={newViolationType.poin}
                  onChange={(e) =>
                    setNewViolationType({
                      ...newViolationType,
                      poin: parseInt(e.target.value) || 0,
                    })
                  }
                  className="modern-input"
                  min="0"
                  max="100"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi (Opsional)</label>
              <textarea
                value={newViolationType.deskripsi}
                onChange={(e) =>
                  setNewViolationType({
                    ...newViolationType,
                    deskripsi: e.target.value,
                  })
                }
                className="modern-input min-h-20"
                placeholder="Deskripsi detail pelanggaran..."
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn-secondary"
              >
                Batal
              </button>
              <button type="submit" className="btn-primary">
                Tambah Jenis Pelanggaran
              </button>
            </div>
          </form>
        );

      case "tahun":
        return (
          <form onSubmit={handleAddTahunAjaran} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Tahun Ajaran</label>
                <input
                  type="text"
                  value={newTahunAjaran.tahun}
                  onChange={(e) =>
                    setNewTahunAjaran({
                      ...newTahunAjaran,
                      tahun: e.target.value,
                    })
                  }
                  className="modern-input"
                  placeholder="contoh: 2024/2025"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Semester</label>
                <select
                  value={newTahunAjaran.semester}
                  onChange={(e) =>
                    setNewTahunAjaran({
                      ...newTahunAjaran,
                      semester: e.target.value,
                    })
                  }
                  className="modern-input"
                  required
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newTahunAjaran.is_active}
                  onChange={(e) =>
                    setNewTahunAjaran({
                      ...newTahunAjaran,
                      is_active: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="form-label mb-0">
                  Set sebagai tahun ajaran aktif
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn-secondary"
              >
                Batal
              </button>
              <button type="submit" className="btn-primary">
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
    switch (activeTab) {
      case "kelas":
        return (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Nama Kelas</label>
                <input
                  type="text"
                  value={editKelas.nama_kelas}
                  onChange={(e) =>
                    setEditKelas({ ...editKelas, nama_kelas: e.target.value })
                  }
                  className="modern-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tingkat</label>
                <select
                  value={editKelas.tingkat}
                  onChange={(e) =>
                    setEditKelas({ ...editKelas, tingkat: e.target.value })
                  }
                  className="modern-input"
                  required
                >
                  <option value="">Pilih tingkat</option>
                  <option value="10">Kelas 10</option>
                  <option value="11">Kelas 11</option>
                  <option value="12">Kelas 12</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Wali Kelas (Opsional)</label>
                <select
                  value={editKelas.wali_kelas_nip}
                  onChange={(e) =>
                    setEditKelas({
                      ...editKelas,
                      wali_kelas_nip: e.target.value,
                    })
                  }
                  className="modern-input"
                >
                  <option value="">Belum ditetapkan</option>
                  {waliOptions.map((wali) => (
                    <option key={wali.nip} value={wali.nip}>
                      {wali.nip} - {wali.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tahun Ajaran</label>
                <select
                  value={editKelas.tahun_ajaran}
                  onChange={(e) =>
                    setEditKelas({ ...editKelas, tahun_ajaran: e.target.value })
                  }
                  className="modern-input"
                  required
                >
                  {academicOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  {editKelas.tahun_ajaran &&
                    !academicOptions.some(
                      (option) => option.value === editKelas.tahun_ajaran
                    ) && (
                      <option value={editKelas.tahun_ajaran}>
                        {editKelas.tahun_ajaran} (tersimpan)
                      </option>
                    )}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="btn-secondary"
              >
                Batal
              </button>
              <button type="submit" className="btn-primary">
                Simpan Perubahan
              </button>
            </div>
          </form>
        );

      case "violations":
        return (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Nama Pelanggaran</label>
                <input
                  type="text"
                  value={editViolationType.nama_pelanggaran}
                  onChange={(e) =>
                    setEditViolationType({
                      ...editViolationType,
                      nama_pelanggaran: e.target.value,
                    })
                  }
                  className="modern-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select
                  value={editViolationType.kategori}
                  onChange={(e) =>
                    setEditViolationType({
                      ...editViolationType,
                      kategori: e.target.value,
                    })
                  }
                  className="modern-input"
                >
                  <option value="Ringan">Ringan</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Berat">Berat</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Poin</label>
                <input
                  type="number"
                  value={editViolationType.poin}
                  onChange={(e) =>
                    setEditViolationType({
                      ...editViolationType,
                      poin: e.target.value,
                    })
                  }
                  className="modern-input"
                  min={0}
                  required
                />
              </div>
              <div className="form-group md:col-span-1">
                <label className="form-label">Deskripsi (Opsional)</label>
                <textarea
                  value={editViolationType.deskripsi}
                  onChange={(e) =>
                    setEditViolationType({
                      ...editViolationType,
                      deskripsi: e.target.value,
                    })
                  }
                  className="modern-input h-24"
                  placeholder="Tambahkan detail pelanggaran"
                ></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="btn-secondary"
              >
                Batal
              </button>
              <button type="submit" className="btn-primary">
                Simpan Perubahan
              </button>
            </div>
          </form>
        );

      case "tahun":
        return (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Tahun Ajaran</label>
                <input
                  type="text"
                  value={editTahunAjaran.tahun}
                  onChange={(e) =>
                    setEditTahunAjaran({
                      ...editTahunAjaran,
                      tahun: e.target.value,
                    })
                  }
                  className="modern-input"
                  placeholder="contoh: 2024/2025"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Semester</label>
                <select
                  value={editTahunAjaran.semester}
                  onChange={(e) =>
                    setEditTahunAjaran({
                      ...editTahunAjaran,
                      semester: e.target.value,
                    })
                  }
                  className="modern-input"
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editTahunAjaran.is_active}
                  onChange={(e) =>
                    setEditTahunAjaran({
                      ...editTahunAjaran,
                      is_active: e.target.checked,
                    })
                  }
                />
                Jadikan tahun ajaran aktif
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="btn-secondary"
              >
                Batal
              </button>
              <button type="submit" className="btn-primary">
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
          <div className="modern-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Nama Kelas</th>
                    <th>Tingkat</th>
                    <th>Wali Kelas</th>
                    <th>Tahun Ajaran</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {kelas.map((k) => (
                    <tr key={k.id}>
                      <td className="font-medium">{k.nama_kelas}</td>
                      <td>
                        <span className="badge badge-info">
                          Kelas {k.tingkat}
                        </span>
                      </td>
                      <td>
                        {k.wali_kelas_name ? (
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {k.wali_kelas_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {k.wali_kelas_nip}
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>{k.tahun_ajaran}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={() => openEditModal(k)}
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={() => handleDeleteItem(k)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "violations":
        return (
          <div className="modern-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Nama Pelanggaran</th>
                    <th>Kategori</th>
                    <th>Poin</th>
                    <th>Deskripsi</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {violationTypes.map((v) => (
                    <tr key={v.id}>
                      <td className="font-medium">{v.nama_pelanggaran}</td>
                      <td>
                        <span
                          className={`badge ${
                            v.kategori === "Berat"
                              ? "badge-danger"
                              : v.kategori === "Sedang"
                              ? "badge-warning"
                              : "badge-info"
                          }`}
                        >
                          {v.kategori}
                        </span>
                      </td>
                      <td>
                        <span className="font-semibold text-gray-900">
                          {v.poin}
                        </span>
                      </td>
                      <td className="max-w-xs truncate">
                        {v.deskripsi || "-"}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={() => openEditModal(v)}
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={() => handleDeleteItem(v)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "tahun":
        return (
          <div className="modern-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Tahun Ajaran</th>
                    <th>Semester</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tahunAjaran.map((t) => (
                    <tr key={t.id}>
                      <td className="font-medium">{t.tahun}</td>
                      <td>Semester {t.semester}</td>
                      <td>
                        <span
                          className={`badge ${
                            t.is_active ? "badge-success" : "badge-info"
                          }`}
                        >
                          {t.is_active ? "Aktif" : "Tidak Aktif"}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={() => openEditModal(t)}
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={() => handleDeleteItem(t)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Akses Terbatas
          </h2>
          <p className="text-gray-600">
            Anda tidak memiliki akses untuk mengelola data master.
          </p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Data Master</h1>
          <p className="text-gray-600 mt-1">
            Kelola data master sistem pembinaan siswa
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Data
        </button>
      </div>

      {/* Tabs */}
      <div className="modern-card p-0 overflow-hidden">
        <div className="master-tabs flex border-b">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors master-tabs__button ${
                  activeTab === tab.id ? "master-tabs__button--active" : ""
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Stats for active tab */}
        <div className="master-stats-panel p-6 border-b">
          <div className="master-stats-grid grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeTab === "kelas" && (
              <>
                <div className="master-stats-card text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {kelas.length}
                  </p>
                  <p className="text-sm text-gray-600">Total Kelas</p>
                </div>
                <div className="master-stats-card text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {kelas.filter((k) => k.wali_kelas_nip).length}
                  </p>
                  <p className="text-sm text-gray-600">Memiliki Wali Kelas</p>
                </div>
                <div className="master-stats-card text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {new Set(kelas.map((k) => k.tahun_ajaran)).size}
                  </p>
                  <p className="text-sm text-gray-600">Tahun Ajaran</p>
                </div>
              </>
            )}

            {activeTab === "violations" && (
              <>
                <div className="master-stats-card text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {violationTypes.length}
                  </p>
                  <p className="text-sm text-gray-600">Total Jenis</p>
                </div>
                <div className="master-stats-card text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {
                      violationTypes.filter((v) => v.kategori === "Ringan")
                        .length
                    }
                  </p>
                  <p className="text-sm text-gray-600">Pelanggaran Ringan</p>
                </div>
                <div className="master-stats-card text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {
                      violationTypes.filter((v) => v.kategori === "Berat")
                        .length
                    }
                  </p>
                  <p className="text-sm text-gray-600">Pelanggaran Berat</p>
                </div>
              </>
            )}

            {activeTab === "tahun" && (
              <>
                <div className="master-stats-card text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {tahunAjaran.length}
                  </p>
                  <p className="text-sm text-gray-600">Total Tahun Ajaran</p>
                </div>
                <div className="master-stats-card text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {tahunAjaran.filter((t) => t.is_active).length}
                  </p>
                  <p className="text-sm text-gray-600">Aktif</p>
                </div>
                <div className="master-stats-card text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {tahunAjaran.filter((t) => t.semester === "1").length}
                  </p>
                  <p className="text-sm text-gray-600">Semester 1</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {renderTabContent()}

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Tambah {tabs.find((t) => t.id === activeTab)?.label}
            </h2>
            {getAddForm()}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Edit {tabs.find((t) => t.id === activeTab)?.label}
            </h2>
            {getEditForm()}
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterData;
