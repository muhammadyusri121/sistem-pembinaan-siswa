import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Users, UserCheck, ToggleLeft, ToggleRight, Save, Trash2 } from "lucide-react";
import { guardianshipService } from "../services/api";

const PerwalianAdmin = () => {
    const [periodActive, setPeriodActive] = useState(false);
    const [teachers, setTeachers] = useState([]);
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [configRes, teachersRes, statsRes] = await Promise.all([
                guardianshipService.getConfig(),
                guardianshipService.getTeachers(),
                guardianshipService.getMonitorStats(),
            ]);
            setPeriodActive(configRes.data.active);
            setTeachers(teachersRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error("Failed to load perwalian data", error);
            toast.error("Gagal memuat data perwalian");
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePeriod = async () => {
        try {
            const newVal = !periodActive;
            await guardianshipService.toggleConfig(newVal);
            setPeriodActive(newVal);
            toast.success(
                `Periode Perwalian ${newVal ? "Diaktifkan" : "Dinonaktifkan"}`
            );
        } catch (error) {
            toast.error("Gagal mengubah status periode");
        }
    };

    const handleTeacherCheck = (userId) => {
        setTeachers((prev) =>
            prev.map((t) =>
                t.id === userId ? { ...t, is_guru_wali: !t.is_guru_wali } : t
            )
        );
    };

    const handleSaveTeachers = async () => {
        setSaving(true);
        try {
            const selectedIds = teachers
                .filter((t) => t.is_guru_wali)
                .map((t) => t.id);
            await guardianshipService.updateTeachers(selectedIds);
            toast.success("Daftar Guru Wali diperbarui");
            // Refresh stats
            const statsRes = await guardianshipService.getMonitorStats();
            setStats(statsRes.data);
        } catch (error) {
            toast.error("Gagal menyimpan perubahan Guru Wali");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-8 bg-rose-50/80 p-8 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
            <header>
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                    Manajemen Perwalian
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                    Atur periode, tunjuk Guru Wali, dan pantau pembagian siswa.
                </p>
            </header>

            <section className="rounded-lg border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Periode Pembagian Siswa</h2>
                        <p className="text-sm text-gray-500">
                            Jika aktif, Guru Wali dapat menambahkan siswa binaan baru.
                        </p>
                    </div>
                    <button
                        onClick={handleTogglePeriod}
                        className={`flex items-center gap-2 rounded-full px-4 py-2 font-semibold transition ${periodActive
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                    >
                        {periodActive ? (
                            <>
                                <ToggleRight className="h-6 w-6" /> Aktif
                            </>
                        ) : (
                            <>
                                <ToggleLeft className="h-6 w-6" /> Nonaktif
                            </>
                        )}
                    </button>
                </div>
            </section>

            <div className="grid gap-8 lg:grid-cols-2">
                <section className="space-y-4 rounded-lg border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-lg font-semibold">
                            <UserCheck className="h-5 w-5 text-rose-500" />
                            Pilih Guru Wali
                        </h2>
                        <button
                            onClick={handleSaveTeachers}
                            disabled={saving}
                            className="flex items-center gap-2 rounded-full bg-rose-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            Simpan
                        </button>
                    </div>
                    <p className="text-sm text-gray-500">
                        Centang guru yang ditugaskan menjadi wali pembimbing.
                    </p>
                    <div className="mt-4 max-h-[500px] overflow-y-auto space-y-2">
                        {teachers.map((t) => (
                            <label
                                key={t.id}
                                className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-800 dark:text-gray-100">
                                        {t.full_name}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {t.role.replace("_", " ").toUpperCase()} • {t.nip}
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={t.is_guru_wali}
                                    onChange={() => handleTeacherCheck(t.id)}
                                    className="h-5 w-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                                />
                            </label>
                        ))}
                    </div>
                </section>

                <section className="space-y-4 rounded-lg border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                        <Users className="h-5 w-5 text-sky-500" />
                        Monitoring
                    </h2>
                    <p className="text-sm text-gray-500">
                        Jumlah siswa binaan per Guru Wali.
                    </p>
                    <div className="mt-4 max-h-[500px] overflow-y-auto space-y-2">
                        {stats.length === 0 ? (
                            <p className="text-center text-gray-500 py-10">Belum ada data perwalian.</p>
                        ) : (
                            stats.map((s) => (
                                <div
                                    key={s.teacher_id}
                                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
                                >
                                    <span className="font-medium text-gray-800 dark:text-gray-100">
                                        {s.teacher_name}
                                    </span>
                                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700 dark:bg-sky-900 dark:text-sky-200">
                                        {s.student_count} Siswa
                                    </span>
                                </div>
                            ))
                        )}

                    </div>
                </section>
            </div>
        </div>
    );
};

export default PerwalianAdmin;
