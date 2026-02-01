import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Users,
    UserCheck,
    ToggleLeft,
    ToggleRight,
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    Search,
    X,
    School,
    AlertCircle
} from "lucide-react";
import { guardianshipService } from "../services/api";

const PerwalianAdmin = () => {
    const [periodActive, setPeriodActive] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // For storing fetched student details per teacher { teacherId: [students] }
    const [teacherStudentsMap, setTeacherStudentsMap] = useState({});
    const [loadingDetails, setLoadingDetails] = useState({});
    const [expandedTeacherId, setExpandedTeacherId] = useState(null);

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

            // Normalize stats into a map for easy lookup
            const statsMap = {};
            statsRes.data.forEach(s => {
                statsMap[s.teacher_id] = s.student_count;
            });
            setStats(statsMap);

            const enrichedUsers = teachersRes.data.map(u => ({
                ...u,
                student_count: statsMap[u.id] || 0
            }));

            setAllUsers(enrichedUsers);
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

    const handleAddGuardian = async (userId) => {
        // Optimistic update: Add user to active list locally, then sync
        const targetUser = allUsers.find(u => u.id === userId);
        if (!targetUser) return;

        const updatedUsers = allUsers.map(u =>
            u.id === userId ? { ...u, is_guru_wali: true } : u
        );

        // Calculate new list of IDs
        const activeIds = updatedUsers.filter(u => u.is_guru_wali).map(u => u.id);

        try {
            await guardianshipService.updateTeachers(activeIds);
            setAllUsers(updatedUsers);
            toast.success(`${targetUser.full_name} ditambahkan sebagai Guru Wali`);
            setIsAddModalOpen(false);
        } catch (error) {
            toast.error("Gagal menambahkan Guru Wali");
        }
    };

    const handleRemoveGuardian = async (userId, e) => {
        e.stopPropagation(); // Prevent accordion toggle
        if (!window.confirm("Hapus akses Guru Wali dari pengguna ini?")) return;

        const updatedUsers = allUsers.map(u =>
            u.id === userId ? { ...u, is_guru_wali: false } : u
        );
        const activeIds = updatedUsers.filter(u => u.is_guru_wali).map(u => u.id);

        try {
            await guardianshipService.updateTeachers(activeIds);
            setAllUsers(updatedUsers);
            toast.success("Akses Guru Wali dihapus");
            // Close accordion if it was this user
            if (expandedTeacherId === userId) setExpandedTeacherId(null);
        } catch (error) {
            toast.error("Gagal menghapus Guru Wali");
        }
    };

    const handleExpand = async (teacherId) => {
        if (expandedTeacherId === teacherId) {
            setExpandedTeacherId(null);
            return;
        }

        setExpandedTeacherId(teacherId);

        // Fetch students if not already cached
        if (!teacherStudentsMap[teacherId]) {
            setLoadingDetails(prev => ({ ...prev, [teacherId]: true }));
            try {
                const res = await guardianshipService.getTeacherStudents(teacherId);
                setTeacherStudentsMap(prev => ({
                    ...prev,
                    [teacherId]: res.data
                }));
            } catch (error) {
                toast.error("Gagal memuat detail siswa");
            } finally {
                setLoadingDetails(prev => ({ ...prev, [teacherId]: false }));
            }
        }
    };

    const activeGuardians = allUsers.filter(u => u.is_guru_wali);
    const availableCandidates = allUsers.filter(u => !u.is_guru_wali);

    // Sort active guardians: active first, then alphabetical?
    // Let's just sort alphabetically
    activeGuardians.sort((a, b) => a.full_name.localeCompare(b.full_name));

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-8 bg-gray-50/50 p-8 text-gray-900 pb-20 fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Manajemen Perwalian
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Kelola guru wali, periode perwalian, dan monitoring siswa binaan.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleTogglePeriod}
                        className={`flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold transition shadow-sm ${periodActive
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200"
                            : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                            }`}
                    >
                        {periodActive ? (
                            <>
                                <ToggleRight className="h-5 w-5" /> Periode Aktif
                            </>
                        ) : (
                            <>
                                <ToggleLeft className="h-5 w-5" /> Periode Tutup
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* List of Guardians */}
            <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <UserCheck className="w-6 h-6 text-rose-500" />
                        Daftar Guru Wali ({activeGuardians.length})
                    </h2>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition shadow-sm hover:shadow-md"
                    >
                        <Plus className="w-5 h-5" />
                        Tambah Guru Wali
                    </button>
                </div>

                <div className="space-y-4">
                    {activeGuardians.length === 0 ? (
                        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center shadow-sm">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Belum ada Guru Wali</h3>
                            <p className="text-gray-500">Tambahkan guru atau staf untuk mulai mengelola perwalian.</p>
                        </div>
                    ) : (
                        activeGuardians.map((guardian) => (
                            <div
                                key={guardian.id}
                                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                            >
                                {/* Card Header / Summary */}
                                <div
                                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                                    onClick={() => handleExpand(guardian.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-lg">
                                            {guardian.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{guardian.full_name}</h4>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <span className="capitalize px-1.5 py-0.5 bg-gray-100 rounded text-xs">{guardian.role.replace(/_/g, " ")}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {guardian.student_count} Siswa Binaan
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={(e) => handleRemoveGuardian(guardian.id, e)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                                            title="Hapus Guru Wali"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className={`transform transition-transform duration-300 ${expandedTeacherId === guardian.id ? "rotate-180" : ""}`}>
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content - Student List */}
                                <div
                                    className={`
                                        overflow-hidden transition-all duration-500 ease-in-out border-t border-gray-100 bg-gray-50/30
                                        ${expandedTeacherId === guardian.id ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}
                                    `}
                                >
                                    <div className="p-5 pt-2">
                                        {loadingDetails[guardian.id] ? (
                                            <div className="py-8 text-center text-gray-500 flex flex-col items-center">
                                                <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mb-2" />
                                                Memuat data siswa...
                                            </div>
                                        ) : teacherStudentsMap[guardian.id]?.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-gray-100 text-gray-600">
                                                        <tr>
                                                            <th className="px-4 py-2 font-medium rounded-l-lg">Siswa</th>
                                                            <th className="px-4 py-2 font-medium">Kelas</th>
                                                            <th className="px-4 py-2 font-medium">Pelanggaran</th>
                                                            <th className="px-4 py-2 font-medium rounded-r-lg">Prestasi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {teacherStudentsMap[guardian.id].map(student => (
                                                            <tr key={student.nis}>
                                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                                    {student.nama} <span className="text-gray-400 font-normal">({student.nis})</span>
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-600">{student.id_kelas}</td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${student.active_violation_count > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                                                                            {student.active_violation_count} Aktif
                                                                        </span>
                                                                        {student.violation_count > 0 && <span className="text-xs text-gray-400">Total: {student.violation_count}</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                                        {student.achievement_count}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-dashed border-gray-200">
                                                <School className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                <p>Belum ada siswa yang dibina.</p>
                                                <p className="text-xs mt-1">Siswa dapat ditambahkan melalui menu Perwalian Guru atau oleh Admin.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add Guardian Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">Tambah Guru Wali</h3>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1.5 rounded-full hover:bg-gray-200 transition text-gray-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="mb-4 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cari nama pengguna..."
                                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition text-sm"
                                    onChange={(e) => {
                                        // Simple client-side search could be implemented if list is long
                                        // For now relying on browser 'Cmd+F' or basic scrolling, 
                                        // but adding regex filter to the list map below would be better.
                                        // Let's implement active filtering:
                                        const term = e.target.value.toLowerCase();
                                        const items = document.querySelectorAll('.candidate-item');
                                        items.forEach(item => {
                                            const name = item.getAttribute('data-name').toLowerCase();
                                            if (name.includes(term)) {
                                                item.style.display = 'flex';
                                            } else {
                                                item.style.display = 'none';
                                            }
                                        });
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                {availableCandidates.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p>Semua pengguna aktif sudah menjadi Guru Wali.</p>
                                    </div>
                                ) : (
                                    availableCandidates.map(user => (
                                        <div
                                            key={user.id}
                                            className="candidate-item flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-rose-50 hover:border-rose-100 transition cursor-pointer group"
                                            onClick={() => handleAddGuardian(user.id)}
                                            data-name={user.full_name}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs group-hover:bg-rose-200 group-hover:text-rose-700">
                                                    {user.full_name.charAt(0)}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-medium text-gray-900 group-hover:text-rose-900">{user.full_name}</div>
                                                    <div className="text-xs text-gray-500 flex gap-2">
                                                        <span className="capitalize">{user.role.replace(/_/g, " ")}</span>
                                                        <span>•</span>
                                                        <span>NIP: {user.nip}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button className="p-2 bg-gray-100 text-gray-600 rounded-full group-hover:bg-rose-500 group-hover:text-white transition">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerwalianAdmin;
