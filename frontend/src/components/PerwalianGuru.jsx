import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { UserPlus, UserMinus, Search, Users, ShieldAlert, X, Clock3, MapPin, Trophy, AlertTriangle } from "lucide-react";
import { guardianshipService, studentService } from "../services/api";
import { format, parseISO } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { formatNumericId } from "../lib/formatters";

const PerwalianGuru = () => {
    const [periodActive, setPeriodActive] = useState(false);
    const [myStudents, setMyStudents] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [addingNis, setAddingNis] = useState(null);
    const [selectedDetail, setSelectedDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [configRes, myRes, studentsRes] = await Promise.all([
                guardianshipService.getConfig(),
                guardianshipService.getMyStudents(),
                studentService.list(),
            ]);
            setPeriodActive(configRes.data.active);
            setMyStudents(myRes.data);
            setAllStudents(studentsRes.data || []);
        } catch (error) {
            console.error("Failed to load perwalian data", error);
            toast.error("Gagal memuat data perwalian");
        } finally {
            setLoading(false);
        }
    };

    const handleAddStudent = async (nis) => {
        setAddingNis(nis);
        try {
            await guardianshipService.addStudent(nis);
            toast.success("Siswa berhasil ditambahkan");
            const myRes = await guardianshipService.getMyStudents();
            setMyStudents(myRes.data);
            // Optional: Don't close modal to allow adding multiple, or close it.
            // setShowAddModal(false); 
        } catch (error) {
            toast.error(error.response?.data?.detail || "Gagal menambahkan siswa");
        } finally {
            setAddingNis(null);
        }
    };

    const handleRemoveStudent = async (nis, e) => {
        e.stopPropagation();
        if (!window.confirm("Hapus siswa dari binaan Anda?")) return;
        try {
            await guardianshipService.removeStudent(nis);
            toast.success("Siswa dihapus dari binaan");
            setMyStudents((prev) => prev.filter((s) => s.nis !== nis));
        } catch (error) {
            toast.error("Gagal menghapus siswa");
        }
    };

    const handleViewDetail = async (nis) => {
        setDetailLoading(true);
        try {
            const { data } = await guardianshipService.getStudentDetails(nis);
            setSelectedDetail(data);
        } catch (error) {
            toast.error("Gagal memuat detail siswa");
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => setSelectedDetail(null);
    const closeAddModal = () => {
        setShowAddModal(false);
        setSearchQuery("");
    };

    // Helper styles (simplified from Dashboard)
    const violationCountColors = {
        ringan: "bg-yellow-100 text-yellow-800",
        sedang: "bg-orange-100 text-orange-800",
        berat: "bg-red-100 text-red-800",
    };

    const candidateStudents = useMemo(() => {
        if (!searchQuery || searchQuery.length < 3) return [];
        const myNisSet = new Set(myStudents.map(s => s.nis));
        return allStudents.filter(s => {
            if (myNisSet.has(s.nis)) return false;
            return s.nama.toLowerCase().includes(searchQuery.toLowerCase()) || s.nis.includes(searchQuery);
        }).slice(0, 10);
    }, [allStudents, myStudents, searchQuery]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-8 bg-rose-50/80 p-6 text-gray-900 dark:bg-slate-950 dark:text-slate-100 sm:p-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                        Perwalian Saya
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                        Kelola daftar siswa yang menjadi tanggung jawab binaan Anda.
                    </p>
                </div>
                {periodActive && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 font-semibold text-white shadow-lg transition hover:bg-emerald-600 hover:shadow-emerald-500/20"
                    >
                        <UserPlus className="h-5 w-5" />
                        <span>Tambah Siswa</span>
                    </button>
                )}
            </header>

            {!periodActive && (
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                    <ShieldAlert className="h-5 w-5" />
                    <span className="text-sm font-medium">
                        Periode pemilihan siswa sedang ditutup oleh Admin. Anda hanya dapat melihat daftar binaan saat ini.
                    </span>
                </div>
            )}

            <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                        <Users className="h-5 w-5 text-rose-500" />
                        Siswa Binaan ({myStudents.length})
                    </h2>
                </div>

                <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                            <thead className="sticky top-0 z-10">
                                <tr className="border-b border-gray-100 bg-[#f94449] text-xs font-semibold uppercase tracking-[0.2em] text-white dark:border-slate-800 dark:bg-[#a11818]">
                                    <th className="px-6 py-3 text-left">Siswa</th>
                                    <th className="px-6 py-3 text-left">Kelas</th>
                                    <th className="px-6 py-3 text-left">Statistik</th>
                                    <th className="px-6 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                                {myStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500">
                                            Belum ada siswa binaan.
                                        </td>
                                    </tr>
                                ) : (
                                    myStudents.map((student) => (
                                        <tr
                                            key={student.nis}
                                            onClick={() => handleViewDetail(student.nis)}
                                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                                        >
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{student.nama}</div>
                                                <div className="text-xs text-gray-500">{formatNumericId(student.nis)}</div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                {student.id_kelas}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div className="flex gap-2">
                                                    {student.active_violation_count > 0 ? (
                                                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                                            {student.active_violation_count} Aktif
                                                        </span>
                                                    ) : student.violation_count > 0 ? (
                                                        <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                                            {student.violation_count} Riwayat
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                            Bersih
                                                        </span>
                                                    )}

                                                    {student.achievement_count > 0 && (
                                                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                            {student.achievement_count} Prestasi
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right">
                                                <button
                                                    onClick={(e) => handleRemoveStudent(student.nis, e)}
                                                    className="text-gray-400 hover:text-red-600 transition disabled:opacity-30 disabled:hover:text-gray-400"
                                                    title={periodActive ? "Lepas Binaan" : "Periode perwalian ditutup"}
                                                    disabled={!periodActive}
                                                >
                                                    <UserMinus className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add Student Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8" onClick={closeAddModal}>
                    <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b px-6 py-4 dark:border-slate-800">
                            <h2 className="text-lg font-bold">Tambah Siswa Binaan</h2>
                            <button onClick={closeAddModal} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-slate-800">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="relative mb-6">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cari nama atau NIS siswa..."
                                    className="w-full rounded-full border border-gray-200 py-3 pl-10 pr-4 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {!searchQuery && (
                                    <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                                        <Search className="h-8 w-8 mb-2 opacity-20" />
                                        <p className="text-sm">Ketik minimal 3 huruf untuk mencari siswa.</p>
                                    </div>
                                )}
                                {searchQuery && searchQuery.length >= 3 && candidateStudents.length === 0 && (
                                    <div className="py-8 text-center text-sm text-gray-500">
                                        Tidak ditemukan siswa dengan kata kunci "{searchQuery}" yang belum masuk dalam daftar Anda.
                                    </div>
                                )}
                                {candidateStudents.map(student => (
                                    <div key={student.nis} className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800 transition">
                                        <div className="overflow-hidden">
                                            <div className="font-medium text-gray-900 dark:text-white">{student.nama}</div>
                                            <div className="text-xs text-gray-500 flex gap-2">
                                                <span>{student.id_kelas}</span>
                                                <span>•</span>
                                                <span>{formatNumericId(student.nis)}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAddStudent(student.nis)}
                                            disabled={addingNis === student.nis}
                                            className="ml-3 flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 dark:bg-emerald-900/30 dark:text-emerald-400"
                                        >
                                            {addingNis === student.nis ? (
                                                <span className="animate-pulse">...</span>
                                            ) : (
                                                <>
                                                    <UserPlus className="h-3 w-3" /> Tambah
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {(selectedDetail || detailLoading) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8" onClick={closeDetail}>
                    <div className="relative w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        {detailLoading ? (
                            <div className="flex h-64 items-center justify-center">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between border-b px-6 py-4 dark:border-slate-800">
                                    <h2 className="text-lg font-bold">Detail Siswa Binaan</h2>
                                    <button onClick={closeDetail} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-slate-800">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="overflow-y-auto px-6 py-6">
                                    <div className="flex flex-col gap-1 mb-6">
                                        <h3 className="text-2xl font-bold">{selectedDetail.violation_summary?.nama}</h3>
                                        <p className="text-gray-500 dark:text-slate-400">{selectedDetail.violation_summary?.kelas} • NIS {formatNumericId(selectedDetail.violation_summary?.nis)}</p>
                                    </div>

                                    {/* Active Counts Grid */}
                                    <div className="grid grid-cols-3 gap-4 mb-8">
                                        {["ringan", "sedang", "berat"].map(sev => (
                                            <div key={sev} className="rounded-lg border bg-gray-50 p-4 text-center dark:border-slate-800 dark:bg-slate-800/50">
                                                <div className="text-xs uppercase tracking-wider text-gray-500">Pelanggaran {sev}</div>
                                                <div className={`text-2xl font-bold ${sev === "berat" && selectedDetail.violation_summary?.active_counts[sev] > 0 ? "text-red-600" :
                                                    sev === "sedang" && selectedDetail.violation_summary?.active_counts[sev] > 0 ? "text-orange-600" :
                                                        "text-gray-800 dark:text-gray-100"
                                                    }`}>
                                                    {selectedDetail.violation_summary?.active_counts[sev] || 0}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Violations */}
                                    <h4 className="flex items-center gap-2 mb-4 font-semibold text-rose-600">
                                        <AlertTriangle className="h-5 w-5" /> Riwayat Pelanggaran
                                    </h4>
                                    {selectedDetail.violation_summary?.violations?.length > 0 ? (
                                        <div className="space-y-3 mb-8">
                                            {selectedDetail.violation_summary.violations.map(v => (
                                                <div key={v.id} className="rounded-lg border p-4 dark:border-slate-800 group hover:shadow-sm transition">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mb-1 ${violationCountColors[v.kategori] || "bg-gray-100"}`}>
                                                                {v.kategori}
                                                            </span>
                                                            <div className="font-semibold">{v.jenis}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                                                                <Clock3 className="h-3 w-3" />
                                                                {format(parseISO(v.waktu), "dd MMM yyyy", { locale: localeID })}
                                                            </div>
                                                            <span className="text-[10px] uppercase font-bold text-gray-400">{v.status.replace("_", " ")}</span>
                                                        </div>
                                                    </div>
                                                    {v.detail && <p className="text-sm text-gray-600 dark:text-slate-400">{v.detail}</p>}
                                                    {v.tempat && <div className="mt-2 text-xs text-gray-400 flex items-center gap-1"><MapPin className="h-3 w-3" /> {v.tempat}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-gray-500 border rounded-lg bg-gray-50 dark:bg-slate-800/50 mb-8">Tidak ada riwayat pelanggaran.</div>
                                    )}

                                    {/* Achievements */}
                                    <h4 className="flex items-center gap-2 mb-4 font-semibold text-blue-600">
                                        <Trophy className="h-5 w-5" /> Riwayat Prestasi
                                    </h4>
                                    {selectedDetail.achievements?.length > 0 ? (
                                        <div className="space-y-3">
                                            {selectedDetail.achievements.map(a => (
                                                <div key={a.id} className="rounded-lg border p-4 dark:border-slate-800 border-l-4 border-l-blue-500 hover:shadow-sm transition">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-semibold text-gray-900 dark:text-white">{a.judul}</div>
                                                            <div className="text-sm text-blue-600">{a.kategori} • {a.tingkat}</div>
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Clock3 className="h-3 w-3" />
                                                            {format(parseISO(a.tanggal_prestasi), "dd MMM yyyy", { locale: localeID })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-gray-500 border rounded-lg bg-gray-50 dark:bg-slate-800/50">Tidak ada riwayat prestasi.</div>
                                    )}
                                </div>

                                <div className="bg-gray-50 p-4 border-t text-right dark:bg-slate-900 dark:border-slate-800">
                                    <button onClick={closeDetail} className="rounded-lg bg-white border px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700">
                                        Tutup
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerwalianGuru;
