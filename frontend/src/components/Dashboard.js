import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { AuthContext } from "../App";
import { dashboardService } from "../services/api";
import {
  TrendingUp,
  Calendar,
  Plus,
  Clock3,
  MapPin,
  Sparkles,
  MapPin as MapPinIcon,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Music4,
} from "lucide-react";

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReportAnimating, setIsReportAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const animationTimeoutRef = useRef(null);
  const instagramHandle = process.env.REACT_APP_INSTAGRAM || "@instagramkamu";
  const appVersion = process.env.REACT_APP_APP_VERSION || "v1.0.0";
  const instagramUrl = instagramHandle.startsWith("http")
    ? instagramHandle
    : `https://instagram.com/${instagramHandle.replace(/^@/, "")}`;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchDashboardStats();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await dashboardService.getStats();
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      setStats({
        total_siswa: 0,
        total_pelanggaran: 0,
        total_users: 0,
        total_kelas: 0,
        recent_violations: 0,
        monthly_violation_chart: [],
        todays_violations: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const getRoleDisplayName = (role) => {
    const roleNames = {
      admin: "Administrator",
      kepala_sekolah: "Kepala Sekolah",
      wakil_kepala_sekolah: "Wakil Kepala Sekolah",
      wali_kelas: "Wali Kelas",
      guru_bk: "Guru BK",
      guru_umum: "Guru Umum",
    };
    return roleNames[role] || role;
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  const heroImageUrl =
    process.env.REACT_APP_DASHBOARD_HERO || "/images/dashboard-hero.jpg";

  const chartData = stats?.monthly_violation_chart ?? [];
  const todaysViolations = stats?.todays_violations ?? [];

  const CHART_PADDING_TOP = 10;
  const CHART_PADDING_BOTTOM = 12;

  const showDetailedTodayList = useMemo(() => {
    const privilegedRoles = [
      "admin",
      "kepala_sekolah",
      "wakil_kepala_sekolah",
      "wali_kelas",
      "guru_bk",
    ];
    return privilegedRoles.includes(user?.role);
  }, [user?.role]);

  const monthlySummary = useMemo(() => {
    const totalMonth = chartData.reduce(
      (sum, item) => sum + (item.count || 0),
      0
    );
    const topDay = chartData.reduce((highest, item) => {
      if (!highest || (item?.count || 0) > (highest?.count || 0)) {
        return item;
      }
      return highest;
    }, null);

    return {
      totalMonth,
      peakDay: topDay,
      peakLabel: topDay?.date
        ? format(parseISO(topDay.date), "d MMMM", { locale: localeID })
        : "-",
    };
  }, [chartData]);

  const chartCoordinates = useMemo(() => {
    if (!chartData.length) {
      return [];
    }
    const maxValue = Math.max(1, ...chartData.map((item) => item.count || 0));
    const chartHeight = 100 - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
    const denominator = Math.max(chartData.length - 1, 1);

    return chartData.map((item, index) => {
      const safeCount = Math.max(0, item.count || 0);
      const x = (index / denominator) * 100;
      const y = CHART_PADDING_TOP + (1 - safeCount / maxValue) * chartHeight;
      return { x, y, count: safeCount, label: item.label };
    });
  }, [chartData]);

  const chartLinePoints = chartCoordinates
    .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");
  const chartAreaPoints = chartCoordinates.length
    ? `0,${100 - CHART_PADDING_BOTTOM} ${chartLinePoints} 100,${
        100 - CHART_PADDING_BOTTOM
      }`
    : "";

  const chartTicks = useMemo(() => {
    if (!chartData.length) return [];
    const dayCount = chartData.length;
    const denominator = Math.max(dayCount - 1, 1);
    const tickDays = Array.from(new Set([1, 7, 14, 21, dayCount])).filter(
      (day) => day <= dayCount
    );
    return tickDays.map((day) => ({
      label: chartData[day - 1]?.label ?? `${day}`,
      position: ((day - 1) / denominator) * 100,
    }));
  }, [chartData]);

  const formatClock = (isoString) => {
    if (!isoString) return "-";
    try {
      return format(parseISO(isoString), "HH:mm", { locale: localeID });
    } catch (error) {
      return "-";
    }
  };

  const handleReportClick = () => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    setIsReportAnimating(true);
    animationTimeoutRef.current = setTimeout(() => {
      setIsReportAnimating(false);
    }, 450);
  };

  const canReportViolation =
    user?.role === "guru_umum" ||
    user?.role === "wali_kelas" ||
    user?.role === "guru_bk";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-10 fade-in">
        {/* Hero Section */}
        <section
          className="dashboard-hero"
          style={{ "--dashboard-hero-image": `url(${heroImageUrl})` }}
        >
          <div className="dashboard-hero__overlay" aria-hidden="true"></div>
          <div className="dashboard-hero__content">
            <div className="dashboard-hero__text">
              <div className="dashboard-hero__text-surface">
                <span className="dashboard-hero__eyebrow">
                  Sistem Pembinaan Siswa
                </span>
                <h1 className="dashboard-hero__title">
                  {getWelcomeMessage()}, {user?.full_name}!
                </h1>
                <p className="dashboard-hero__subtitle">
                  {getRoleDisplayName(user?.role)} siap membina dan mendampingi
                  siswa dengan data yang terintegrasi.
                </p>
                <div className="dashboard-hero__meta">
                  <div className="dashboard-hero__meta-item">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date().toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="dashboard-hero__meta-item">
                    <Clock3 className="w-4 h-4" />
                    <span>
                      {format(currentTime, "HH:mm:ss", { locale: localeID })}{" "}
                      WIB
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="dashboard-hero__aside">
              <div className="dashboard-hero__badge">
                <Sparkles className="w-4 h-4" />
                <span>
                  {monthlySummary.totalMonth} pelanggaran tercatat bulan ini
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        {/* Analytics Section */}
        {stats && (
          <div className="dashboard-analytics">
            <div className="dashboard-analytics__panel dashboard-analytics__panel--chart">
              <div className="dashboard-analytics__header">
                <div>
                  <h2>Statistik Pelanggaran Bulan Ini</h2>
                  <p>
                    Pantau tren harian untuk merencanakan pembinaan lebih tepat
                    sasaran.
                  </p>
                </div>
                <div className="dashboard-analytics__badge">
                  <TrendingUp className="w-4 h-4" />
                  <span>{monthlySummary.totalMonth} kasus</span>
                </div>
              </div>

              {chartCoordinates.length ? (
                <div className="dashboard-chart">
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Grafik pelanggaran harian"
                  >
                    <defs>
                      <linearGradient
                        id="violationGradient"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="rgba(220,38,38,0.28)" />
                        <stop
                          offset="100%"
                          stopColor="rgba(248,113,113,0.05)"
                        />
                      </linearGradient>
                    </defs>
                    <polygon
                      points={chartAreaPoints}
                      fill="url(#violationGradient)"
                    />
                    <polyline
                      points={chartLinePoints}
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {chartCoordinates.map((point, index) => (
                      <circle
                        key={`${point.label}-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r={0.9}
                        fill="#b91c1c"
                      />
                    ))}
                  </svg>
                  <div className="dashboard-chart__ticks">
                    {chartTicks.map((tick) => (
                      <span
                        key={tick.label}
                        style={{ left: `${tick.position}%` }}
                      >
                        {tick.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="dashboard-chart__empty">
                  <p>Belum ada data pelanggaran pada bulan ini.</p>
                </div>
              )}

              <div className="dashboard-analytics__summary">
                <div>
                  <p className="dashboard-analytics__summary-label">
                    Total bulan ini
                  </p>
                  <p className="dashboard-analytics__summary-value">
                    {monthlySummary.totalMonth}
                  </p>
                </div>
                <div>
                  <p className="dashboard-analytics__summary-label">
                    Puncak aktivitas
                  </p>
                  <p className="dashboard-analytics__summary-value">
                    {monthlySummary.peakDay
                      ? `${monthlySummary.peakLabel} (${monthlySummary.peakDay.count})`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="dashboard-analytics__summary-label">Hari ini</p>
                  <p className="dashboard-analytics__summary-value">
                    {todaysViolations.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="dashboard-analytics__panel dashboard-analytics__panel--today">
              <div className="dashboard-analytics__header">
                <div>
                  <h2>Pelanggaran Hari Ini</h2>
                  <p>Ringkasan laporan terbaru dari seluruh guru.</p>
                </div>
              </div>

              {showDetailedTodayList ? (
                todaysViolations.length ? (
                  <ul className="dashboard-today">
                    {todaysViolations.map((item) => (
                      <li key={item.id} className="dashboard-today__item">
                        <div>
                          <p className="dashboard-today__title">{item.nama}</p>
                          <p className="dashboard-today__subtitle">
                            {item.pelanggaran}
                          </p>
                          <div className="dashboard-today__meta">
                            <span className="dashboard-today__meta-item">
                              <Clock3 className="w-4 h-4" />
                              {formatClock(item.waktu)}
                            </span>
                            <span className="dashboard-today__meta-item">
                              <MapPin className="w-4 h-4" />
                              {item.tempat}
                            </span>
                            <span
                              className={`dashboard-today__status dashboard-today__status--${
                                item.status || "reported"
                              }`}
                            >
                              {item.status?.replace("_", " ") || "reported"}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="dashboard-today__empty">
                    <p>
                      Belum ada pelanggaran yang dilaporkan hari ini. Teruskan
                      pembinaan yang positif!
                    </p>
                  </div>
                )
              ) : (
                <div className="dashboard-today__summary">
                  <p className="dashboard-today__summary-number">{todaysViolations.length}</p>
                  <p className="dashboard-today__summary-text">
                    Pelanggaran yang Anda laporkan hari ini.
                  </p>
                  <p className="dashboard-today__summary-hint">
                    Detail lengkap akan ditangani oleh wali kelas dan tim BK.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {canReportViolation && (
        <Link
          to="/violations/report"
          onClick={handleReportClick}
          className={`floating-report-button ${
            isReportAnimating ? "clicked" : ""
          }`}
          aria-label="Buka formulir laporan pelanggaran"
        >
          <span className="floating-report-button__icon">
            <Plus className="w-6 h-6" />
          </span>
          <span className="floating-report-button__label">
            Laporkan Pelanggaran
          </span>
        </Link>
      )}

      <footer className="dashboard-contact-footer">
        <div className="dashboard-contact-footer__row">
          <div className="dashboard-contact-footer__item">
            <MapPinIcon className="w-5 h-5" />
            <div>
              <p className="dashboard-contact-footer__heading">Alamat</p>
              <p>
                Jl. Medan Merdeka Barat No. 9<br />
                Jakarta Pusat 10110
              </p>
            </div>
          </div>
          <div className="dashboard-contact-footer__item">
            <Phone className="w-5 h-5" />
            <div>
              <p className="dashboard-contact-footer__heading">Telepon</p>
              <p>(021) 3504024</p>
            </div>
          </div>
          <div className="dashboard-contact-footer__item">
            <Mail className="w-5 h-5" />
            <div>
              <p className="dashboard-contact-footer__heading">Surel</p>
              <p>pelayanan@mail.komdigi.go.id</p>
            </div>
          </div>
          <div className="dashboard-contact-footer__social">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
            >
              <Facebook className="w-4 h-4" />
            </a>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
            >
              <Youtube className="w-4 h-4" />
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              aria-label="X"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
            >
              <Music4 className="w-4 h-4" />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Dashboard;
