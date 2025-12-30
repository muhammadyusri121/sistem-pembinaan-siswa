import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  ArrowRight,
  BarChart3,
  Users,
  CalendarCheck,
  Trophy,
  CheckCircle2,
  TrendingUp,
  School,
} from "lucide-react";

// --- Components ---

const FloatingBadge = ({ icon: Icon, label, className }) => (
  <div
    className={`absolute flex items-center gap-2 rounded-xl bg-white/90 p-3 shadow-xl backdrop-blur-sm ring-1 ring-black/5 dark:bg-slate-800/90 dark:ring-white/10 ${className}`}
  >
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-200">
      <Icon className="h-4 w-4" />
    </div>
    <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">
      {label}
    </span>
  </div>
);

const FeatureSection = ({
  reversed,
  imageSrc,
  title,
  subtitle,
  description,
  icon: Icon,
}) => (
  <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
    <div
      className={`grid gap-12 lg:grid-cols-2 lg:items-center ${reversed ? "lg:grid-flow-dense" : ""
        }`}
    >
      {/* Text Content */}
      <div className={`space-y-6 ${reversed ? "lg:col-start-2" : ""}`}>
        <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          <Icon className="h-4 w-4" />
          {subtitle}
        </div>
        <h2 className="text-3xl font-bold leading-tight text-gray-900 dark:text-slate-100 sm:text-4xl">
          {title}
        </h2>
        <p className="text-lg text-gray-600 dark:text-slate-400">
          {description}
        </p>
        <Link
          to="/login"
          className="group inline-flex items-center gap-2 text-base font-semibold text-rose-600 transition hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
        >
          Masuk untuk akses
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Visual */}
      <div className={`relative ${reversed ? "lg:col-start-1" : ""}`}>
        <div className="relative overflow-hidden rounded-2xl bg-gray-100 shadow-2xl dark:bg-slate-800">
          <img
            src={imageSrc}
            alt={title}
            className="h-full w-full object-cover transition duration-700 hover:scale-105"
          />
        </div>
        {/* Decorative Grid Pattern */}
        <div className="absolute -bottom-6 -right-6 -z-10 h-64 w-64 bg-[radial-gradient(#e11d48_1px,transparent_1px)] [background-size:16px_16px] opacity-20 dark:opacity-10" />
      </div>
    </div>
  </section>
);

const StatsCounter = ({ value, label }) => (
  <div className="text-center">
    <div className="text-4xl font-bold text-white sm:text-5xl">{value}</div>
    <div className="mt-2 text-sm font-medium text-rose-100">{label}</div>
  </div>
);

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* --- Header --- */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled
          ? "bg-white/80 py-3 shadow-md backdrop-blur-md dark:bg-slate-950/80"
          : "bg-transparent py-5"
          }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg">
              <School className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-lg font-bold leading-none text-gray-900 dark:text-white">
                DISPO SMANKA
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Sistem Pembinaan Siswa
              </span>
            </div>
          </div>

          <Link
            to="/login"
            className="rounded-full bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:shadow-none dark:ring-offset-slate-900"
          >
            Masuk
          </Link>
        </div>
      </header>

      <main>
        {/* --- Hero Section --- */}
        <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-24 lg:pb-32">
          {/* Background Blob */}
          <div className="absolute -top-24 -right-24 -z-10 h-[600px] w-[600px] rounded-full bg-rose-50 blur-3xl dark:bg-rose-900/20" />
          <div className="absolute top-1/2 -left-24 -z-10 h-[400px] w-[400px] rounded-full bg-blue-50 blur-3xl dark:bg-blue-900/20" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              {/* Hero Text */}
              <div className="max-w-2xl space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-sm font-medium text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">
                  <span className="flex h-2 w-2 rounded-full bg-rose-600"></span>
                  Versi Terbaru 2.0
                </div>
                <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
                  Membangun Generasi <br />
                  <span className="bg-gradient-to-r from-rose-600 to-orange-500 bg-clip-text text-transparent">
                    Disiplin & Berprestasi
                  </span>
                </h1>
                <p className="text-xl text-gray-600 dark:text-slate-300">
                  Platform manajemen sekolah terpadu untuk monitoring
                  pelanggaran, pencatatan prestasi, dan pembinaan siswa secara
                  realtime dan transparan.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-rose-200 transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:shadow-none dark:ring-offset-slate-900"
                  >
                    Mulai Sekarang
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
              </div>

              {/* Hero Visual */}
              <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
                <div className="relative z-10 overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10">
                  <img
                    src="/media/hero/hero-image-1.jpg"
                    alt="Dashboard Preview"
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Floating Badges */}
                <FloatingBadge
                  icon={Trophy}
                  label="Prestasi Tercatat"
                  className="-left-8 top-12 z-20 animate-bounce hover:scale-105"
                />
                <FloatingBadge
                  icon={CheckCircle2}
                  label="Laporan Selesai"
                  className="-bottom-6 -right-6 z-20 animate-pulse hover:scale-105"
                />

                {/* Decorative Elements */}
                <div className="absolute -bottom-10 -left-10 -z-10 h-72 w-72 rounded-full bg-rose-200/50 mix-blend-multiply blur-xl dark:bg-rose-500/20 dark:mix-blend-normal" />
                <div className="absolute -right-10 -top-10 -z-10 h-72 w-72 rounded-full bg-blue-200/50 mix-blend-multiply blur-xl dark:bg-blue-500/20 dark:mix-blend-normal" />
              </div>
            </div>
          </div>
        </section>

        {/* --- Features Section (Zig-Zag) --- */}
        <div className="space-y-4 py-12">
          <FeatureSection
            subtitle="Monitoring Terpadu"
            title="Pantau Kedisiplinan Siswa"
            description="Dashboard lengkap untuk melihat tren pelanggaran harian. Guru dapat melakukan tindak lanjuti kasus secara langsung dan transparan."
            icon={ShieldCheck}
            imageSrc="/media/hero/hero-image-2.jpg"
          />

          <FeatureSection
            reversed
            subtitle="Rekam Jejak Positif"
            title="Apresiasi Prestasi Siswa"
            description="Bukan hanya pelanggaran, catat setiap pencapaian siswa mulai dari tingkat sekolah hingga internasional. Bangun budaya sekolah yang positif."
            icon={Trophy}
            imageSrc="/media/hero/hero-image-2.jpg"
          />
        </div>

        {/* --- Stats Section --- */}
        <section className="bg-rose-600 py-20 text-white dark:bg-rose-700">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCounter value="1,200+" label="Siswa Terdata" />
              <StatsCounter value="98%" label="Tingkat Disiplin" />
              <StatsCounter value="450+" label="Prestasi Dicapai" />
              <StatsCounter value="24/7" label="Akses Sistem" />
            </div>
          </div>
        </section>

        {/* --- CTA / Footer --- */}
        <footer className="bg-gray-50 py-16 text-center dark:bg-slate-900">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Siap untuk Meningkatkan Mutu Sekolah?
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-slate-400">
              Bergabunglah dengan transformasi digital sekolah kami.
              Kelola manajemen kesiswaan dengan lebih mudah dan akurat.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-rose-200 transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:shadow-none dark:ring-offset-slate-900"
              >
                Akses Dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            <div className="mt-16 border-t border-gray-200 pt-8 text-sm text-gray-500 dark:border-slate-800 dark:text-slate-500">
              &copy; {new Date().getFullYear()} DISPO SMANKA. All rights
              reserved.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
