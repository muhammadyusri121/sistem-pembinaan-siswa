// Laporan bulanan yang menampilkan ringkasan pelanggaran dan prestasi
import React, { useEffect, useState } from "react";
import { dashboardService } from "../services/api";
import { toast } from "sonner";
import { Download, AlertCircle, BarChart3, Trophy } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as localeID } from "date-fns/locale";

// Utility sederhana untuk menormalkan penulisan angka sesuai lokal
const formatNumber = (value) => new Intl.NumberFormat("id-ID").format(Number(value || 0));

const MonthlyReport = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [openPeriod, setOpenPeriod] = useState({});
  const [selectedYear, setSelectedYear] = useState("all");

  const violationChart = stats?.monthly_violation_chart || [];
  const achievementChart = stats?.monthly_achievement_chart || [];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await dashboardService.getStats();
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch monthly report:", error);
        toast.error("Gagal memuat data laporan bulanan");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleDownloadPdf = () => {
    window.print();
  };

  const pageShellClasses =
    "min-h-screen space-y-8 sm:space-y-5 bg-rose-50/80 text-gray-900 dark:bg-slate-950 dark:text-slate-100 px-4 sm:px-6 lg:px-8 py-8 transition-colors";
  const cardClasses =
    "rounded-[8px] bg-white/95 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/70 dark:shadow-xl dark:shadow-black/40 dark:ring-1 dark:ring-slate-700/60";
  const primaryButtonClasses =
    "inline-flex items-center justify-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1 focus:ring-offset-rose-50 dark:focus:ring-offset-slate-950";

  if (loading) {
    return (
      <div className={pageShellClasses}>
        <div className={`${cardClasses} flex items-center justify-center`}>
          <p className="text-sm text-gray-600 dark:text-slate-400">Memuat laporan bulanan...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={pageShellClasses}>
        <div className={`${cardClasses} flex items-center justify-center`}>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Data laporan tidak tersedia untuk saat ini.
          </p>
        </div>
      </div>
    );
  }

  const extractYear = (item) => {
    const raw = item?.date || item?.tanggal || item?.month || item?.bulan || item?.label;
    if (!raw) return "";
    try {
      return format(parseISO(String(raw)), "yyyy");
    } catch (error) {
      const numeric = Number(String(raw).slice(0, 4));
      return Number.isInteger(numeric) ? String(numeric) : "";
    }
  };

  const allYears = [...violationChart, ...achievementChart].map(extractYear).filter(Boolean);
  const yearOptions = Array.from(new Set(allYears)).sort((a, b) => Number(b) - Number(a));

  const filterByYear = (items) =>
    items.filter((item) => (selectedYear === "all" ? true : extractYear(item) === selectedYear));

  const filteredViolations = filterByYear(violationChart);
  const filteredAchievements = filterByYear(achievementChart);

  const totalPelanggaranBulanIni = filteredViolations.reduce((acc, item) => acc + (item.count || 0), 0);
  const totalPrestasiBulanIni = filteredAchievements.reduce((acc, item) => acc + (item.count || 0), 0);

  const resolveMonthLabel = (item) => {
    const raw = item?.date || item?.month || item?.bulan || item?.label || "";
    if (!raw) return "Periode";
    try {
      return format(parseISO(String(raw)), "MMMM yyyy", { locale: localeID });
    } catch (error) {
      return raw;
    }
  };

  const groupByMonth = (data) => {
    const buckets = {};
    data.forEach((item) => {
      const key = resolveMonthLabel(item);
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(item);
    });
    return Object.entries(buckets).map(([month, items]) => ({
      month,
      items,
      total: items.reduce((acc, cur) => acc + (cur.count || 0), 0),
    }));
  };

  const groupedViolations = groupByMonth(filteredViolations);
  const groupedAchievements = groupByMonth(filteredAchievements);

  const summaryCards = [
    {
      label: "Total Siswa",
      value: formatNumber(stats.total_siswa),
    },
    {
      label: "Total Pelanggaran",
      value: formatNumber(stats.total_pelanggaran),
    },
    {
      label: "Total Prestasi",
      value: formatNumber(stats.prestasi_summary?.total_prestasi || 0),
    },
    {
      label: "Rasio Positif",
      value: `${stats.positivity_ratio || 0}%`,
    },
  ];

  return (
    <div className={`${pageShellClasses} print:bg-white`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
            Laporan Bulanan
          </div>
          <div>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Laporan Bulanan Sekolah</h1>
            <p className="text-sm text-gray-600 dark:text-slate-400">Ringkasan pelanggaran dan prestasi 30 hari terakhir.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="rounded-full border border-gray-200 bg-white/90 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition focus:border-rose-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
            >
              <option value="all">Semua Tahun</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleDownloadPdf} className={`${primaryButtonClasses} self-start print:hidden`}>
            <Download className="h-4 w-4" />
            Unduh PDF
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <article className={cardClasses}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-inner dark:bg-rose-500/15 dark:text-rose-200">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Pelanggaran Bulanan</h2>
              <p className="text-sm text-gray-500">Total pelanggaran per bulan.</p>
            </div>
          </div>
          <p className="mt-6 text-4xl font-bold text-rose-600 dark:text-rose-300">{formatNumber(totalPelanggaranBulanIni)}</p>
          <div className="mt-5 space-y-3">
            {groupedViolations.length ? (
              groupedViolations.map(({ month, items, total }) => {
                const visibleItems = items.filter((item) => (item.count || 0) > 0);
                const monthHasData = visibleItems.length > 0;
                const isOpen = !!openPeriod[`v-${month}`];
                return (
                  <div key={month} className="overflow-hidden rounded-[10px] border border-gray-100/80 bg-white/80 dark:border-slate-800/60 dark:bg-slate-900/60">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-t-[10px] bg-[#C82020] px-4 py-2 text-left text-sm font-semibold text-white transition hover:brightness-105 dark:bg-[#a11818]"
                      onClick={() =>
                        setOpenPeriod((prev) => ({ ...prev, [`v-${month}`]: !prev[`v-${month}`] }))
                      }
                    >
                      <span>{month}</span>
                      <span className="text-xs font-semibold">Total {formatNumber(total)}</span>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        isOpen ? "max-h-[640px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      {monthHasData ? (
                        <>
                          <div className="grid grid-cols-3 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-600 dark:bg-slate-900 dark:text-slate-300">
                            <span>Hari</span>
                            <span className="text-center">Tanggal</span>
                            <span className="text-right">Jumlah</span>
                          </div>
                          <div className="divide-y divide-gray-100 dark:divide-slate-800">
                            {visibleItems.map((item, idx) => (
                              <div key={item.date || item.label || idx} className="grid grid-cols-3 px-4 py-2 text-sm text-gray-700 dark:text-slate-200">
                                <span className="font-semibold">Hari {item.label}</span>
                                <span className="text-center">{item.date || "-"}</span>
                                <span className="text-right font-semibold">{formatNumber(item.count)} pelanggaran</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                          Tidak ada pelanggaran pada bulan ini.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[10px] border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400 dark:border-slate-800">
                Belum ada data pelanggaran.
              </div>
            )}
          </div>
        </article>

        <article className={cardClasses}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner dark:bg-emerald-500/15 dark:text-emerald-200">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Prestasi Bulanan</h2>
              <p className="text-sm text-gray-500">Total prestasi per bulan.</p>
            </div>
          </div>
          <p className="mt-6 text-4xl font-bold text-emerald-600 dark:text-emerald-200">{formatNumber(totalPrestasiBulanIni)}</p>
          <div className="mt-5 space-y-3">
            {groupedAchievements.length ? (
              groupedAchievements.map(({ month, items, total }) => {
                const visibleItems = items.filter((item) => (item.count || 0) > 0);
                const monthHasData = visibleItems.length > 0;
                const isOpen = !!openPeriod[`a-${month}`];
                return (
                  <div key={month} className="overflow-hidden rounded-[10px] border border-gray-100/80 bg-white/80 dark:border-slate-800/60 dark:bg-slate-900/60">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-t-[10px] bg-[#C82020] px-4 py-2 text-left text-sm font-semibold text-white transition hover:brightness-105 dark:bg-[#a11818]"
                      onClick={() =>
                        setOpenPeriod((prev) => ({ ...prev, [`a-${month}`]: !prev[`a-${month}`] }))
                      }
                    >
                      <span>{month}</span>
                      <span className="text-xs font-semibold">Total {formatNumber(total)}</span>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        isOpen ? "max-h-[640px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      {monthHasData ? (
                        <>
                          <div className="grid grid-cols-3 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-600 dark:bg-slate-900 dark:text-slate-300">
                            <span>Hari</span>
                            <span className="text-center">Tanggal</span>
                            <span className="text-right">Jumlah</span>
                          </div>
                          <div className="divide-y divide-gray-100 dark:divide-slate-800">
                            {visibleItems.map((item, idx) => (
                              <div key={item.date || item.label || idx} className="grid grid-cols-3 px-4 py-2 text-sm text-gray-700 dark:text-slate-200">
                                <span className="font-semibold">Hari {item.label}</span>
                                <span className="text-center">{item.date || "-"}</span>
                                <span className="text-right font-semibold">{formatNumber(item.count)} prestasi</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                          Tidak ada prestasi pada bulan ini.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[10px] border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400 dark:border-slate-800">
                Belum ada data prestasi.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className={cardClasses}>
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-inner dark:bg-rose-500/15 dark:text-rose-200">
            <AlertCircle className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Statistik Umum</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-[10px] border border-gray-100/80 bg-white/80 p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">{card.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MonthlyReport;
