// Komponen Dashboard menggunakan berbagai hook untuk mengelola data dan UI dinamis
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
import { format, parseISO, subDays } from "date-fns";
import { id as localeID } from "date-fns/locale";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Clock3,
  GraduationCap,
  ListChecks,
  Mail,
  Phone,
  Facebook,
  Instagram,
  Globe,
  Pause,
  Play,
  Search,
  Sparkles,
  Plus,
  Flag,
  Trophy,
  X,
  MapPin,
  Volume2,
  VolumeX,
  UserCircle,
} from "lucide-react";
import { AuthContext } from "../App";
import {
  dashboardService,
  studentService,
  masterDataService,
  violationService,
} from "../services/api";

const HERO_DESCRIPTION =
  // Deskripsi singkat yang tampil pada hero section halaman dashboard
  "Sistem ini dirancang untuk meminimalisir tingkat pelanggaran siswa, juga memudahkan guru akan menindak siswa yang melakukan pelanggaran secara realtime.";



const DEFAULT_HERO_MEDIA = [
  // Media default (video dan gambar) untuk carousel hero ketika tidak ada data kustom
  {
    type: "video",
    src: "/media/hero/hero-intro.mp4",
    poster: "/media/hero/hero-intro.jpg",
    alt: "Video profil disiplin positif",
  },
  {
    type: "image",
    src: "/media/hero/hero-image-1.jpg",
    alt: "Kegiatan belajar mengajar",
  },
  {
    type: "image",
    src: "/media/hero/hero-image-2.jpg",
    alt: "Fasilitas sekolah",
  },
];

const simplifyLabel = (raw) => {
  // Utility untuk memotong label kategori menjadi angka saja jika memungkinkan
  if (raw === null || raw === undefined) return "";
  const text = raw.toString().trim();
  if (!text) return "";
  const match = text.match(/\d+/);
  return match ? match[0] : text;
};

