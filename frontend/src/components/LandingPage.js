import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowRight, BarChart3, Users, CalendarCheck } from "lucide-react";

const heroImages = [
  "/media/hero/hero-image-1.jpg",
  "/media/hero/hero-image-2.jpg",
  "/media/hero/hero-intro.jpg",
];

const LandingPage = () => {
  const primaryImage = heroImages[0];
  const secondaryImage = heroImages[1] || heroImages[0];
  const tertiaryImage = heroImages[2] || heroImages[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/90 via-white to-rose-50/70 text-gray-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-end px-4 py-5 sm:px-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1 focus:ring-offset-rose-50 dark:focus:ring-offset-slate-950"
        >
          Masuk
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-16 sm:px-8">
        {/* Hero */}
        <section className="overflow-hidden rounded-[18px] bg-white/90 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/70 dark:bg-slate-900/90 dark:ring-1 dark:ring-slate-800/70">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6 px-6 py-8 sm:px-10">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
                Platform Disiplin Positif
              </p>
              <h2 className="text-4xl font-semibold leading-tight sm:text-5xl">
                Kelola data siswa, pelanggaran, dan prestasi dalam satu layar.
              </h2>
              <p className="text-lg text-gray-600 dark:text-slate-400">
                Pantau perkembangan siswa, tindak lanjuti pelanggaran, serta catat prestasi secara real time dengan dashboard terpadu.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1 focus:ring-offset-rose-50 dark:focus:ring-offset-slate-950"
                >
                  Mulai Masuk
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[12px] border border-gray-100 bg-white/80 p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-200">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-sm font-semibold">Ringkasan Cepat</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                    Grafik pelanggaran & prestasi 30 hari terakhir dalam satu tampilan.
                  </p>
                </div>
                <div className="rounded-[12px] border border-gray-100 bg-white/80 p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-200">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-semibold">Akses Aman</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                    Role-based access untuk admin, kepala sekolah, dan guru.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative h-full w-full">
              <img
                src={primaryImage}
                alt="Hero visual"
                className="h-full w-full rounded-l-[18px] object-cover lg:rounded-none lg:rounded-r-[18px]"
              />
              <div className="absolute inset-x-6 bottom-6 space-y-3 rounded-[12px] bg-white/85 p-4 shadow-xl backdrop-blur-sm dark:bg-slate-900/85 dark:ring-1 dark:ring-slate-800/60">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                  Sorotan
                </p>
                <p className="text-sm text-gray-700 dark:text-slate-200">
                  Pemantauan realtime, pembinaan, dan pelaporan bulanan dalam satu dasbor.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature sections mimic the provided layout */}
        <section className="grid gap-8 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[18px] bg-white/90 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/70 dark:bg-slate-900/90 dark:ring-1 dark:ring-slate-800/70">
            <img src={secondaryImage} alt="Kursi" className="h-64 w-full object-cover rounded-t-[18px]" />
            <div className="space-y-4 px-6 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                Monitoring Pelanggaran
              </p>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Grafik & Tindak Lanjut</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Lihat tren pelanggaran harian, filter per kelas, dan lakukan pembinaan langsung dari dashboard.
              </p>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600 transition hover:text-rose-700">
                Masuk untuk lanjut
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-[18px] bg-white/90 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/70 dark:bg-slate-900/90 dark:ring-1 dark:ring-slate-800/70">
            <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
              <div className="h-64 w-full overflow-hidden">
                <img src={tertiaryImage} alt="Produk" className="h-full w-full object-cover md:rounded-l-[18px]" />
              </div>
              <div className="flex flex-col justify-center space-y-3 px-6 py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                  Catat Prestasi
                </p>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Prestasi Siswa</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Input prestasi individu, verifikasi, dan lihat rekap bulanan yang siap unduh.
                </p>
                <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600 transition hover:text-rose-700">
                  Masuk untuk lanjut
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA bottom */}
        <section className="overflow-hidden rounded-[18px] bg-white/90 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/70 dark:bg-slate-900/90 dark:ring-1 dark:ring-slate-800/70">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-4 px-6 py-8 sm:px-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                Jadwalkan
              </p>
              <h3 className="text-3xl font-semibold text-gray-900 dark:text-slate-100">
                Laporan bulanan siap cetak, pembinaan tercatat, prestasi terdokumentasi.
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Kelola data siswa dengan disiplin positif dan pantau progres tiap bulan tanpa ribet.
              </p>
              <Link
                to="/login"
                className="inline-flex w-fit items-center gap-2 rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1 focus:ring-offset-rose-50 dark:focus:ring-offset-slate-950"
              >
                Masuk Sekarang
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex items-center justify-center bg-gradient-to-br from-rose-100 via-white to-rose-50 p-6 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
              <div className="flex w-full max-w-xl flex-col gap-4 rounded-[12px] bg-white/85 p-6 shadow-xl ring-1 ring-black/5 dark:border dark:border-slate-800/70 dark:bg-slate-900/85 dark:ring-1 dark:ring-slate-800/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-200">
                    <CalendarCheck className="h-5 w-5" />
                    <span className="text-sm font-semibold">Pembinaan Terjadwal</span>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-200">
                    Realtime
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-slate-200">
                  Status pelanggaran diproses & selesai, plus catatan prestasi yang siap dilaporkan tiap akhir bulan.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
