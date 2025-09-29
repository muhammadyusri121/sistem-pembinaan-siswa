import React, {
  useState,
  useEffect,
  useMemo,
  useContext,
  useCallback,
  useRef,
} from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { id as localeID } from "date-fns/locale";
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Clock3,
  Search,
  Plus,
} from "lucide-react";
import { AuthContext } from "../App";
import {
  dashboardService,
  studentService,
  masterDataService,
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
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsMap, setStudentsMap] = useState({});
  const [activeTab, setActiveTab] = useState("pelanggaran");
  const [nameInput, setNameInput] = useState("");
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);
  const nameSelectorRef = useRef(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [classOptions, setClassOptions] = useState([]);
  const [studentNameOptions, setStudentNameOptions] = useState([]);

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
    ];
    return allowedRoles.includes(role);
  }, [user?.role]);

  useEffect(() => {
    if (!user) {
      setLoadingStats(false);
      return;
    }

    const fetchDashboardStats = async () => {
      try {
        setLoadingStats(true);
        const response = await dashboardService.getStats();
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        setStats(DEFAULT_STATS);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchDashboardStats();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchStudents = async () => {
      try {
        setLoadingStudents(true);
        const response = await studentService.list();
        const list = Array.isArray(response.data) ? response.data : [];
        const mapping = list.reduce((acc, item) => {
          acc[item.nis] = item;
          return acc;
        }, {});
        setStudentsMap(mapping);
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
      if (nameSelectorRef.current && !nameSelectorRef.current.contains(event.target)) {
        setIsNameDropdownOpen(false);
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

  const violationEntries = useMemo(() => {
    const base = stats?.recent_violation_records ?? [];
    if (!base.length) {
      return (stats?.todays_violations ?? []).map((item) => {
        const student = studentsMap[item.nis] || {};
        return {
          ...item,
          kelas: student.id_kelas || "",
        };
      });
    }

    return base.map((item) => {
      const student = studentsMap[item.nis] || {};
      return {
        ...item,
        kelas: item.kelas || student.id_kelas || "",
      };
    });
  }, [stats?.recent_violation_records, stats?.todays_violations, studentsMap]);

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
      activeTab === "pelanggaran" ? violationEntries : achievementEntries;

    return baseData.filter((item) => {
      const candidateName = (item.nama || "").toLowerCase();
      const candidateClass = (
        item.kelas || item.id_kelas || ""
      ).toLowerCase();

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
    violationEntries,
  ]);

  const handleNameSelect = useCallback((value) => {
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
  }, [nameInput]);

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
      activeTab === "pelanggaran" ? violationEntries : achievementEntries;
    if (baseData.length) {
      const results = filterResults();
      setFilteredResults(results);
      setSearchPerformed(true);
    }
  }, [
    activeTab,
    achievementEntries,
    filterResults,
    violationEntries,
  ]);

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
      const trimmed = source.slice(Math.max(source.length - 12, 0));
      return trimmed.map((item) => {
        let label = item.label ?? "";
        if (item.date) {
          try {
            label = format(parseISO(item.date), "dd MMM", { locale: localeID });
          } catch (error) {
            label = item.label ?? "";
          }
        }
        return {
          label,
          value: item.count ?? 0,
        };
      });
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

    const orderedKeys = Object.keys(aggregatedMap)
      .sort()
      .slice(-12);

    return orderedKeys.map((key) => {
      let label = key;
      try {
        label = format(parseISO(key), "dd MMM", { locale: localeID });
      } catch (error) {
        label = key;
      }
      return { label, value: aggregatedMap[key] };
    });
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
      const trimmed = source.slice(Math.max(source.length - 12, 0));
      return trimmed.map((item) => {
        let label = item.label ?? "";
        if (item.date) {
          try {
            label = format(parseISO(item.date), "dd MMM", { locale: localeID });
          } catch (error) {
            label = item.label ?? "";
          }
        }
        return {
          label,
          value: item.count ?? 0,
        };
      });
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

    const orderedKeys = Object.keys(aggregatedMap)
      .sort()
      .slice(-12);

    return orderedKeys.map((key) => {
      let label = key;
      try {
        label = format(parseISO(key), "dd MMM", { locale: localeID });
      } catch (error) {
        label = key;
      }
      return { label, value: aggregatedMap[key] };
    });
  }, [achievementSummary?.recent_achievements, stats?.monthly_achievement_chart]);

  const chartSeries = useMemo(
    () =>
      activeTab === "pelanggaran" ? violationChartData : achievementChartData,
    [activeTab, achievementChartData, violationChartData]
  );

  const maxChartValue = useMemo(() => {
    if (!chartSeries.length) return 1;
    return Math.max(
      ...chartSeries.map((item) => Number(item.value) || 0),
      1
    );
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

  const formatClock = (isoString) => {
    if (!isoString) return "-";
    try {
      return format(parseISO(isoString), "HH:mm", { locale: localeID });
    } catch (error) {
      return "-";
    }
  };

  const formatAchievementDate = (value) => {
    if (!value) return "-";
    try {
      return format(parseISO(String(value)), "d MMM yyyy", { locale: localeID });
    } catch (error) {
      return value;
    }
  };

  return (
    <div className="space-y-12 text-gray-900">
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
              <b>{getWelcomeMessage()}, {user?.full_name || "Pengguna"}</b>
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
          <div className="rounded-lg bg-white p-8 shadow-xl ring-1 ring-black/5">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Data {activeTab === "pelanggaran" ? "Pelanggaran" : "Prestasi"}
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Cari informasi siswa berdasarkan nama dan kelas untuk melihat catatan terbaru.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("pelanggaran")}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                    activeTab === "pelanggaran"
                      ? "bg-white text-rose-600 shadow"
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
                      ? "bg-white text-rose-600 shadow"
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
                          className="flex w-full items-center justify-between px-4 py-2 text-sm text-gray-700 transition hover:bg-rose-50"
                        >
                          <span>{option}</span>
                          <span className="text-xs text-gray-400">Tambahkan</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Ketik minimal 3 huruf, gunakan koma untuk menambahkan lebih dari satu nama.
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
        <div className="rounded-lg bg-white p-8 shadow-xl ring-1 ring-black/5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3 text-lg font-semibold text-gray-800">
              <span className="text-gray-400">"Result"</span>
            </div>
            <Link
              to={activeTab === "pelanggaran" ? "/violations/manage" : "/achievements"}
              className="flex items-center gap-1 text-sm font-medium text-rose-500 hover:text-rose-600"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 min-h-[180px] space-y-4">
            {!searchPerformed ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 text-center text-gray-500">
                <p className="text-sm font-medium">
                  Mulai pencarian untuk menampilkan hasil terbaru.
                </p>
                <p className="text-xs text-gray-400">
                  Gunakan kombinasi nama dan kelas agar hasil lebih spesifik.
                </p>
              </div>
            ) : filteredResults.length ? (
              filteredResults.slice(0, 6).map((item) => (
                <div
                  key={`${item.id}-${item.nis || item.judul}`}
                  className="grid gap-4 rounded-lg border border-gray-100 px-5 py-4 transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-lg md:grid-cols-[1.4fr_1fr_auto]"
                >
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-gray-900">
                      {item.nama || "Tanpa Nama"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(item.kelas || item.id_kelas || "-").toUpperCase() || "-"}
                    </p>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p className="font-medium">
                      {activeTab === "pelanggaran"
                        ? item.pelanggaran
                        : item.judul}
                    </p>
                    <p className="text-xs text-gray-400">
                      {activeTab === "pelanggaran"
                        ? `Dilaporkan ${formatClock(item.waktu)}`
                        : `Tanggal ${formatAchievementDate(item.tanggal_prestasi)}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        activeTab === "pelanggaran"
                          ? item.status === "resolved"
                            ? "bg-emerald-100 text-emerald-600"
                            : item.status === "processed"
                            ? "bg-amber-100 text-amber-600"
                            : "bg-rose-100 text-rose-600"
                          : item.status === "verified"
                          ? "bg-emerald-100 text-emerald-600"
                          : item.status === "rejected"
                          ? "bg-rose-100 text-rose-600"
                          : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      {(item.status || "-" )
                        .toString()
                        .replace(/_/g, " ")
                        .toUpperCase()}
                    </span>
                    {activeTab === "prestasi" ? (
                      <span className="text-sm font-semibold text-rose-500">
                        {item.poin} poin
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {item.tempat || "-"}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-rose-200 bg-rose-50/40 text-center">
                <AlertCircle className="h-6 w-6 text-rose-400" />
                <p className="text-sm font-medium text-rose-600">
                  Tidak ditemukan hasil sesuai pencarian Anda.
                </p>
                <p className="text-xs text-rose-400">
                  Coba gunakan kata kunci lain atau periksa kembali nama serta kelas.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-xl ring-1 ring-black/5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
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
            {chartSeries.length ? (
              <div className="relative">
                <div className="absolute bottom-10 left-0 right-0 h-px bg-gray-200" />
                <div className="flex h-72 items-end gap-6 overflow-x-auto pb-6">
                  {chartSeries.map(({ label, value }, index) => {
                    const percentage = Math.max(
                      (Number(value) / maxChartValue) * 100,
                      8
                    );
                    const gradient = CHART_GRADIENTS[index % CHART_GRADIENTS.length];

                    return (
                      <div
                        key={`${label}-${index}`}
                        className="flex min-w-[72px] flex-1 flex-col items-center gap-4"
                      >
                        <div className="flex h-full w-full items-end justify-center">
                          <div
                            className={`relative flex w-full max-w-[80px] items-end justify-center overflow-hidden rounded-2xl bg-gradient-to-t ${gradient}`}
                            style={{ height: `${percentage}%` }}
                          >
                            <span className="absolute -top-9 text-sm font-semibold text-gray-600">
                              {value}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-60 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 text-center text-gray-500">
                <p className="text-sm font-medium">
                  Grafik belum memiliki data yang cukup.
                </p>
                <p className="text-xs text-gray-400">
                  Tambahkan data baru untuk melihat perkembangan secara visual.
                </p>
              </div>
            )}
      </div>
    </div>

      {canReportViolation && (
        <Link
          to="/violations/report"
          className="fixed bottom-8 right-8 z-40 flex items-center gap-3 rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-rose-300 transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <Plus className="h-4 w-4" />
          </span>
          Laporkan Pelanggaran
        </Link>
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
