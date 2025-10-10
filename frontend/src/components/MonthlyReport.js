// Laporan bulanan yang menampilkan ringkasan pelanggaran dan prestasi
import React, { useEffect, useState } from "react";
import { dashboardService } from "../services/api";
import { toast } from "sonner";

// Utility sederhana untuk menormalkan penulisan angka sesuai lokal
const formatNumber = (value) =>
  new Intl.NumberFormat("id-ID").format(Number(value || 0));

// Halaman laporan yang dapat dicetak maupun diunduh sebagai PDF
const MonthlyReport = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

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

  // Menggunakan print browser untuk menghasilkan PDF ringkasan cepat
  const handleDownloadPdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="modern-card p-10 text-center">
        <p className="text-gray-600 text-sm">Memuat laporan bulanan...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="modern-card p-10 text-center">
        <p className="text-gray-600 text-sm">
          Data laporan tidak tersedia untuk saat ini.
        </p>
      </div>
    );
  }

  const violationChart = stats.monthly_violation_chart || [];
  const achievementChart = stats.monthly_achievement_chart || [];

  const totalPelanggaranBulanIni = violationChart.reduce(
    (acc, item) => acc + (item.count || 0),
    0
  );
  const totalPrestasiBulanIni = achievementChart.reduce(
    (acc, item) => acc + (item.count || 0),
    0
  );

  return (
    <div className="space-y-6 print:bg-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Laporan Bulanan Sekolah
          </h1>
          <p className="text-gray-500 text-sm">
            Ringkasan pelanggaran dan prestasi selama 30 hari terakhir.
          </p>
        </div>
        <button
          onClick={handleDownloadPdf}
          className="btn-primary self-start print:hidden"
        >
          Unduh PDF
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="modern-card p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Pelanggaran Bulanan
          </h2>
          <p className="text-sm text-gray-500">
            Total pelanggaran tercatat dalam 30 hari terakhir.
          </p>
          <p className="mt-6 text-4xl font-bold text-rose-600">
            {formatNumber(totalPelanggaranBulanIni)}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            {violationChart.slice(-10).map((item) => (
              <li key={item.date || item.label} className="flex justify-between">
                <span>Hari {item.label}</span>
                <span className="font-semibold">
                  {formatNumber(item.count)} pelanggaran
                </span>
              </li>
            ))}
            {!violationChart.length && (
              <li className="text-gray-400">Belum ada data pelanggaran.</li>
            )}
          </ul>
        </article>

        <article className="modern-card p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Prestasi Bulanan
          </h2>
          <p className="text-sm text-gray-500">
            Total prestasi tercatat dalam 30 hari terakhir.
          </p>
          <p className="mt-6 text-4xl font-bold text-emerald-600">
            {formatNumber(totalPrestasiBulanIni)}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            {achievementChart.slice(-10).map((item) => (
              <li key={item.date || item.label} className="flex justify-between">
                <span>Hari {item.label}</span>
                <span className="font-semibold">
                  {formatNumber(item.count)} prestasi
                </span>
              </li>
            ))}
            {!achievementChart.length && (
              <li className="text-gray-400">Belum ada data prestasi.</li>
            )}
          </ul>
        </article>
      </section>

      <section className="modern-card p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Statistik Umum
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-4">
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Total Siswa
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {formatNumber(stats.total_siswa)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Total Pelanggaran
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {formatNumber(stats.total_pelanggaran)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Total Prestasi
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {formatNumber(stats.prestasi_summary?.total_prestasi || 0)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Rasio Positif
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {stats.positivity_ratio || 0}%
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MonthlyReport;
