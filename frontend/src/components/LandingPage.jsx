import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cmsService } from "../services/api";
import {
  ShieldCheck,
  ArrowRight,
  Trophy,
  School,
  LineChart,
  Users,
  Sparkles,
  Lock,
  Globe,
  CheckCircle2,
  ChevronRight,
  Instagram,
} from "lucide-react";

/**
 * Komponen reusable untuk kartu fitur
 */
const FeatureCard = ({ icon: Icon, title, description, color, comingSoon }) => (
  <div className="group relative h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50">
    <div
      className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-${color}-50 text-${color}-600 dark:bg-${color}-500/10 dark:text-${color}-400`}
    >
      <Icon className="h-6 w-6" />
    </div>
    <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
      {title}
    </h3>
    <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
    {comingSoon && (
      <span className="absolute right-4 top-4 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Segera Hadir
      </span>
    )}
  </div>
);

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [cmsContent, setCmsContent] = useState({
    hero_title: "Membangun Karakter \nGenerasi Berprestasi",
    hero_subtitle: "Platform manajemen kesiswaan yang modern, aman, dan mudah digunakan. Pantau kedisiplinan dan apresiasi pencapaian siswa dalam satu dashboard terintegrasi.",
    hero_image_url: "/media/hero/hero-image-1.jpg",
    gallery: []
  });

  const loginLogoUrl = "/images/login-logo.png";

  const appVersion = process.env.REACT_APP_APP_VERSION || "v4.1.0";
  const instagramHandle = process.env.REACT_APP_INSTAGRAM || "@y_usr1";
  const instagramUrl = instagramHandle.startsWith("http")
    ? instagramHandle
    : `https://instagram.com/${instagramHandle.replace(/^@/, "")}`;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);

    // Fetch CMS Content
    cmsService.getLandingPageContent()
      .then(res => {
        if (res.data) {
          setCmsContent(prev => ({
            ...prev,
            hero_title: res.data.hero_title || prev.hero_title,
            hero_subtitle: res.data.hero_subtitle || prev.hero_subtitle,
            hero_image_url: res.data.hero_image_url || prev.hero_image_url,
            gallery: res.data.gallery || []
          }));
        }
      })
      .catch(err => console.error("CMS Load Failed, using default", err));

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getFullImageUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("/media") || path.startsWith("/images")) return path;
    const baseUrl = process.env.REACT_APP_API_URL?.replace("/api", "") || "http://localhost:8000";
    return `${baseUrl}/${path}`;
  };

  return (
    // Menggunakan warna latar 'slate-50' yang lebih lembut dari putih murni
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">

      {/* --- Navbar --- */}
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled
          ? "bg-white/95 py-4 shadow-lg backdrop-blur-md border-b border-slate-200/50 dark:bg-slate-900/95 dark:border-slate-800"
          : "bg-transparent py-6"
          }`}
      >
        <div className="container mx-auto flex items-center justify-between px-6 lg:px-12">
          <div className="flex items-center gap-3">
            {!logoError ? (
              <img
                src={loginLogoUrl}
                alt="Logo"
                className="h-10 w-auto object-contain sm:h-12"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-orange-600 text-white shadow-lg">
                <School className="h-6 w-6" />
              </div>
            )}
            <div className="hidden flex-col sm:flex">
              <span className="text-lg font-bold leading-none tracking-tight text-slate-900 dark:text-white">
                DISPO SMANKA
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-500">
                Sistem Pembinaan Siswa
              </span>
            </div>
          </div>

          <Link
            to="/login"
            className="group relative overflow-hidden rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 hover:shadow-xl dark:bg-white dark:text-slate-900"
          >
            <span className="relative z-10 flex items-center gap-2">
              Akses Sistem
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </nav>

      <main>
        {/* --- Hero Section --- */}
        <section className="relative flex min-h-[60vh] lg:min-h-[90vh] items-center overflow-hidden py-12 lg:py-48">

          {/* Background Image Container dengan Masking Gradasi (Vignette) */}
          <div className="absolute inset-0 z-0">
            {/* Gambar Background */}
            <img
              src={getFullImageUrl(cmsContent.hero_image_url)}
              alt="School Atmosphere"
              // ATUR OPASITI DI SINI: opacity-40 (0.4) untuk light mode, dark:opacity-20 (0.2) untuk dark mode
              className="h-full w-full object-cover opacity-100 dark:opacity-90 transition-opacity duration-700"
            />

            {/* Overlay Gradasi Putih/Gelap di Pinggir (Vignette Effect) - KIRI TEBAL, KANAN JELAS */}
            {/* Desktop: Linear dari samping. Mobile: Radial dari kiri bawah (agar teks terbaca) */}
            <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-slate-50/95 from-20% via-transparent via-60% to-transparent dark:from-slate-950/95 dark:via-transparent mix-blend-normal" />
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-50 via-transparent to-transparent sm:hidden dark:from-slate-950" />

            <div className="absolute inset-0 bg-gradient-to-b from-slate-50/20 via-transparent to-slate-50 dark:from-slate-950/30 dark:via-transparent dark:to-slate-950" />

            {/* Color Tint Overlay for Consistency */}
            <div className="absolute inset-0 bg-rose-900/5 mix-blend-overlay dark:bg-rose-900/20" />
          </div>

          <div className="container relative z-10 mx-auto px-6 lg:px-12">
            <div className="max-w-4xl">
              <div className="mb-8 hidden sm:inline-flex animate-fade-in items-center gap-2 rounded-full border border-rose-200 bg-white/80 px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm backdrop-blur-md dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                <Sparkles className="h-4 w-4 text-rose-500" />
                <span>Transformasi Sekolah Digital</span>
              </div>

              <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-7xl mb-8 leading-tight whitespace-pre-line">
                {cmsContent.hero_title}
              </h1>

              <p className="max-w-2xl text-xl leading-8 text-slate-700 dark:text-slate-300 font-medium">
                {cmsContent.hero_subtitle}
              </p>

              <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
                <Link
                  to="/login"
                  className="inline-flex h-12 sm:h-14 items-center justify-center rounded-full bg-rose-600 px-6 sm:px-8 text-sm sm:text-base font-bold text-white shadow-xl shadow-rose-600/20 transition-all hover:bg-rose-700 hover:shadow-2xl hover:shadow-rose-600/30 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                >
                  Mulai Sekarang
                </Link>
                <a
                  href="#features"
                  className="inline-flex h-12 sm:h-14 items-center justify-center rounded-full bg-white px-6 sm:px-8 text-sm sm:text-base font-bold text-slate-900 shadow-lg ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:shadow-xl dark:bg-slate-800 dark:text-white dark:ring-slate-700 dark:hover:bg-slate-700"
                >
                  Pelajari Fitur
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* --- Stats Banner --- */}
        <section className="relative z-20 -mt-16 sm:-mt-20 px-4 sm:px-6 lg:px-12">
          <div className="container mx-auto">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-200 shadow-2xl dark:bg-slate-800 sm:grid-cols-4 lg:rounded-[2rem]">
              {[
                { label: 'Siswa Aktif', value: '1.200+' },
                { label: 'Tingkat Disiplin', value: '98%' },
                { label: 'Prestasi', value: '500+' },
                { label: 'Uptime Sistem', value: '99.9%' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white p-4 sm:p-8 text-center transition hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-slate-800/80">
                  <dd className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                    {stat.value}
                  </dd>
                  <dt className="mt-1 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</dt>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- Galeri Prestasi Berjalan (Marquee) --- */}
        {cmsContent.gallery.length > 0 && (
          <section className="py-12 sm:py-24 overflow-hidden bg-slate-50 dark:bg-slate-950">
            <div className="container mx-auto px-6 mb-8 sm:mb-12 text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Galeri Kegiatan</h2>
              <p className="text-slate-500 dark:text-slate-400">Dokumentasi kegiatan dan peristiwa penting sekolah</p>
            </div>

            <div className="relative flex w-full overflow-hidden mask-linear-fade">
              <style>{`
                @keyframes scroll {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
                .animate-scroll {
                  animation: scroll 30s linear infinite;
                }
                .mask-linear-fade {
                  mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
                  -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
                }
             `}</style>
              <div className="absolute inset-0 z-10 pointer-events-none"></div>

              {/* --- Seamless Photo Marquee --- */}
              <div className="flex animate-scroll py-4 hover:pause-animation">
                {/* Duplikat array konten agar loop mulus (total 2 set) dan pastikan minimal ada beberapa item */}
                {[...Array(6)].map((_, groupIndex) => (
                  <div key={groupIndex} className="flex shrink-0">
                    {cmsContent.gallery.map((item, i) => (
                      <div key={`${groupIndex}-${i}`} className="group relative h-56 w-36 sm:h-72 sm:w-52 shrink-0 overflow-hidden cursor-pointer border-r border-white/20 dark:border-slate-800/20 bg-gray-200">
                        {/* Foto Siswa */}
                        <img
                          src={getFullImageUrl(item.image_url)}
                          alt={item.title || "Gallery"}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        {/* Overlay Gradient saat Hover */}
                        <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                        {/* Teks Info */}
                        {item.title && (
                          <div className="absolute bottom-0 left-0 p-3 sm:p-5 translate-y-4 text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                            <p className="font-bold text-sm sm:text-lg leading-tight">{item.title}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* --- Features Grid --- */}
        <section id="features" className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-950">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="mb-12 sm:mb-20 max-w-2xl">
              <h2 className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 tracking-wide uppercase">Fitur Unggulan</h2>
              <p className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                Solusi Lengkap Manajemen Sekolah
              </p>
            </div>

            <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={ShieldCheck}
                title="Monitoring Pelanggaran"
                description="Catat dan pantau pelanggaran siswa dengan sistem poin otomatis. Notifikasi real-time untuk wali kelas dan guru BK."
                color="bg-rose-500"
              />
              <FeatureCard
                icon={Trophy}
                title="Pencatatan Prestasi"
                description="Database prestasi siswa yang terpusat. Cetak sertifikat dan laporan pencapaian akademik maupun non-akademik."
                color="bg-amber-500"
              />
              <FeatureCard
                icon={LineChart}
                title="Analitik Dashboard"
                description="Visualisasi data statistik yang mudah dipahami untuk membantu pengambilan keputusan pimpinan sekolah."
                color="bg-blue-500"
              />
              <FeatureCard
                icon={Users}
                title="Manajemen Multi-User"
                description="Akses level berjenjang (Admin, Guru, BK, Wali Kelas) dengan keamanan data yang terjamin."
                color="bg-emerald-500"
              />
              <FeatureCard
                icon={Globe}
                title="Akses Dimana Saja"
                description="Sistem berbasis cloud yang responsif, dapat diakses melalui laptop, tablet, maupun smartphone."
                color="bg-indigo-500"
              />
              <FeatureCard
                icon={Lock}
                title="Keamanan Terjamin"
                description="Enkripsi SSL/TLS, backup rutin, dan proteksi akun memastikan data sekolah tetap aman."
                color="bg-slate-500"
              />
              <FeatureCard
                icon={Users}
                title="Integrasi Orang Tua"
                description="Orang tua dapat memantau perkembangan anak secara langsung melalui aplikasi khusus."
                color="bg-violet-500"
                comingSoon
              />
            </div>
          </div>
        </section>

        {/* --- CTA Section --- */}
        <section className="relative overflow-hidden bg-slate-900 py-12 md:py-20 dark:bg-black">
          {/* Abstract Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[500px] bg-rose-600/30 blur-[120px] rounded-full pointer-events-none" />

          <div className="container relative z-10 mx-auto px-6 text-center lg:px-12">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-6 sm:text-4xl md:text-5xl">
              Santun Dalam Pekerti, Unggul dalam Prestasi dan Kondusif dalam Edukasi
            </h2>
          </div>
        </section>

        {/* --- Footer --- */}
        <footer className="app-footer w-full flex-col sm:flex-row gap-4 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="app-footer__credit">
            <span className="app-footer__label dark:text-slate-300">
              Developed by
            </span>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="app-footer__social"
              aria-label="Instagram pengembang"
            >
              <Instagram className="h-4 w-4" />
              <span className="text-sm font-medium">@y_usr1</span>
            </a>
          </div>
          <span className="app-footer__version dark:text-slate-400">
            Versi {appVersion}
          </span>
        </footer>

      </main>
    </div>
  );
};

export default LandingPage;
