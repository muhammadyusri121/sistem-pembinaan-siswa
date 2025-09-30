import React, {
  useState,
  useEffect,
  useMemo,
  useContext,
  useCallback,
  useRef,
} from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { id as localeID } from "date-fns/locale";
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Clock3,
  Search,
  Plus,
  Flag,
  Trophy,
  X,
  MapPin,
} from "lucide-react";
import { AuthContext } from "../App";
import {
  dashboardService,
  studentService,
  masterDataService,
  violationService,
} from "../services/api";

const HERO_DESCRIPTION =
  "Sistem ini dirancang untuk meminimalisir tingkat pelanggaran siswa, juga memudahkan guru akan menindak siswa yang melakukan pelanggaran secara realtime.";

const CHART_GRADIENTS = [
  "from-rose-500 to-rose-400",
  "from-orange-500 to-amber-400",
  "from-amber-500 to-yellow-400",
  "from-lime-500 to-emerald-400",
  "from-emerald-500 to-teal-400",
  "from-cyan-500 to-sky-400",
  "from-sky-500 to-blue-400",
  "from-indigo-500 to-purple-400",
  "from-purple-500 to-fuchsia-400",
  "from-fuchsia-500 to-pink-400",
  "from-pink-500 to-rose-400",
  "from-red-500 to-red-400",
];

const simplifyLabel = (raw) => {
  if (raw === null || raw === undefined) return "";
  const text = raw.toString().trim();
  if (!text) return "";
  const match = text.match(/\d+/);
  return match ? match[0] : text;
};

const DEFAULT_STATS = {
  total_siswa: 0,
  total_pelanggaran: 0,
  total_users: 0,
  total_kelas: 0,
  recent_violations: 0,
  monthly_violation_chart: [],
  monthly_achievement_chart: [],
  todays_violations: [],
  recent_violation_records: [],
  student_violation_summaries: [],
  prestasi_summary: {
    total_prestasi: 0,
    verified_prestasi: 0,
    pending_prestasi: 0,
    kategori_populer: [],
    top_students: [],
    recent_achievements: [],
  },
  positivity_ratio: 0,
};