const DEFAULT_STATS = {
  // Nilai default agar antarmuka tidak error saat data dashboard belum berhasil dimuat
  total_siswa: 0,
  total_pelanggaran: 0,
  total_users: 0,
  total_kelas: 0,
  recent_violations: [],
  monthly_violation_chart: [],
  monthly_achievement_chart: [],
  todays_violations: [],
  recent_violation_records: [],
  recent_violations: [],
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

const LineChart = ({
  data,
  displayMaxValue,
  chartTicks,
  chartReferenceLines,
  isDarkMode,
  activeTab,
  activeBarKey,
  setActiveBarKey,
}) => {
  if (!data.length) return null;

  const scrollRef = useRef(null);

  const svgWidth = Math.max(data.length * 64, 720);
  const svgHeight = 320;
  const paddingX = 32;
  const paddingY = 32;
  const innerWidth = svgWidth - paddingX * 2;
  const innerHeight = svgHeight - paddingY * 2;
  const yAxisWidth = 64;
  const lineColorClass =
    activeTab === "pelanggaran"
      ? "text-rose-500 dark:text-rose-300"
      : "text-emerald-500 dark:text-emerald-300";

  const points = data.map((item, index) => {
    const x =
      paddingX +
      (data.length === 1
        ? innerWidth / 2
        : (index / Math.max(data.length - 1, 1)) * innerWidth);
    const value = Number(item.value) || 0;
    const y =
      paddingY +
      innerHeight -
      (value / Math.max(displayMaxValue, 1)) * innerHeight;
    return {
      x,
      y,
      label: item.label,
      value,
    };
  });

  const pathD = points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    )
    .join(" ");

  const activeIndex = Number.isInteger(activeBarKey) ? activeBarKey : null;
  const activePoint =
    activeIndex !== null && points[activeIndex] ? points[activeIndex] : null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data.length]);

  const getYPosition = (value) =>
    paddingY +
    innerHeight -
    (value / Math.max(displayMaxValue, 1)) * innerHeight;

  return (
    <div className="flex items-start gap-2">
      <div
        className="relative flex-none"
        style={{ width: `${yAxisWidth}px`, height: `${svgHeight}px` }}
      >
        {chartTicks.map((tick) => {
          const y = getYPosition(tick);
          const clamped = Math.max(0, Math.min(svgHeight - 10, y - 6));
          return (
            <div
              key={`axis-${tick}`}
              className="absolute right-2 text-[10px] font-semibold"
              style={{ top: `${clamped}px` }}
            >
              <span className={isDarkMode ? "text-slate-400" : "text-gray-500"}>
                {tick}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="relative overflow-x-auto"
        ref={scrollRef}
        onMouseLeave={() => setActiveBarKey(null)}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className={`${lineColorClass}`}
          style={{
            minWidth: `${svgWidth}px`,
            width: `${svgWidth}px`,
            height: `${svgHeight}px`,
          }}
          role="img"
          aria-label="Grafik tren"
        >
        <rect
          x="0"
          y="0"
          width={svgWidth}
          height={svgHeight}
          className={isDarkMode ? "fill-slate-900" : "fill-white"}
        />
        {chartReferenceLines.map((line, index) => {
          const y = getYPosition(line.value);
          return (
            <g key={`ref-${index}`}>
              <line
                x1={paddingX}
                x2={svgWidth - paddingX}
                y1={y}
                y2={y}
                className={line.className.replace("border-t ", "")}
                strokeWidth={line.className.includes("border-") ? 1 : 0.5}
              />
            </g>
          );
        })}
        {chartTicks.map((tick) => {
          const y = getYPosition(tick);
          return (
            <g key={`tick-${tick}`}>
              <line
                x1={paddingX}
                x2={svgWidth - paddingX}
                y1={y}
                y2={y}
                className={isDarkMode ? "stroke-slate-800/60" : "stroke-gray-200"}
                strokeWidth="0.5"
              />
              <text
                x={8}
                y={y + 4}
                className={`text-[10px] ${
                  isDarkMode ? "fill-slate-400" : "fill-gray-500"
                }`}
              >
                {tick}
              </text>
            </g>
          );
        })}

        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={5}
              className="fill-current cursor-pointer"
              onMouseEnter={() => setActiveBarKey(index)}
              onMouseLeave={() => setActiveBarKey(null)}
            />
            <text
              x={point.x}
              y={svgHeight - paddingY / 2}
              className={`text-[10px] font-semibold uppercase tracking-wide text-center ${
                isDarkMode ? "fill-slate-400" : "fill-gray-500"
              }`}
              textAnchor="middle"
            >
              {point.label}
            </text>
            {activePoint && activePoint.x === point.x && activePoint.y === point.y && (
              <text
                x={point.x + 10}
                y={point.y - 10}
                className={`text-[11px] font-semibold ${
                  isDarkMode ? "fill-slate-100" : "fill-gray-900"
                }`}
              >
                {point.value}
              </text>
            )}
          </g>
        ))}
      </svg>

      {activePoint && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-[10px] border border-gray-200 bg-white px-3 py-2 text-xs font-semibold shadow-lg dark:border-slate-800 dark:bg-slate-900"
          style={{
            left: `${(activePoint.x / svgWidth) * 100}%`,
            top: `${activePoint.y}px`,
          }}
        >
          <div
            className={`text-[11px] font-semibold ${
              isDarkMode ? "text-slate-400" : "text-gray-500"
            }`}
          >
            {activePoint.label}
          </div>
          <div
            className={`text-sm ${
              isDarkMode ? "text-slate-100" : "text-gray-900"
            }`}
          >
            {activePoint.value}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  // Mengambil data user dan modus tampilan dari konteks autentikasi
  const { user, isDarkMode } = useContext(AuthContext);
  // State utama untuk statistik, filter pencarian, serta dialog detail siswa
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
  const [counselingStatus, setCounselingStatus] = useState("processed");
  const [isCounselingLoading, setIsCounselingLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [activeBarKey, setActiveBarKey] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [classOptions, setClassOptions] = useState([]);
  const [studentNameOptions, setStudentNameOptions] = useState([]);
  // Data media hero dan kontrol video untuk bagian header interaktif
  const heroMedia = useMemo(() => DEFAULT_HERO_MEDIA, []);
  const totalHeroMedia = heroMedia.length || 1;
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const videoRef = useRef(null);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [hasAutoplayedHeroVideo, setHasAutoplayedHeroVideo] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  // Handler navigasi media hero (next/prev/dot) agar carousel dapat dikendalikan pengguna
  const handleNextHero = useCallback(() => {
    setActiveHeroIndex((prev) => (prev + 1) % totalHeroMedia);
  }, [totalHeroMedia]);

  const handlePrevHero = useCallback(() => {
    setActiveHeroIndex((prev) => (prev - 1 + totalHeroMedia) % totalHeroMedia);
  }, [totalHeroMedia]);

  const handleHeroDotClick = useCallback(
    (index) => {
      if (index >= 0 && index < totalHeroMedia) {
        setActiveHeroIndex(index);
      }
    },
    [totalHeroMedia]
  );

  const handleVideoEnded = useCallback(() => {
    setActiveHeroIndex((prev) => (prev + 1) % totalHeroMedia);
  }, [totalHeroMedia]);

  const toggleVideoPlayback = useCallback(() => {
    // Mengatur play/pause video hero sesuai interaksi pengguna
    const currentItem = heroMedia[activeHeroIndex];
    if (currentItem?.type !== "video") {
      return;
    }

    const videoElement = videoRef.current;
    setIsVideoPlaying((prev) => {
      const next = !prev;
      if (videoElement) {
        if (next) {
          const playPromise = videoElement.play();
          if (playPromise && playPromise.catch) {
            playPromise.catch(() => {
              setIsVideoPlaying(false);
            });
          }
        } else {
          videoElement.pause();
        }
      }
      return next;
    });
  }, [activeHeroIndex, heroMedia]);

  const toggleVideoMute = useCallback(() => {
    // Mengaktifkan atau menonaktifkan suara video hero
    const currentItem = heroMedia[activeHeroIndex];
    if (currentItem?.type !== "video") {
      return;
    }

    const videoElement = videoRef.current;
    setIsVideoMuted((prev) => {
      const next = !prev;
      if (videoElement) {
        videoElement.muted = next;
      }
      return next;
    });
  }, [activeHeroIndex, heroMedia]);

  // Mengatur autoplay untuk gambar hero agar berganti otomatis setelah durasi tertentu
  // Memuat daftar siswa saat user masuk guna mendukung autofill nama
  useEffect(() => {
    const currentItem = heroMedia[activeHeroIndex];
    let timer;
    if (currentItem?.type === "image") {
      timer = setTimeout(() => {
        setActiveHeroIndex((prev) => (prev + 1) % totalHeroMedia);
      }, currentItem.duration || 7000);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [activeHeroIndex, heroMedia, totalHeroMedia]);

  // Menjaga sinkronisasi status video ketika slide hero berubah
  // Menampilkan waktu realtime di header dashboard
  useEffect(() => {
    const currentItem = heroMedia[activeHeroIndex];
    const videoElement = videoRef.current;

    if (currentItem?.type === "video") {
      setIsVideoMuted(true);

      if (videoElement) {
        videoElement.currentTime = 0;
      }

      if (!hasAutoplayedHeroVideo) {
        setIsVideoPlaying(true);
        setHasAutoplayedHeroVideo(true);
      } else {
        setIsVideoPlaying(false);
        if (videoElement) {
          videoElement.pause();
        }
      }
    } else if (videoElement) {
      videoElement.pause();
    }
  }, [activeHeroIndex, heroMedia, hasAutoplayedHeroVideo]);

  // Sinkronisasi mute/play video berdasarkan interaksi pengguna
  // Mengambil data kelas untuk filter dropdown jika user sudah login
  useEffect(() => {
    const currentItem = heroMedia[activeHeroIndex];
    const videoElement = videoRef.current;

    if (!videoElement || currentItem?.type !== "video") {
      return;
    }

    videoElement.muted = isVideoMuted;

    if (isVideoPlaying) {
      const playPromise = videoElement.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(() => {
          setIsVideoPlaying(false);
        });
      }
    } else {
      videoElement.pause();
    }
  }, [activeHeroIndex, heroMedia, isVideoMuted, isVideoPlaying]);

  // Mendeteksi perubahan ukuran layar untuk menyesuaikan layout komponen
  // Menutup dropdown pencarian dan menu laporan bila klik di luar area
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const handleChange = (event) => {
      setIsMobileView(event.matches);
    };
    setIsMobileView(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const ChartIconComponent =
    activeTab === "pelanggaran" ? AlertTriangle : Sparkles;
  const activeHeroItem = heroMedia[activeHeroIndex];
  const isActiveHeroVideo = activeHeroItem?.type === "video";

  const pageBackgroundClass = useMemo(
    () =>
      // Menentukan warna latar belakang page sesuai tema dark/light
      isDarkMode
        ? "bg-slate-950 text-slate-100"
        : "bg-rose-50/80 text-gray-900",
    [isDarkMode]
  );

  const cardSurfaceClass = useMemo(
    () =>
      // Styling generik untuk permukaan kartu statistik agar konsisten di seluruh section
      isDarkMode
        ? "rounded-[8px] border border-slate-800/60 bg-slate-900/70 p-8 shadow-xl shadow-black/40 ring-1 ring-slate-700/60 backdrop-blur-sm"
        : "rounded-[8px] bg-white/95 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur-sm",
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

  const processedBadgeClass = isDarkMode
    ? "bg-amber-500/20 text-amber-200"
    : "bg-amber-100 text-amber-600";

  const violationProgressDisplay = useMemo(
    () => ({
      reported: "Dilaporkan",
      processed: "Diproses",
      resolved: "Selesai",
    }),
    []
  );

  const violationProgressBadgeClasses = {
    reported: activeBadgeClass,
    processed: processedBadgeClass,
    resolved: resolvedBadgeClass,
  };

  const violationStatusColors = useMemo(
    // Palet warna status pelanggaran menyesuaikan tema agar indikator mudah dibaca
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
    // Variasi warna untuk ringkasan jumlah pelanggaran per tingkat
    () =>
      isDarkMode
        ? {
            ringan: "border border-amber-500/30 bg-amber-500/10 text-amber-200",
            sedang:
              "border border-orange-500/30 bg-orange-500/10 text-orange-200",
            berat: "border border-rose-500/30 bg-rose-500/10 text-rose-200",
          }
        : {
            ringan: "border border-amber-200 bg-amber-50 text-amber-600",
            sedang: "border border-orange-200 bg-orange-50 text-orange-600",
            berat: "border border-rose-200 bg-rose-50 text-rose-600",
          },
    [isDarkMode]
  );

  const extractResultDate = useCallback(
    // Mengambil tanggal relevan dari item pelanggaran/prestasi untuk kebutuhan sortir
    (item) => {
      if (!item) return null;
      let rawValue;
      if (activeTab === "pelanggaran") {
        rawValue =
          item.latest_violation?.waktu || item.updated_at || item.created_at;
      } else {
        rawValue = item.tanggal_prestasi || item.updated_at || item.created_at;
      }
      if (!rawValue) {
        return null;
      }
      try {
        const parsed = parseISO(String(rawValue));
        if (Number.isNaN(parsed.getTime())) {
          throw new Error("Invalid date");
        }
        return parsed;
      } catch (error) {
        const fallback = new Date(rawValue);
        return Number.isNaN(fallback.getTime()) ? null : fallback;
      }
    },
    [activeTab]
  );

  const filteredResultsForDisplay = useMemo(() => {
    // Membatasi hasil pencarian agar sesuai konteks perangkat (mobile/desktop)
    if (!Array.isArray(filteredResults) || filteredResults.length === 0) {
      return [];
    }

    const limit = isMobileView ? 3 : 7;
    let scopedResults = filteredResults;

    if (!isMobileView) {
      const cutoff = subDays(new Date(), 7);
      scopedResults = filteredResults.filter((item) => {
        const date = extractResultDate(item);
        return date ? date >= cutoff : false;
      });
    }

    return scopedResults.slice(0, limit);
  }, [filteredResults, extractResultDate, isMobileView]);

  const formatRecommendationSnippet = useCallback((text) => {
    // Membersihkan prefix rekomendasi agar pesan yang tampil ringkas
    if (!text) return "";
    const trimmed = text.trim();
    const withoutSpecificPrefix = trimmed.replace(
      /^Kurang dari 3x pelanggaran sedang:\s*/i,
      ""
    );
    const withoutGenericPrefix = withoutSpecificPrefix.replace(
      /^Kurang dari[^:]*:\s*/i,
      ""
    );
    return withoutGenericPrefix.trim() || trimmed;
  }, []);

  const achievementSummary =
    stats?.prestasi_summary ?? DEFAULT_STATS.prestasi_summary;

  const canReportViolation = useMemo(() => {
    // Menentukan apakah role user berhak membuat laporan pelanggaran
    const role = user?.role;
    const allowedRoles = [
      "guru_umum",
      "wali_kelas",
      "guru_bk",
      "admin",
      "kepala_sekolah",
    ];
    return allowedRoles.includes(role);
  }, [user?.role]);

  const fetchDashboardStats = useCallback(async () => {
    // Mengambil data statistik utama dashboard dari API backend
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

  // Memuat statistik dashboard saat komponen siap atau user berubah
  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Mengambil daftar siswa untuk fitur pencarian bila user sudah login
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
    // Memecah input nama menjadi token individual untuk mendukung multi pencarian
    () =>
      nameInput
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean),
    [nameInput]
  );

  const currentNameQuery = useMemo(() => {
    // Mengambil token terakhir yang sedang diketik guna menampilkan saran nama
    const parts = nameInput.split(",");
    const last = parts[parts.length - 1] ?? "";
    return last.trim();
  }, [nameInput]);

  const filteredNameOptions = useMemo(() => {
    // Menyaring saran nama berdasarkan token terakhir dan menghindari duplikasi
    const normalizedQuery = currentNameQuery.toLowerCase();
    if (normalizedQuery.length < 3) {
      return [];
    }
    return studentNameOptions
      .filter((option) => option.toLowerCase().includes(normalizedQuery))
      .filter((option) => !nameTokens.includes(option))
      .slice(0, 8);
  }, [currentNameQuery, nameTokens, studentNameOptions]);

  // Menutup dropdown otomatis jika saran nama kosong
  useEffect(() => {
    if (!filteredNameOptions.length) {
      setIsNameDropdownOpen(false);
    }
  }, [filteredNameOptions.length]);

  const violationSummaries = useMemo(() => {
    // Koleksi ringkasan pelanggaran yang aman dari nilai undefined
    return Array.isArray(stats?.student_violation_summaries)
      ? stats.student_violation_summaries
      : [];
  }, [stats?.student_violation_summaries]);

  const achievementEntries = useMemo(
    // Daftar prestasi terbaru untuk tab prestasi
    () => achievementSummary?.recent_achievements ?? [],
    [achievementSummary]
  );

  const filterResults = useCallback(() => {
    // Memfilter data pelanggaran/prestasi berdasarkan input nama dan kelas
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
    // Menambahkan nama yang dipilih ke input multi-pencarian tanpa duplikasi
    (value) => {
      if (!value) return;

      const normalizedValue = value.trim();
      setNameInput((prev) => {
        const segments = prev.split(",");
        if (segments.length === 0) {
          return normalizedValue;
        }

        segments[segments.length - 1] = ` ${normalizedValue}`;

        const cleaned = segments
          .map((segment) => segment.trim())
          .filter(Boolean);

        const unique = [];
        cleaned.forEach((token) => {
          const exists = unique.some(
            (existing) => existing.toLowerCase() === token.toLowerCase()
          );
          if (!exists) {
            unique.push(token);
          }
        });

        return unique.join(", ");
      });

      setSearchPerformed(false);
      setIsNameDropdownOpen(false);
    },
    []
  );

  const openViolationDetail = useCallback((summary) => {
    // Membuka dialog detail pelanggaran sekaligus reset field pembinaan
    if (!summary || summary.detail_restricted) return;
    setSelectedStudentSummary(summary);
    setCounselingNote("");
    setCounselingStatus("processed");
    setDetailError("");
    setIsDetailDialogOpen(true);
  }, []);

  const closeViolationDetail = useCallback(() => {
    // Menutup dialog detail serta membersihkan state terkait
    setIsDetailDialogOpen(false);
    setSelectedStudentSummary(null);
    setCounselingNote("");
    setDetailError("");
    setCounselingStatus("processed");
  }, []);

  // Menyinkronkan data detail pelanggaran jika ada pembaruan dari daftar utama
  useEffect(() => {
    if (!isDetailDialogOpen || !selectedStudentSummary) return;
    const updated = violationSummaries.find(
      (item) => item.nis === selectedStudentSummary.nis
    );
    if (updated && updated !== selectedStudentSummary) {
      setSelectedStudentSummary(updated);
      setCounselingStatus("processed");
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
    // Mengirim pembaruan status pembinaan ke server dan memperbarui tampilan lokal
    if (!selectedStudentSummary) return;
    setIsCounselingLoading(true);
    setDetailError("");
    try {
      const payload = { status: counselingStatus };
      if (counselingNote.trim()) {
        payload.catatan = counselingNote.trim();
      }
      const response = await violationService.applyCounseling(
        selectedStudentSummary.nis,
        payload
      );
      const updatedSummary = response?.data?.summary;
      if (updatedSummary) {
        setSelectedStudentSummary(updatedSummary);
        setCounselingStatus(payload.status);
      }
      const statusLabel =
        violationProgressDisplay[counselingStatus] || "Diproses";
      toast.success(`Status pembinaan diperbarui (${statusLabel})`);
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
  }, [
    counselingNote,
    counselingStatus,
    fetchDashboardStats,
    selectedStudentSummary,
    violationProgressDisplay,
  ]);

  // Refresh hasil filter saat pengguna menekan tombol cari
  useEffect(() => {
    if (searchPerformed) {
      setFilteredResults(filterResults());
    }
  }, [filterResults, searchPerformed]);

  // Reset field pencarian ketika berpindah tab antara pelanggaran dan prestasi
  useEffect(() => {
    setNameInput("");
    setSelectedClass("");
    setSearchPerformed(false);
    setIsNameDropdownOpen(false);
    setFilteredResults([]);
  }, [activeTab]);

  // Jalankan filter awal begitu data tab terisi agar pengguna langsung melihat hasil
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
    // Membentuk dataset grafik pelanggaran dari data bulanan atau catatan terbaru
    const monthlyRaw = stats?.monthly_violation_chart;
    const monthly = Array.isArray(monthlyRaw)
      ? monthlyRaw
      : monthlyRaw && typeof monthlyRaw === "object"
      ? Object.entries(monthlyRaw).map(([key, value]) => ({
          label: key,
          count: value,
          date: key,
        }))
      : [];
    const recentRecordsRaw = stats?.recent_violation_records;
    const recentRecords = Array.isArray(recentRecordsRaw)
      ? recentRecordsRaw
      : [];
    const recentViolationsArray = Array.isArray(stats?.recent_violations)
      ? stats.recent_violations
      : [];
    const recentViolationsCount = Number(stats?.recent_violations || 0);
    let source =
      monthly && monthly.length
        ? monthly
        : [...recentRecords, ...recentViolationsArray];
    if (!source.length) {
      if (recentViolationsCount > 0 || (stats?.total_pelanggaran ?? 0) > 0) {
        const fallbackValue = recentViolationsCount || Number(stats?.total_pelanggaran || 0);
        return [{ label: "Total", value: fallbackValue }];
      }
      return [];
    }

    if (monthly.length) {
      // Use all data, not just the last 12 items
      const chartData = source.map((item) => {
        const rawLabel = item.label ?? item.month ?? item.bulan ?? item.date ?? "";
        let label = rawLabel;
        if (item.date || item.tanggal) {
          const dateValue = item.date || item.tanggal;
          try {
            label = format(parseISO(String(dateValue)), "d", { locale: localeID });
          } catch (error) {
            label = rawLabel;
          }
        }
        const value =
          item.count ??
          item.total ??
          item.jumlah ??
          item.value ??
          item.total_pelanggaran ??
          item.total_violation ??
          0;
        return {
          label: simplifyLabel(label),
          value,
        };
      });
      return chartData;
    }

    const aggregatedMap = source.reduce((acc, item) => {
      // Gunakan waktu kejadian atau created_at sebagai acuan agregasi fallback
      const isoSource =
        item.waktu_kejadian || item.waktu || item.tanggal || item.created_at;
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
  }, [
    stats?.monthly_violation_chart,
    stats?.recent_violation_records,
    stats?.recent_violations,
    stats?.total_pelanggaran,
  ]);

  const achievementChartData = useMemo(() => {
    // Membentuk dataset grafik prestasi dengan fallback ke data terbaru jika bulanan kosong
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
    // Memilih dataset grafik sesuai tab yang sedang aktif
    () =>
      activeTab === "pelanggaran" ? violationChartData : achievementChartData,
    [activeTab, achievementChartData, violationChartData]
  );

  const maxChartValue = useMemo(() => {
    // Mencari nilai tertinggi untuk menyesuaikan skala Y chart
    if (!chartSeries.length) return 1;
    return Math.max(...chartSeries.map((item) => Number(item.value) || 0), 1);
  }, [chartSeries]);

  const displayMaxValue = useMemo(
    // Minimal nilai maksimum chart agar grafik tetap proporsional meski datanya sedikit
    () => (chartSeries.length ? Math.max(maxChartValue, 10) : 10),
    [chartSeries.length, maxChartValue]
  );

  // Reset highlight batang grafik saat tab berubah atau skala berganti
  useEffect(() => {
    setActiveBarKey(null);
  }, [activeTab, displayMaxValue]);

  const chartTicks = useMemo(() => {
    // Sumbu Y fixed: pilih kelipatan yang rapi (10, 20, dst) agar tidak bertumpuk
    if (!displayMaxValue || displayMaxValue <= 0) return [0, 1];

    const targetTicks = 6; // kira-kira jumlah grid
    const rawStep = Math.ceil(displayMaxValue / targetTicks);
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const candidates = [1, 2, 5, 10];
    const step =
      candidates.find((c) => c * magnitude >= rawStep) * magnitude ||
      rawStep ||
      1;

    const maxAligned = Math.ceil(displayMaxValue / step) * step;
    const ticks = [];
    for (let v = 0; v <= maxAligned; v += step) {
      ticks.push(v);
    }
    return ticks;
  }, [displayMaxValue]);

  const chartReferenceLines = useMemo(() => {
    // Garis referensi horizontal pada grafik untuk menandai ambang tertentu
    if (!displayMaxValue || displayMaxValue <= 0) return [];
    return chartTicks
      .filter((value) => value > 0)
      .map((value) => ({
        value,
        percent: Math.min((value / displayMaxValue) * 100, 100),
        className:
          value === 40
            ? "border-red-500 border-dashed"
            : value === 100
            ? "border-emerald-500"
            : isDarkMode
            ? "border-slate-800/60"
            : "border-gray-200/80",
      }));
  }, [chartTicks, displayMaxValue, isDarkMode]);

  const getWelcomeMessage = () => {
    // Menentukan sapaan waktu berdasarkan jam saat ini
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  const formattedToday = useMemo(
    // Format tanggal hari ini agar tampil ramah pengguna
    () =>
      format(currentTime, "EEEE, d MMMM yyyy", {
        locale: localeID,
      }),
    [currentTime]
  );

  const handleSearch = (event) => {
    // Menjalankan proses filter ketika formulir pencarian dikirimkan
    event.preventDefault();
    setSearchPerformed(true);
    setFilteredResults(filterResults());
    setIsNameDropdownOpen(false);
  };

  const formatAchievementDate = (value) => {
    // Mengubah tanggal prestasi ke format singkat, fallback ke nilai asli bila gagal
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
    // Mengubah stempel waktu pelanggaran agar mudah dibaca oleh guru
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
    // Mapping label tingkat pelanggaran ke teks berbahasa Indonesia
    ringan: "Ringan",
    sedang: "Sedang",
    berat: "Berat",
  };
  const hasFilteredResults = filteredResultsForDisplay.length > 0;
  const filteredTimelineMessage = isMobileView
    ? "Belum ada catatan terbaru yang tersimpan."
    : "Tidak ada data dalam 7 hari terakhir.";

  // Render utama dashboard mencakup hero, statistik, grafik, dan daftar detail
  return (
    <div
      className={`space-y-8 sm:space-y-5 min-h-screen ${pageBackgroundClass}`}
    >
      <section className="relative w-full">
        <div className="relative min-h-[340px] overflow-hidden rounded-[8px] pb-20 md:min-h-[440px] md:pb-28">
          <div className="absolute inset-0">
            {heroMedia.map((media, index) => {
              const isActive = index === activeHeroIndex;
              return (
                <div
                  key={`${media.src}-${index}`}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    isActive ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  {media.type === "image" ? (
                    <img
                      src={media.src}
                      alt={media.alt || "Hero"}
                      className="h-full w-full object-cover"
                      loading={isActive ? "eager" : "lazy"}
                    />
                  ) : (
                    <video
                      ref={isActive ? videoRef : null}
                      key={media.src}
                      className="h-full w-full object-cover"
                      src={media.src}
                      poster={media.poster}
                      autoPlay={isActive && isVideoPlaying}
                      muted={isActive ? isVideoMuted : true}
                      playsInline
                      onEnded={handleVideoEnded}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />

          {isActiveHeroVideo && (
            <div className="absolute right-4 top-4 z-30 flex gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={toggleVideoPlayback}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40 text-rose-500 shadow-md shadow-black/20 transition hover:bg-white/70"
                aria-label={isVideoPlaying ? "Jeda video" : "Putar video"}
              >
                {isVideoPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </button>
              <button
                type="button"
                onClick={toggleVideoMute}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40 text-rose-500 shadow-md shadow-black/20 transition hover:bg-white/70"
                aria-label={isVideoMuted ? "Aktifkan suara" : "Bisukan suara"}
              >
                {isVideoMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handlePrevHero}
            className="absolute left-4 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-rose-600 shadow-lg transition hover:bg-white"
            aria-label="Media sebelumnya"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleNextHero}
            className="absolute right-4 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-rose-600 shadow-lg transition hover:bg-white"
            aria-label="Media selanjutnya"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {heroMedia.map((_, index) => (
              <button
                key={`hero-dot-${index}`}
                type="button"
                className={`h-2.5 w-2.5 rounded-full transition ${
                  index === activeHeroIndex
                    ? "bg-white"
                    : "bg-white/40 hover:bg-white/70"
                }`}
                onClick={() => handleHeroDotClick(index)}
                aria-label={`Tampilkan media ke-${index + 1}`}
              />
            ))}
          </div>

          <div className="relative z-20 flex h-full flex-col items-center justify-center px-6 py-16 text-center text-white">
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

        <div className="relative z-20 mx-auto -mt-20 w-full max-w-screen-2xl px-3 sm:-mt-24 sm:px-6">
          <div className={cardSurfaceClass}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 flex h-11 w-11 items-center justify-center rounded-full ${
                    isDarkMode
                      ? "bg-rose-500/15 text-rose-200"
                      : "bg-rose-100 text-rose-600"
                  }`}
                >
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    className={`text-2xl font-semibold ${
                      isDarkMode ? "text-slate-100" : "text-gray-900"
                    }`}
                  >
                    Data{" "}
                    {activeTab === "pelanggaran" ? "Pelanggaran" : "Prestasi"}
                  </h2>
                  <p
                    className={`mt-2 text-sm ${
                      isDarkMode ? "text-slate-400" : "text-gray-500"
                    }`}
                  >
                    Cari informasi siswa berdasarkan nama dan kelas untuk
                    melihat catatan terbaru.
                  </p>
                </div>
              </div>
              <div
                className={`grid w-full grid-cols-2 gap-2 rounded-full p-1 sm:w-auto sm:flex sm:items-center ${
                  isDarkMode ? "bg-slate-800/80" : "bg-gray-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab("pelanggaran")}
                  className={`w-full rounded-full px-5 py-2 text-center text-sm font-medium transition sm:w-auto ${
                    activeTab === "pelanggaran"
                      ? isDarkMode
                        ? "bg-slate-900 text-rose-200 shadow"
                        : "bg-white text-rose-600 shadow"
                      : isDarkMode
                      ? "text-slate-400 hover:text-rose-200"
                      : "text-gray-500 hover:text-rose-500"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Pelanggaran
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("prestasi")}
                  className={`w-full rounded-full px-5 py-2 text-center text-sm font-medium transition sm:w-auto ${
                    activeTab === "prestasi"
                      ? isDarkMode
                        ? "bg-slate-900 text-rose-200 shadow"
                        : "bg-white text-rose-600 shadow"
                      : isDarkMode
                      ? "text-slate-400 hover:text-rose-200"
                      : "text-gray-500 hover:text-rose-500"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Prestasi
                  </div>
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSearch}
              className="mt-8 grid gap-4 md:grid-cols-[1fr_1fr_auto]"
            >
              <div ref={nameSelectorRef} className="relative">
                <label
                  className={`flex items-center gap-2 text-sm font-medium ${
                    isDarkMode ? "text-slate-300" : "text-gray-600"
                  }`}
                >
                  <UserCircle className="h-4 w-4 text-rose-500" />
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
                    placeholder="Masukkan Nama Siswa"
                    className="w-full rounded-full border border-gray-200 px-5 py-2.5 text-sm text-gray-700 focus:border-rose-400 focus:outline-none"
                  />

                  {isNameDropdownOpen && filteredNameOptions.length > 0 && (
                    <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-[8px] border border-rose-100 bg-white shadow-xl">
                      {filteredNameOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleNameSelect(option);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-2 text-sm transition ${
                            isDarkMode
                              ? "text-slate-100 hover:bg-slate-700/60"
                              : "text-gray-700 hover:bg-rose-50"
                          }`}
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
                {/* <p className="mt-2 text-xs text-gray-400">
                  Ketik minimal 3 huruf, gunakan koma untuk menambahkan lebih
                  dari satu nama.
                </p> */}
              </div>
              <div>
                <label
                  className={`flex items-center gap-2 text-sm font-medium ${
                    isDarkMode ? "text-slate-300" : "text-gray-600"
                  }`}
                >
                  <GraduationCap className="h-4 w-4 text-emerald-500" />
                  Kelas
                </label>
                <div className="mt-2 relative">
                  <select
                    value={selectedClass}
                    onChange={(event) => {
                      setSelectedClass(event.target.value);
                      setSearchPerformed(false);
                    }}
                    className="w-full appearance-none rounded-full border border-gray-200 px-5 py-2.5 pr-12 text-sm text-gray-700 focus:border-rose-400 focus:outline-none"
                  >
                    <option value="">Semua kelas</option>
                    {classOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className={`pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 ${
                      isDarkMode ? "text-slate-400" : "text-gray-400"
                    }`}
                  />
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

      <div className="mx-auto mt-16 w-full max-w-screen-2xl space-y-6 px-3 sm:mt-24 sm:space-y-5 sm:px-6">
        <div className={cardSurfaceClass}>
          <div
            className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 ${
              isDarkMode ? "border-slate-800" : "border-gray-100"
            }`}
          >
            <div
              className={`flex items-center gap-3 text-lg font-semibold ${
                isDarkMode ? "text-slate-100" : "text-gray-800"
              }`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  isDarkMode
                    ? "bg-slate-800 text-rose-200"
                    : "bg-rose-100 text-rose-600"
                }`}
              >
                <ListChecks className="h-4 w-4" />
              </div>
              <span>Ringkasan Hasil</span>
            </div>
            <Link
              to={
                activeTab === "pelanggaran"
                  ? "/violations/manage"
                  : "/achievements"
              }
              className="flex items-center gap-1 text-sm font-medium text-rose-500 hover:text-rose-600"
            >
              Lihat Semua
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 min-h-[180px] space-y-4">
            {!searchPerformed ? (
              <div
                className={`flex h-40 flex-col items-center justify-center gap-2 rounded-[8px] text-center ${emptyStateClass}`}
              >
                <p className="text-sm font-medium sm:text-base">
                  Mulai pencarian untuk menampilkan hasil terbaru.
                </p>
                <p className="text-xs text-gray-400 sm:text-sm">
                  Gunakan kombinasi nama dan kelas agar hasil lebih spesifik.
                </p>
              </div>
            ) : hasFilteredResults ? (
              filteredResultsForDisplay.map((item) => {
                if (activeTab === "pelanggaran") {
                  const badgeClass =
                    violationStatusColors[item.status_level || "none"] ||
                    violationStatusColors.none;
                  const isRestricted = Boolean(item.detail_restricted);
                  const latestTitle =
                    item.latest_violation?.jenis ||
                    "Belum ada catatan pelanggaran";
                  const latestTime = item.latest_violation?.waktu
                    ? formatViolationTimestamp(item.latest_violation.waktu)
                    : null;

                  return (
                    <div
                      key={item.nis}
                      role={!isRestricted ? "button" : undefined}
                      onClick={
                        !isRestricted
                          ? () => openViolationDetail(item)
                          : undefined
                      }
                      className={`group rounded-[8px] px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-lg sm:px-5 sm:py-4 ${
                        isDarkMode
                          ? `${
                              isRestricted
                                ? "border border-slate-800/60 bg-slate-900/40 opacity-75"
                                : "border border-slate-800/60 bg-slate-900/60 hover:border-rose-500/40"
                            }`
                          : `${
                              isRestricted
                                ? "border border-gray-200 bg-white/70 opacity-80"
                                : "border border-gray-100 bg-white hover:border-rose-200"
                            }`
                      }`}
                    >
                      <div className="grid gap-4 md:grid-cols-[1.3fr_1.2fr_auto]">
                        <div className="space-y-1">
                          <p
                            className={`text-sm font-semibold sm:text-base ${
                              isDarkMode ? "text-slate-100" : "text-gray-900"
                            }`}
                          >
                            {item.nama || "Tanpa Nama"}
                          </p>
                          <p
                            className={`text-xs sm:text-sm ${
                              isDarkMode ? "text-slate-400" : "text-gray-500"
                            }`}
                          >
                            {(item.kelas || "-").toUpperCase()}
                          </p>
                        </div>
                        <div
                          className={`space-y-2 text-xs sm:text-sm ${
                            isDarkMode ? "text-slate-300" : "text-gray-600"
                          }`}
                        >
                          {isRestricted ? (
                            <p className="text-[11px] italic text-gray-400 sm:text-xs">
                              Detail pelanggaran tidak tersedia untuk peran
                              Anda.
                            </p>
                          ) : (
                            <>
                              <p className="font-medium">{latestTitle}</p>
                              <p className="text-[11px] text-gray-400 sm:text-xs">
                                {latestTime
                                  ? `${latestTime}`
                                  : "Tidak ada pelanggaran aktif"}
                              </p>
                              {item.recommendations &&
                                item.recommendations.length > 0 && (
                                  <p className="text-[11px] text-gray-400 sm:text-xs">
                                    {formatRecommendationSnippet(
                                      item.recommendations[0]
                                    )}
                                    {item.recommendations.length > 1
                                      ? " …"
                                      : ""}
                                  </p>
                                )}
                            </>
                          )}
                        </div>
                        <div className="flex flex-col items-end justify-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold sm:text-xs ${badgeClass}`}
                          >
                            {item.status_label}
                          </span>
                          {!item.active_counts_hidden && (
                            <div className="flex flex-wrap justify-end gap-2">
                              {["berat", "sedang", "ringan"].map((severity) => {
                                const count =
                                  item.active_counts?.[severity] || 0;
                                if (!count) return null;
                                return (
                                  <span
                                    key={`${item.nis}-${severity}`}
                                    className={`rounded-full px-2 py-1 text-[11px] font-semibold sm:px-2.5 sm:text-xs ${violationCountColors[severity]}`}
                                  >
                                    {count} {severityDisplay[severity]}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {isRestricted && (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 sm:text-[11px]">
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
                    className={`grid gap-4 rounded-[8px] px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-lg sm:px-5 sm:py-4 md:grid-cols-[1.4fr_1fr_auto] ${
                      isDarkMode
                        ? "border border-slate-800/60 bg-slate-900/60 hover:border-rose-500/40"
                        : "border border-gray-100 hover:border-rose-200"
                    }`}
                  >
                    <div className="space-y-1">
                      <p
                        className={`text-sm font-semibold sm:text-base ${
                          isDarkMode ? "text-slate-100" : "text-gray-900"
                        }`}
                      >
                        {item.nama || "Tanpa Nama"}
                      </p>
                      <p
                        className={`text-xs sm:text-sm ${
                          isDarkMode ? "text-slate-400" : "text-gray-500"
                        }`}
                      >
                        {(item.kelas || item.id_kelas || "-").toUpperCase() ||
                          "-"}
                      </p>
                    </div>
                    <div
                      className={`space-y-1 text-xs sm:text-sm ${
                        isDarkMode ? "text-slate-300" : "text-gray-600"
                      }`}
                    >
                      <p className="font-medium">{item.judul}</p>
                      <p className="text-[11px] text-gray-400 sm:text-xs">
                        {`Tanggal ${formatAchievementDate(
                          item.tanggal_prestasi
                        )}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-center gap-2">
                      {(() => {
                        const badgeClass =
                          item.status === "verified"
                            ? isDarkMode
                              ? "bg-emerald-500/20 text-emerald-200"
                              : "bg-emerald-100 text-emerald-600"
                            : item.status === "rejected"
                            ? isDarkMode
                              ? "bg-rose-500/20 text-rose-200"
                              : "bg-rose-100 text-rose-600"
                            : isDarkMode
                            ? "bg-amber-500/20 text-amber-200"
                            : "bg-amber-100 text-amber-600";
                        return (
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold sm:text-xs ${badgeClass}`}
                          >
                            {(item.status || "-")
                              .toString()
                              .replace(/_/g, " ")
                              .toUpperCase()}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                );
              })
            ) : filteredResults.length ? (
              <div
                className={`flex h-40 flex-col items-center justify-center gap-2 rounded-[8px] text-center ${emptyStateClass}`}
              >
                <p className="text-sm font-medium sm:text-base">
                  {filteredTimelineMessage}
                </p>
                <p className="text-xs text-gray-400 sm:text-sm">
                  {isMobileView
                    ? "Tambah data baru untuk melihat pembaruan di sini."
                    : "Perbarui catatan agar progres pekan ini dapat dipantau."}
                </p>
              </div>
            ) : (
              <div
                className={`flex h-40 flex-col items-center justify-center gap-2 rounded-[8px] text-center ${warningEmptyStateClass}`}
              >
                <AlertCircle className="h-6 w-6 text-rose-400" />
                <p className="text-sm font-medium text-rose-600 sm:text-base">
                  Tidak ditemukan hasil sesuai pencarian Anda.
                </p>
                <p className="text-xs text-rose-400 sm:text-sm">
                  Coba gunakan kata kunci lain atau periksa kembali nama serta
                  kelas.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className={cardSurfaceClass}>
          <div
            className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 ${
              isDarkMode ? "border-slate-800" : "border-gray-100"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-1 flex h-11 w-11 items-center justify-center rounded-full ${
                  activeTab === "pelanggaran"
                    ? isDarkMode
                      ? "bg-rose-500/15 text-rose-200"
                      : "bg-rose-100 text-rose-600"
                    : isDarkMode
                    ? "bg-emerald-500/15 text-emerald-200"
                    : "bg-emerald-100 text-emerald-600"
                }`}
              >
                <ChartIconComponent className="h-5 w-5" />
              </div>
              <div>
                {/* <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-400">
                  Grafik
                </p> */}
                <h3
                  className={`mt-2 text-2xl font-semibold ${
                    isDarkMode ? "text-slate-100" : "text-gray-900"
                  }`}
                >
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
          </div>

          <div className="mt-10">
            {loadingStats ? (
              <div
                className={`flex h-60 flex-col items-center justify-center gap-3 rounded-[8px] text-center ${emptyStateClass}`}
              >
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
                <p className="text-sm font-medium">Memuat data grafik...</p>
              </div>
            ) : chartSeries.length ? (
              <LineChart
                data={chartSeries}
                displayMaxValue={displayMaxValue}
                chartTicks={chartTicks}
                chartReferenceLines={chartReferenceLines}
                isDarkMode={isDarkMode}
                activeTab={activeTab}
                activeBarKey={activeBarKey}
                setActiveBarKey={setActiveBarKey}
              />
            ) : (
              <div
                className={`flex h-60 flex-col items-center justify-center gap-3 rounded-[8px] text-center ${emptyStateClass}`}
              >
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

        {isDetailDialogOpen && selectedStudentSummary && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
            onClick={closeViolationDetail}
          >
            <div
              className="relative w-full max-w-4xl overflow-hidden rounded-[8px] bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeViolationDetail}
                className={`absolute right-4 top-4 rounded-full p-2 transition ${
                  isDarkMode
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                }`}
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
                    <p
                      className={`mt-1 text-sm ${
                        isDarkMode ? "text-slate-400" : "text-gray-500"
                      }`}
                    >
                      {(selectedStudentSummary.kelas || "-").toUpperCase()} ·
                      NIS {selectedStudentSummary.nis}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                        violationStatusColors[
                          selectedStudentSummary.status_level || "none"
                        ] || violationStatusColors.none
                      }`}
                    >
                      {selectedStudentSummary.status_label}
                    </span>
                    {selectedStudentSummary.latest_violation?.waktu && (
                      <span className="text-xs text-gray-400">
                        Terakhir tercatat{" "}
                        {formatViolationTimestamp(
                          selectedStudentSummary.latest_violation.waktu
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {!selectedStudentSummary.active_counts_hidden ? (
                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {["ringan", "sedang", "berat"].map((severity) => (
                      <div
                        key={`summary-${severity}`}
                        className={`rounded-[8px] px-4 py-3 ${neutralPanelClass}`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
                          Pelanggaran {severityDisplay[severity]}
                        </p>
                        <p
                          className={`mt-1 text-2xl font-semibold ${
                            isDarkMode ? "text-slate-100" : "text-gray-900"
                          }`}
                        >
                          {selectedStudentSummary.active_counts?.[severity] ||
                            0}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`mt-6 rounded-[8px] px-4 py-3 text-sm ${emptyStateClass}`}
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
                        {selectedStudentSummary.recommendations.map(
                          (note, index) => (
                            <li
                              key={`rec-${index}`}
                              className="flex items-start gap-2"
                            >
                              <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                              <span>{note}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                {!isMobileView && (
                  <div className="mt-8">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-400">
                    Riwayat Pelanggaran
                  </h3>
                  <div className="mt-3 max-h-[320px] space-y-3 overflow-y-auto pr-1">
                    {selectedStudentSummary.violations &&
                    selectedStudentSummary.violations.length > 0 ? (
                      selectedStudentSummary.violations.map((violation) => {
                        const severity = violation.kategori || "ringan";
                        const violationTime =
                          violation.waktu || violation.created_at;
                        const statusKey = (
                          violation.status || "reported"
                        ).toLowerCase();
                        const statusDisplay =
                          violation.status_display ||
                          violationProgressDisplay[statusKey] ||
                          statusKey;
                        const statusClass =
                          violationProgressBadgeClasses[statusKey] ||
                          activeBadgeClass;
                        const isResolved =
                          statusKey === "resolved" || violation.is_resolved;
                        return (
                          <div
                            key={violation.id}
                            className={`rounded-[8px] border px-4 py-3 transition ${
                              isResolved ? resolvedCardClass : activeCardClass
                            }`}
                          >
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div
                                className={`flex items-center gap-2 text-sm font-semibold ${
                                  isDarkMode
                                    ? "text-slate-100"
                                    : "text-gray-900"
                                }`}
                              >
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    violationCountColors[severity] ||
                                    violationCountColors.ringan
                                  }`}
                                >
                                  {severityDisplay[severity] || severity}
                                </span>
                                <span>{violation.jenis}</span>
                              </div>
                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${statusClass}`}
                              >
                                {statusDisplay}
                              </span>
                            </div>
                            <div
                              className={`mt-2 flex flex-wrap items-center gap-4 text-xs ${
                                isDarkMode ? "text-slate-400" : "text-gray-500"
                              }`}
                            >
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
                              <p className="mt-2 text-sm text-gray-600">
                                {violation.detail}
                              </p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div
                        className={`rounded-[8px] px-4 py-6 text-center text-sm ${emptyStateClass}`}
                      >
                        Belum ada riwayat pelanggaran.
                      </div>
                    )}
                  </div>
                  </div>
                )}

                {selectedStudentSummary.can_clear ? (
                  <div
                    className={`mt-8 border-t pt-4 ${
                      isDarkMode ? "border-slate-800" : "border-gray-100"
                    }`}
                  >
                    {/* <h3 className="text-sm font-semibold text-gray-700">
                      Catatan Pembinaan
                    </h3>
                    <p
                      className={`mt-1 text-xs ${
                        isDarkMode ? "text-slate-400" : "text-gray-500"
                      }`}
                    >
                      Gunakan pembinaan untuk memperbarui status pelanggaran
                      aktif siswa menjadi diproses atau selesai setelah tindak
                      lanjut dilakukan.
                    </p> */}
                    <div className="mt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={closeViolationDetail}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          isDarkMode
                            ? "border-slate-700 text-slate-200 hover:border-slate-600 hover:text-slate-50"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800"
                        }`}
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 rounded-[8px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
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
              <div className="flex flex-col gap-2 rounded-[8px] bg-white/95 px-4 py-3 text-sm font-semibold text-gray-700 shadow-2xl shadow-rose-200 ring-1 ring-rose-100 backdrop-blur">
                <Link
                  to="/violations/report"
                  onClick={() => setIsReportMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 transition ${
                    isDarkMode
                      ? "bg-slate-800/70 text-rose-200 hover:bg-slate-700/60"
                      : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                  }`}
                >
                  <Flag className="h-4 w-4" />
                  Laporkan Pelanggaran
                </Link>
                <Link
                  to="/achievements/manage"
                  onClick={() => setIsReportMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 transition ${
                    isDarkMode
                      ? "bg-slate-800/70 text-emerald-200 hover:bg-slate-700/60"
                      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  }`}
                >
                  <Trophy className="h-4 w-4" />
                  Catat Prestasi
                </Link>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsReportMenuOpen((prev) => !prev)}
              className="flex items-center gap-3 rounded-full bg-rose-600 px-3 py-3 text-sm font-semibold text-white shadow-xl shadow-rose-300 transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Plus
                  className={`h-4 w-4 transform transition-transform duration-500 ${
                    isReportMenuOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </span>
              {/* Laporkan */}
            </button>
          </div>
        )}

        <footer className="rounded-[8px] bg-gradient-to-r from-rose-600 via-red-600 to-rose-500 p-8 text-white shadow-xl">
          <div className="grid gap-8 text-sm md:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
                Alamat
              </p>
              <div className="mt-3 flex items-start gap-3 leading-relaxed text-white/90">
                <span className="mt-1">
                  <MapPin className="h-5 w-5" />
                </span>
                <p>
                  Jl. Medan Merdeka Barat No. 9<br />
                  Jakarta Pusat 10110
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
                Telepon
              </p>
              <div className="mt-3 flex items-center gap-3 text-white/90">
                <Phone className="h-5 w-5" />
                <span>(021) 3504024</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
                Email
              </p>
              <div className="mt-3 flex items-center gap-3 text-white/90">
                <Mail className="h-5 w-5" />
                <span>pelayanan@mail.komdigi.go.id</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
                Kanal Resmi
              </p>
              <div className="mt-3 flex items-center gap-3 text-white/90">
                <a
                  href="https://facebook.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/30"
                  aria-label="Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </a>
                <a
                  href="https://instagram.com/y_usr1"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/30"
                  aria-label="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <a
                  href="https://sman1ketapang.sch.id/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/30"
                  aria-label="Website"
                >
                  <Globe className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