const Dashboard = () => {
  const { user, isDarkMode } = useContext(AuthContext);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [activeTab, setActiveTab] = useState("pelanggaran");
  const [nameInput, setNameInput] = useState("");
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);
  const nameSelectorRef = useRef(null);
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const reportMenuRef = useRef(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedStudentSummary, setSelectedStudentSummary] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [counselingNote, setCounselingNote] = useState("");
  const [isCounselingLoading, setIsCounselingLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [classOptions, setClassOptions] = useState([]);
  const [studentNameOptions, setStudentNameOptions] = useState([]);

  const pageBackgroundClass = useMemo(() => (
    isDarkMode
      ? "bg-slate-950 text-slate-100"
      : "bg-rose-50/80 text-gray-900"
  ), [isDarkMode]);

  const cardSurfaceClass = useMemo(
    () =>
      isDarkMode
        ? "rounded-3xl border border-slate-800/60 bg-slate-900/70 p-8 shadow-xl shadow-black/40 ring-1 ring-slate-700/60 backdrop-blur-sm"
        : "rounded-3xl bg-white/95 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur-sm",
    [isDarkMode]
  );

  const emptyStateClass = isDarkMode
    ? "border border-dashed border-slate-700/70 bg-slate-900/50 text-slate-300"
    : "border border-dashed border-gray-200 bg-rose-50/80 text-gray-500";

  const warningEmptyStateClass = isDarkMode
    ? "border border-dashed border-slate-700/70 bg-slate-900/40 text-slate-300"
    : "border border-dashed border-rose-200 bg-rose-50/40 text-gray-500";

  const neutralPanelClass = isDarkMode
    ? "border border-slate-800/60 bg-slate-900/60 text-slate-300"
    : "border border-gray-100 bg-rose-50/40 text-gray-500";

  const resolvedCardClass = isDarkMode
    ? "border border-emerald-500/30 bg-emerald-500/10"
    : "border-emerald-100 bg-emerald-50/60";

  const activeCardClass = isDarkMode
    ? "border border-rose-500/30 bg-rose-500/10"
    : "border-rose-100 bg-rose-50/60";

  const resolvedBadgeClass = isDarkMode
    ? "bg-emerald-500/20 text-emerald-200"
    : "bg-emerald-100 text-emerald-600";

  const activeBadgeClass = isDarkMode
    ? "bg-rose-500/20 text-rose-200"
    : "bg-rose-100 text-rose-600";

  const violationStatusColors = useMemo(
    () =>
      isDarkMode
        ? {
            none: "bg-emerald-500/20 text-emerald-200",
            ringan: "bg-amber-500/20 text-amber-200",
            sedang: "bg-orange-500/20 text-orange-200",
            berat: "bg-rose-500/20 text-rose-200",
          }
        : {
            none: "bg-emerald-100 text-emerald-600",
            ringan: "bg-amber-100 text-amber-600",
            sedang: "bg-orange-100 text-orange-600",
            berat: "bg-rose-100 text-rose-600",
          },
    [isDarkMode]
  );

  const violationCountColors = useMemo(
    () =>
      isDarkMode
        ? {
            ringan: "border border-amber-500/30 bg-amber-500/10 text-amber-200",
            sedang: "border border-orange-500/30 bg-orange-500/10 text-orange-200",
            berat: "border border-rose-500/30 bg-rose-500/10 text-rose-200",
          }
        : {
            ringan: "border border-amber-200 bg-amber-50 text-amber-600",
            sedang: "border border-orange-200 bg-orange-50 text-orange-600",
            berat: "border border-rose-200 bg-rose-50 text-rose-600",
          },
    [isDarkMode]
  );

  const heroImageUrl =
    process.env.REACT_APP_DASHBOARD_HERO || "/images/dashboard-hero.jpg";

  const achievementSummary =
    stats?.prestasi_summary ?? DEFAULT_STATS.prestasi_summary;

  const canReportViolation = useMemo(() => {
    const role = user?.role;
    const allowedRoles = [
      "guru_umum",
      "wali_kelas",
      "guru_bk",
      "admin",
      "kepala_sekolah",
      "wakil_kepala_sekolah",
    ];
    return allowedRoles.includes(role);
  }, [user?.role]);

  const fetchDashboardStats = useCallback(async () => {
    if (!user) {
      setLoadingStats(false);
      setStats(DEFAULT_STATS);
      return;
    }
    try {
      setLoadingStats(true);
      const response = await dashboardService.getStats();
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      setStats(DEFAULT_STATS);
      toast.error("Gagal memuat statistik dashboard");
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useEffect(() => {
    if (!user) return;

    const fetchStudents = async () => {
      try {
        setLoadingStudents(true);
        const response = await studentService.list();
        const list = Array.isArray(response.data) ? response.data : [];
        setStudentNameOptions(
          list
            .map((item) => item.nama)
            .filter(Boolean)
            .map((name) => name.trim())
            .sort((a, b) => a.localeCompare(b, "id"))
        );
      } catch (error) {
        console.error("Failed to fetch students:", error);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchClasses = async () => {
      try {
        const response = await masterDataService.classes();
        const list = Array.isArray(response.data) ? response.data : [];
        const uniqueNames = [
          ...new Set(
            list
              .map((item) => item.nama_kelas)
              .filter(Boolean)
              .map((name) => name.trim())
          ),
        ].sort((a, b) => a.localeCompare(b, "id"));
        setClassOptions(uniqueNames);
      } catch (error) {
        console.error("Failed to fetch classes:", error);
      }
    };

    fetchClasses();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        nameSelectorRef.current &&
        !nameSelectorRef.current.contains(event.target)
      ) {
        setIsNameDropdownOpen(false);
      }
      if (
        reportMenuRef.current &&
        !reportMenuRef.current.contains(event.target)
      ) {
        setIsReportMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const nameTokens = useMemo(
    () =>
      nameInput
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean),
    [nameInput]
  );

  const currentNameQuery = useMemo(() => {
    const parts = nameInput.split(",");
    const last = parts[parts.length - 1] ?? "";
    return last.trim();
  }, [nameInput]);

  const filteredNameOptions = useMemo(() => {
    const normalizedQuery = currentNameQuery.toLowerCase();
    if (normalizedQuery.length < 3) {
      return [];
    }
    return studentNameOptions
      .filter((option) => option.toLowerCase().includes(normalizedQuery))
      .filter((option) => !nameTokens.includes(option))
      .slice(0, 8);
  }, [currentNameQuery, nameTokens, studentNameOptions]);

  useEffect(() => {
    if (!filteredNameOptions.length) {
      setIsNameDropdownOpen(false);
    }
  }, [filteredNameOptions.length]);

  const violationSummaries = useMemo(() => {
    return Array.isArray(stats?.student_violation_summaries)
      ? stats.student_violation_summaries
      : [];
  }, [stats?.student_violation_summaries]);

  const achievementEntries = useMemo(
    () => achievementSummary?.recent_achievements ?? [],
    [achievementSummary]
  );

  const filterResults = useCallback(() => {
    const selectedNamesNormalized = nameTokens.map((value) =>
      value.trim().toLowerCase()
    );
    const normalizedClass = selectedClass.trim().toLowerCase();

    const baseData =
      activeTab === "pelanggaran" ? violationSummaries : achievementEntries;

    return baseData.filter((item) => {
      const candidateName = (item.nama || "").toLowerCase();
      const candidateClass = (item.kelas || item.id_kelas || "").toLowerCase();

      const matchesName = selectedNamesNormalized.length
        ? selectedNamesNormalized.some((name) => candidateName === name)
        : true;
      const matchesClass = normalizedClass
        ? candidateClass === normalizedClass
        : true;

      return matchesName && matchesClass;
    });
  }, [
    activeTab,
    achievementEntries,
    selectedClass,
    nameTokens,
    violationSummaries,
  ]);

  const handleNameSelect = useCallback(
    (value) => {
      if (!value) return;
      const tokens = nameInput
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);
      if (!tokens.includes(value)) {
        tokens.push(value);
        setNameInput(tokens.join(", "));
        setSearchPerformed(false);
      }
      setIsNameDropdownOpen(false);
    },
    [nameInput]
  );

  const openViolationDetail = useCallback(
    (summary) => {
      if (!summary || summary.detail_restricted) return;
      setSelectedStudentSummary(summary);
      setCounselingNote("");
      setDetailError("");
      setIsDetailDialogOpen(true);
    },
    []
  );

  const closeViolationDetail = useCallback(() => {
    setIsDetailDialogOpen(false);
    setSelectedStudentSummary(null);
    setCounselingNote("");
    setDetailError("");
  }, []);

  useEffect(() => {
    if (!isDetailDialogOpen || !selectedStudentSummary) return;
    const updated = violationSummaries.find(
      (item) => item.nis === selectedStudentSummary.nis
    );
    if (updated && updated !== selectedStudentSummary) {
      setSelectedStudentSummary(updated);
    } else if (!updated) {
      closeViolationDetail();
    }
  }, [
    closeViolationDetail,
    isDetailDialogOpen,
    selectedStudentSummary,
    violationSummaries,
  ]);

  const applyCounseling = useCallback(async () => {
    if (!selectedStudentSummary) return;
    setIsCounselingLoading(true);
    setDetailError("");
    try {
      const response = await violationService.applyCounseling(
        selectedStudentSummary.nis,
        counselingNote.trim() ? { catatan: counselingNote.trim() } : {}
      );
      const updatedSummary = response?.data?.summary;
      if (updatedSummary) {
        setSelectedStudentSummary(updatedSummary);
      }
      toast.success("Pembinaan berhasil disimpan");
      await fetchDashboardStats();
      setCounselingNote("");
    } catch (error) {
      const detail =
        error?.response?.data?.detail || "Gagal menyimpan pembinaan siswa";
      setDetailError(detail);
      toast.error(detail);
    } finally {
      setIsCounselingLoading(false);
    }
  }, [counselingNote, fetchDashboardStats, selectedStudentSummary]);

  useEffect(() => {
    if (searchPerformed) {
      setFilteredResults(filterResults());
    }
  }, [filterResults, searchPerformed]);

  useEffect(() => {
    setNameInput("");
    setSelectedClass("");
    setSearchPerformed(false);
    setIsNameDropdownOpen(false);
    setFilteredResults([]);
  }, [activeTab]);

  useEffect(() => {
    const baseData =
      activeTab === "pelanggaran" ? violationSummaries : achievementEntries;
    if (baseData.length) {
      const results = filterResults();
      setFilteredResults(results);
      setSearchPerformed(true);
    }
  }, [activeTab, achievementEntries, filterResults, violationSummaries]);

  const violationChartData = useMemo(() => {
    const monthly = stats?.monthly_violation_chart ?? [];
    let source = monthly;
    if (!monthly.length) {
      source = stats?.recent_violation_records ?? [];
    }
    if (!source.length) {
      return [];
    }

    if (monthly.length) {
      // Use all data, not just the last 12 items
      const chartData = source.map((item) => {
        let label = item.label ?? "";
        if (item.date) {
          try {
            label = format(parseISO(item.date), "d", { locale: localeID });
          } catch (error) {
            label = item.label ?? "";
          }
        }
        return {
          label: simplifyLabel(label),
          value: item.count ?? 0,
        };
      });
      return chartData;
    }

    const aggregatedMap = source.reduce((acc, item) => {
      const isoSource = item.waktu || item.created_at;
      if (!isoSource) return acc;
      try {
        const key = parseISO(String(isoSource)).toISOString().slice(0, 10);
        acc[key] = (acc[key] || 0) + 1;
      } catch (error) {
        // ignore
      }
      return acc;
    }, {});

    const orderedKeys = Object.keys(aggregatedMap).sort().slice(-12);

    const chartData = orderedKeys.map((key) => {
      let label = key;
      try {
        label = format(parseISO(key), "d", { locale: localeID });
      } catch (error) {
        label = key;
      }
      return { label: simplifyLabel(label), value: aggregatedMap[key] };
    });
    return chartData;
  }, [stats?.monthly_violation_chart, stats?.recent_violation_records]);

  const achievementChartData = useMemo(() => {
    const monthly = stats?.monthly_achievement_chart ?? [];
    let source = monthly;
    if (!monthly.length) {
      source = achievementSummary?.recent_achievements ?? [];
    }
    if (!source.length) {
      return [];
    }

    if (monthly.length) {
      // Use all data, not just the last 12 items
      const chartData = source.map((item) => {
        let label = item.label ?? "";
        if (item.date) {
          try {
            label = format(parseISO(item.date), "d", { locale: localeID });
          } catch (error) {
            label = item.label ?? "";
          }
        }
        return {
          label: simplifyLabel(label),
          value: item.count ?? 0,
        };
      });
      return chartData;
    }

    const aggregatedMap = source.reduce((acc, item) => {
      const raw = item.tanggal_prestasi;
      if (!raw) return acc;
      try {
        const key = parseISO(String(raw)).toISOString().slice(0, 10);
        acc[key] = (acc[key] || 0) + 1;
      } catch (error) {
        // ignore
      }
      return acc;
    }, {});

    const orderedKeys = Object.keys(aggregatedMap).sort().slice(-12);

    const chartData = orderedKeys.map((key) => {
      let label = key;
      try {
        label = format(parseISO(key), "d", { locale: localeID });
      } catch (error) {
        label = key;
      }
      return { label: simplifyLabel(label), value: aggregatedMap[key] };
    });
    return chartData;
  }, [
    achievementSummary?.recent_achievements,
    stats?.monthly_achievement_chart,
  ]);

  const chartSeries = useMemo(
    () =>
      activeTab === "pelanggaran" ? violationChartData : achievementChartData,
    [activeTab, achievementChartData, violationChartData]
  );

  const maxChartValue = useMemo(() => {
    if (!chartSeries.length) return 1;
    return Math.max(...chartSeries.map((item) => Number(item.value) || 0), 1);
  }, [chartSeries]);

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  const formattedToday = useMemo(
    () =>
      format(currentTime, "EEEE, d MMMM yyyy", {
        locale: localeID,
      }),
    [currentTime]
  );

  const handleSearch = (event) => {
    event.preventDefault();
    setSearchPerformed(true);
    setFilteredResults(filterResults());
    setIsNameDropdownOpen(false);
  };

  const formatAchievementDate = (value) => {
    if (!value) return "-";
    try {
      return format(parseISO(String(value)), "d MMM yyyy", {
        locale: localeID,
      });
    } catch (error) {
      return value;
    }
  };

  const formatViolationTimestamp = (value) => {
    if (!value) return "-";
    try {
      return format(parseISO(String(value)), "d MMM yyyy HH:mm", {
        locale: localeID,
      });
    } catch (error) {
      return "-";
    }
  };

  const severityDisplay = {
    ringan: "Ringan",
    sedang: "Sedang",
    berat: "Berat",
  };

  return (
    <div className={`space-y-12 min-h-screen ${pageBackgroundClass}`}>
      <section className="relative w-full">
        <div className="relative min-h-[380px] overflow-hidden rounded-lg pb-28 md:min-h-[440px]">
          <div className="absolute inset-0">
            <img
              src={heroImageUrl}
              alt="Gedung sekolah"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />
          </div>
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 py-16 text-center text-white">
            <span className="text-sm uppercase tracking-[0.3em] text-white/70">
              <b>
                {getWelcomeMessage()}, {user?.full_name || "Pengguna"}
              </b>
            </span>
            <h1 className="mt-4 text-4xl font-semibold drop-shadow-lg md:text-5xl">
              DISPO SMAN 1 Ketapang
            </h1>
            <p className="mt-4 max-w-3xl text-base text-white/90 md:text-lg">
              {HERO_DESCRIPTION}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{formattedToday}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock3 className="h-5 w-5" />
                <span>
                  {format(currentTime, "HH:mm:ss", { locale: localeID })} WIB
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-20 mx-auto -mt-24 w-full max-w-screen-2xl px-4">
          <div className={cardSurfaceClass}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Data{" "}
                  {activeTab === "pelanggaran" ? "Pelanggaran" : "Prestasi"}
                </h2>
                <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                  Cari informasi siswa berdasarkan nama dan kelas untuk melihat
                  catatan terbaru.
                </p>
              </div>
              <div className={`flex items-center gap-2 rounded-full p-1 ${isDarkMode ? "bg-slate-800/80" : "bg-gray-100"}`}>
                <button
                  type="button"
                  onClick={() => setActiveTab("pelanggaran")}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                    activeTab === "pelanggaran"
                      ? (isDarkMode
                          ? "bg-slate-900 text-rose-200 shadow"
                          : "bg-white text-rose-600 shadow")
                      : isDarkMode
                      ? "text-slate-400 hover:text-rose-200"
                      : "text-gray-500 hover:text-rose-500"
                  }`}
                >
                  Pelanggaran
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("prestasi")}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                    activeTab === "prestasi"
                      ? (isDarkMode
                          ? "bg-slate-900 text-rose-200 shadow"
                          : "bg-white text-rose-600 shadow")
                      : isDarkMode
                      ? "text-slate-400 hover:text-rose-200"
                      : "text-gray-500 hover:text-rose-500"
                  }`}
                >
                  Prestasi
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSearch}
              className="mt-8 grid gap-4 md:grid-cols-[1fr_1fr_auto]"
            >
              <div ref={nameSelectorRef} className="relative">
                <label className="text-sm font-medium text-gray-600">
                  Nama
                </label>
                <div className="mt-2 relative">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(event) => {
                      const value = event.target.value;
                      setNameInput(value);
                      const lastToken = value.split(",").pop()?.trim() ?? "";
                      if (lastToken.length >= 3) {
                        setIsNameDropdownOpen(true);
                      } else {
                        setIsNameDropdownOpen(false);
                      }
                    }}
                    onFocus={() => {
                      if (currentNameQuery.trim().length >= 3) {
                        setIsNameDropdownOpen(true);
                      }
                    }}
                    placeholder="Contoh: Budi, Siti"
                    className="w-full rounded-full border border-gray-200 px-5 py-2.5 text-sm text-gray-700 focus:border-rose-400 focus:outline-none"
                  />

                  {isNameDropdownOpen && filteredNameOptions.length > 0 && (
                    <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-rose-100 bg-white shadow-xl">
                      {filteredNameOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleNameSelect(option);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-2 text-sm transition ${isDarkMode ? "text-slate-100 hover:bg-slate-700/60" : "text-gray-700 hover:bg-rose-50"}`}
                        >
                          <span>{option}</span>
                          <span className="text-xs text-gray-400">
                            Tambahkan
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Ketik minimal 3 huruf, gunakan koma untuk menambahkan lebih
                  dari satu nama.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Kelas
                </label>
                <div className="mt-2">
                  <select
                    value={selectedClass}
                    onChange={(event) => {
                      setSelectedClass(event.target.value);
                      setSearchPerformed(false);
                    }}
                    className="w-full rounded-full border border-gray-200 px-5 py-2.5 text-sm text-gray-700 focus:border-rose-400 focus:outline-none"
                  >
                    <option value="">Semua kelas</option>
                    {classOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="mt-auto flex items-center justify-center gap-2 rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600"
                disabled={loadingStats || loadingStudents}
              >
                <Search className="h-4 w-4" />
                Cari
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-32 w-full max-w-screen-2xl space-y-12 px-4">
        <div className={cardSurfaceClass}>
          <div className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 ${isDarkMode ? "border-slate-800" : "border-gray-100"}`}>
            <div className={`flex items-center gap-3 text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>
              <span className="text-gray-400">"Result"</span>
            </div>
            <Link
              to={
                activeTab === "pelanggaran"
                  ? "/violations/manage"
                  : "/achievements"
              }
              className="flex items-center gap-1 text-sm font-medium text-rose-500 hover:text-rose-600"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 min-h-[180px] space-y-4">
            {!searchPerformed ? (
              <div
                className={`flex h-40 flex-col items-center justify-center gap-2 rounded-2xl text-center ${emptyStateClass}`}
              >
                <p className="text-sm font-medium">
                  Mulai pencarian untuk menampilkan hasil terbaru.
                </p>
                <p className="text-xs text-gray-400">
                  Gunakan kombinasi nama dan kelas agar hasil lebih spesifik.
                </p>
              </div>
            ) : filteredResults.length ? (
              filteredResults.slice(0, 6).map((item) => {
                if (activeTab === "pelanggaran") {
                  const badgeClass =
                    violationStatusColors[item.status_level || "none"] ||
                    violationStatusColors.none;
                  const isRestricted = Boolean(item.detail_restricted);
                  const latestTitle = item.latest_violation?.jenis
                    || "Belum ada catatan pelanggaran";
                  const latestTime = item.latest_violation?.waktu
                    ? formatViolationTimestamp(item.latest_violation.waktu)
                    : null;

                  return (
                    <div
                      key={item.nis}
                      role={!isRestricted ? "button" : undefined}
                      onClick={!isRestricted ? () => openViolationDetail(item) : undefined}
                      className={`group rounded-lg px-5 py-4 transition hover:-translate-y-0.5 hover:shadow-lg ${
                        isDarkMode
                          ? `${isRestricted ? "border border-slate-800/60 bg-slate-900/40 opacity-75" : "border border-slate-800/60 bg-slate-900/60 hover:border-rose-500/40"}`
                          : `${isRestricted ? "border border-gray-200 bg-white/70 opacity-80" : "border border-gray-100 bg-white hover:border-rose-200"}`
                      }`}
                    >
                      <div className="grid gap-4 md:grid-cols-[1.3fr_1.2fr_auto]">
                        <div className="space-y-1">
                          <p className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}>
                            {item.nama || "Tanpa Nama"}
                          </p>
                          <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                            {(item.kelas || "-").toUpperCase()}
                          </p>
                        </div>
                        <div className={`space-y-2 text-sm ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                          {isRestricted ? (
                            <p className="text-xs italic text-gray-400">
                              Detail pelanggaran tidak tersedia untuk peran Anda.
                            </p>
                          ) : (
                            <>
                              <p className="font-medium">{latestTitle}</p>
                              <p className="text-xs text-gray-400">
                                {latestTime
                                  ? `Terakhir ${latestTime}`
                                  : "Tidak ada pelanggaran aktif"}
                              </p>
                              {item.recommendations &&
                                item.recommendations.length > 0 && (
                                  <p className="text-xs text-gray-400">
                                    {item.recommendations[0]}
                                    {item.recommendations.length > 1 ? " …" : ""}
                                  </p>
                                )}
                            </>
                          )}
                        </div>
                        <div className="flex flex-col items-end justify-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
                          >
                            {item.status_label}
                          </span>
                          {!item.active_counts_hidden && (
                            <div className="flex flex-wrap justify-end gap-2">
                              {["berat", "sedang", "ringan"].map((severity) => {
                                const count = item.active_counts?.[severity] || 0;
                                if (!count) return null;
                                return (
                                  <span
                                    key={`${item.nis}-${severity}`}
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                      violationCountColors[severity]
                                    }`}
                                  >
                                    {count} {severityDisplay[severity]}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {isRestricted && (
                            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                              Ringkasan status saja
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`${item.id}-${item.nis || item.judul}`}
                    className={`grid gap-4 rounded-lg px-5 py-4 transition hover:-translate-y-0.5 hover:shadow-lg md:grid-cols-[1.4fr_1fr_auto] ${isDarkMode ? "border border-slate-800/60 bg-slate-900/60 hover:border-rose-500/40" : "border border-gray-100 hover:border-rose-200"}`}
                  >
                    <div className="space-y-1">
                      <p className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}>
                        {item.nama || "Tanpa Nama"}
                      </p>
                      <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                        {(item.kelas || item.id_kelas || "-").toUpperCase() || "-"}
                      </p>
                    </div>
                    <div className={`space-y-1 text-sm ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                      <p className="font-medium">{item.judul}</p>
                      <p className="text-xs text-gray-400">
                        {`Tanggal ${formatAchievementDate(item.tanggal_prestasi)}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-center gap-2">
                      {(() => {
                        const badgeClass =
                          item.status === "verified"
                            ? (isDarkMode
                                ? "bg-emerald-500/20 text-emerald-200"
                                : "bg-emerald-100 text-emerald-600")
                            : item.status === "rejected"
                            ? (isDarkMode
                                ? "bg-rose-500/20 text-rose-200"
                                : "bg-rose-100 text-rose-600")
                            : isDarkMode
                            ? "bg-amber-500/20 text-amber-200"
                            : "bg-amber-100 text-amber-600";
                        return (
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                            {(item.status || "-")
                              .toString()
                              .replace(/_/g, " ")
                              .toUpperCase()}
                          </span>
                        );
                      })()}
                      <span className="text-sm font-semibold text-rose-500">
                        {item.poin} poin
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                className={`flex h-40 flex-col items-center justify-center gap-2 rounded-lg text-center ${warningEmptyStateClass}`}
              >
                <AlertCircle className="h-6 w-6 text-rose-400" />
                <p className="text-sm font-medium text-rose-600">
                  Tidak ditemukan hasil sesuai pencarian Anda.
                </p>
                <p className="text-xs text-rose-400">
                  Coba gunakan kata kunci lain atau periksa kembali nama serta
                  kelas.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className={cardSurfaceClass}>
          <div className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 ${isDarkMode ? "border-slate-800" : "border-gray-100"}`}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-400">
                Grafik
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-gray-900">
                {activeTab === "pelanggaran"
                  ? "Grafik Pelanggaran"
                  : "Grafik Prestasi"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === "pelanggaran"
                  ? "Jumlah pelanggaran per hari sepanjang bulan berjalan."
                  : "Jumlah prestasi yang tercatat berdasarkan tanggal."}
              </p>
            </div>
          </div>

          <div className="mt-10">
            {loadingStats ? (
              <div
                className={`flex h-60 flex-col items-center justify-center gap-3 rounded-lg text-center ${emptyStateClass}`}
              >
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
                <p className="text-sm font-medium">Memuat data grafik...</p>
              </div>
            ) : chartSeries.length ? (
              <div className="relative">
                <div className={`absolute bottom-10 left-0 right-0 h-px ${isDarkMode ? "bg-slate-800/80" : "bg-gray-200"}`} />
                <div className="flex h-72 items-end justify-center gap-3 overflow-x-auto pb-6 md:justify-start">
                  {chartSeries.map(({ label, value }, index) => {
                    const numericValue = Number(value) || 0;
                    const percentage =
                      numericValue > 0
                        ? (numericValue / maxChartValue) * 100
                        : 0;
                    const gradient =
                      CHART_GRADIENTS[index % CHART_GRADIENTS.length];

                    return (
                      <div
                        key={`${label}-${index}`}
                        className="flex min-w-[40px] flex-none flex-col items-center gap-1 self-stretch"
                      >
                        {numericValue > 0 && (
                          <span className="text-xs font-semibold leading-none text-gray-700">
                            {numericValue}
                          </span>
                        )}
                        <div className="flex w-full flex-1 items-end justify-center">
                          <div
                            className={`w-full max-w-[30px] rounded-md bg-gradient-to-t ${gradient}`}
                            style={{ height: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                className={`flex h-60 flex-col items-center justify-center gap-3 rounded-lg text-center ${emptyStateClass}`}
              >
                <p className="text-sm font-medium">
                  Grafik belum memiliki data yang cukup.
                </p>
                <p className="text-xs text-gray-400">
                  Tambahkan data baru untuk melihat perkembangan secara visual.
                </p>
                <div className="mt-2 text-xs text-gray-400">
                  Debug: chartSeries length = {chartSeries.length},
                  violationChartData length = {violationChartData.length},
                  achievementChartData length = {achievementChartData.length}
                </div>
              </div>
            )}
          </div>
        </div>

        {isDetailDialogOpen && selectedStudentSummary && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
            onClick={closeViolationDetail}
          >
            <div
              className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeViolationDetail}
                className={`absolute right-4 top-4 rounded-full p-2 transition ${isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"}`}
                aria-label="Tutup detail pelanggaran"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="max-h-[80vh] overflow-y-auto px-6 py-8 md:px-10">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-400">
                      Siswa
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-gray-900 md:text-3xl">
                      {selectedStudentSummary.nama}
                    </h2>
                    <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                      {(selectedStudentSummary.kelas || "-").toUpperCase()} · NIS {selectedStudentSummary.nis}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                        violationStatusColors[selectedStudentSummary.status_level || "none"] ||
                        violationStatusColors.none
                      }`}
                    >
                      {selectedStudentSummary.status_label}
                    </span>
                    {selectedStudentSummary.latest_violation?.waktu && (
                      <span className="text-xs text-gray-400">
                        Terakhir tercatat {formatViolationTimestamp(selectedStudentSummary.latest_violation.waktu)}
                      </span>
                    )}
                  </div>
                </div>

                {!selectedStudentSummary.active_counts_hidden ? (
                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {["ringan", "sedang", "berat"].map((severity) => (
                      <div
                        key={`summary-${severity}`}
                        className={`rounded-2xl px-4 py-3 ${neutralPanelClass}`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
                          Pelanggaran {severityDisplay[severity]}
                        </p>
                        <p className={`mt-1 text-2xl font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}>
                          {selectedStudentSummary.active_counts?.[severity] || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`mt-6 rounded-2xl px-4 py-3 text-sm ${emptyStateClass}`}
                  >
                    Detail pelanggaran dibatasi untuk peran Anda.
                  </div>
                )}

                {selectedStudentSummary.recommendations &&
                  selectedStudentSummary.recommendations.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-400">
                        Rekomendasi Pembinaan
                      </h3>
                      <ul className="mt-3 space-y-2 text-sm text-gray-600">
                        {selectedStudentSummary.recommendations.map((note, index) => (
                          <li key={`rec-${index}`} className="flex items-start gap-2">
                            <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                <div className="mt-8">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-400">
                    Riwayat Pelanggaran
                  </h3>
                  <div className="mt-3 max-h-[320px] space-y-3 overflow-y-auto pr-1">
                    {selectedStudentSummary.violations && selectedStudentSummary.violations.length > 0 ? (
                      selectedStudentSummary.violations.map((violation) => {
                        const severity = violation.kategori || "ringan";
                        const violationTime = violation.waktu || violation.created_at;
                        const statusClass = violation.is_resolved
                          ? resolvedBadgeClass
                          : activeBadgeClass;
                        return (
                          <div
                            key={violation.id}
                            className={`rounded-2xl border px-4 py-3 transition ${
                              violation.is_resolved ? resolvedCardClass : activeCardClass
                            }`}
                          >
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div className={`flex items-center gap-2 text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    violationCountColors[severity] || violationCountColors.ringan
                                  }`}
                                >
                                  {severityDisplay[severity] || severity}
                                </span>
                                <span>{violation.jenis}</span>
                              </div>
                              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${statusClass}`}>
                                {violation.is_resolved ? "Selesai" : "Aktif"}
                              </span>
                            </div>
                            <div className={`mt-2 flex flex-wrap items-center gap-4 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                              {violationTime && (
                                <span className="flex items-center gap-1">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {formatViolationTimestamp(violationTime)}
                                </span>
                              )}
                              {violation.tempat && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {violation.tempat}
                                </span>
                              )}
                            </div>
                            {violation.detail && (
                              <p className="mt-2 text-sm text-gray-600">{violation.detail}</p>
                            )}
                            {violation.catatan_pembinaan && (
                              <p className="mt-2 text-xs text-emerald-600">
                                Catatan Pembinaan: {violation.catatan_pembinaan}
                              </p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div
                        className={`rounded-2xl px-4 py-6 text-center text-sm ${emptyStateClass}`}
                      >
                        Belum ada riwayat pelanggaran.
                      </div>
                    )}
                  </div>
                </div>

                {selectedStudentSummary.can_clear ? (
                  <div className={`mt-8 border-t pt-4 ${isDarkMode ? "border-slate-800" : "border-gray-100"}`}>
                    <h3 className="text-sm font-semibold text-gray-700">
                      Catatan Pembinaan
                    </h3>
                    <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                      Gunakan pembinaan untuk mengosongkan status pelanggaran aktif siswa ini setelah tindak lanjut dilakukan.
                    </p>
                    <textarea
                      value={counselingNote}
                      onChange={(event) => setCounselingNote(event.target.value)}
                      placeholder="Catatan pembinaan (opsional)"
                      rows={3}
                      className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-rose-400 focus:outline-none"
                    />
                    {detailError && (
                      <p className="mt-2 text-xs text-rose-500">{detailError}</p>
                    )}
                    <div className="mt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={closeViolationDetail}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${isDarkMode ? "border-slate-700 text-slate-200 hover:border-slate-600 hover:text-slate-50" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800"}`}
                      >
                        Tutup
                      </button>
                      <button
                        type="button"
                        onClick={applyCounseling}
                        disabled={isCounselingLoading}
                        className={`rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300 ${
                          isCounselingLoading ? "opacity-70" : ""
                        }`}
                      >
                        {isCounselingLoading ? "Menyimpan..." : "Selesaikan Pembinaan"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
                    Status pelanggaran siswa ini sudah bersih.
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={closeViolationDetail}
                        className="rounded-full border border-emerald-300 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-900"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {canReportViolation && (
          <div
            ref={reportMenuRef}
            className="fixed bottom-8 right-8 z-40 flex items-end gap-4"
          >
            {isReportMenuOpen && (
              <div className="flex flex-col gap-2 rounded-2xl bg-white/95 px-4 py-3 text-sm font-semibold text-gray-700 shadow-2xl shadow-rose-200 ring-1 ring-rose-100 backdrop-blur">
                <Link
                  to="/violations/report"
                  onClick={() => setIsReportMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 transition ${isDarkMode ? "bg-slate-800/70 text-rose-200 hover:bg-slate-700/60" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`}
                >
                  <Flag className="h-4 w-4" />
                  Laporkan Pelanggaran
                </Link>
                <Link
                  to="/achievements/manage"
                  onClick={() => setIsReportMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 transition ${isDarkMode ? "bg-slate-800/70 text-emerald-200 hover:bg-slate-700/60" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}
                >
                  <Trophy className="h-4 w-4" />
                  Laporkan Prestasi
                </Link>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsReportMenuOpen((prev) => !prev)}
              className="flex items-center gap-3 rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-rose-300 transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Plus
                  className={`h-4 w-4 transform transition-transform duration-500 ${
                    isReportMenuOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </span>
              Laporkan
            </button>
          </div>
        )}

        <footer className="rounded-lg bg-gradient-to-r from-rose-600 via-red-600 to-rose-500 p-8 text-white shadow-xl">
          <div className="grid gap-8 text-sm md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
                Alamat
              </p>
              <p className="mt-3 leading-relaxed text-white/90">
                Jl. Medan Merdeka Barat No. 9<br />
                Jakarta Pusat 10110
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
                Telepon
              </p>
              <p className="mt-3 text-white/90">(021) 3504024</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
                Email
              </p>
              <p className="mt-3 text-white/90">pelayanan@mail.komdigi.go.id</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
