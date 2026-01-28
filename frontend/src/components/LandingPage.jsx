import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";

/**
 * Komponen reusable untuk kartu fitur
 */
const FeatureCard = ({ icon: Icon, title, description, color, comingSoon }) => (
  <div className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
    {comingSoon && (
      <div className="absolute top-4 right-4 rounded-full bg-rose-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:bg-rose-500/20 dark:text-rose-300">
        Coming Soon
      </div>
    )}
    <div className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${color} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
      <Icon className="h-6 w-6" />
    </div>
    <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">
      {title}
    </h3>
    <p className="leading-relaxed text-slate-600 dark:text-slate-400">
      {description}
    </p>
    <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-current opacity-5 blur-2xl transition-opacity group-hover:opacity-10" style={{ color: color.replace('bg-', 'text-') }} />
  </div>
);

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const loginLogoUrl = "/images/login-logo.png";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
              src="/media/hero/hero-image-1.jpg"
              alt="School Atmosphere"
              // ATUR OPASITI DI SINI: opacity-40 (0.4) untuk light mode, dark:opacity-20 (0.2) untuk dark mode
              className="h-full w-full object-cover opacity-100 dark:opacity-90"
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

              <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-7xl mb-8 leading-tight">
                Membangun Karakter <br />
                <span className="bg-gradient-to-r from-rose-600 to-orange-500 bg-clip-text text-transparent">
                  Generasi Berprestasi
                </span>
              </h1>

              <p className="max-w-2xl text-xl leading-8 text-slate-700 dark:text-slate-300 font-medium">
                Platform manajemen kesiswaan yang modern, aman, dan mudah digunakan.
                Pantau kedisiplinan dan apresiasi pencapaian siswa dalam satu dashboard terintegrasi.
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
        <section className="py-12 sm:py-24 overflow-hidden bg-slate-50 dark:bg-slate-950">
          <div className="container mx-auto px-6 mb-8 sm:mb-12 text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Galeri Siswa Berprestasi</h2>
            <p className="text-slate-500 dark:text-slate-400">Kebanggaan sekolah kami di kancah nasional dan internasional</p>
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

            {/* --- Seamless Photo Marquee --- */}
            <div className="flex animate-scroll py-4">
              {/* Duplikat array konten agar loop mulus (total 2 set) */}
              {[...Array(2)].map((_, groupIndex) => (
                <div key={groupIndex} className="flex shrink-0">
                  {[
                    { name: "Siti Aminah", event: "Olimpiade Matematika", img: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?auto=format&fit=crop&w=400&q=80" },
                    { name: "Budi Santoso", event: "Lomba Robotik", img: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=80" },
                    { name: "Dewi Sartika", event: "Debat Bahasa Inggris", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80" },
                    { name: "Rizky Pratama", event: "Futsal Championship", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80" },
                    { name: "Anisa Rahma", event: "Karya Ilmiah", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80" },
                    { name: "Dimas Anggara", event: "Seni Lukis", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80" },
                  ].map((item, i) => (
                    <div key={`${groupIndex}-${i}`} className="group relative h-56 w-36 sm:h-72 sm:w-52 shrink-0 overflow-hidden cursor-pointer border-r border-white/20 dark:border-slate-800/20">
                      {/* Foto Siswa */}
                      <img
                        src={item.img}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      {/* Overlay Gradient saat Hover */}
                      <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                      {/* Teks Info */}
                      <div className="absolute bottom-0 left-0 p-3 sm:p-5 translate-y-4 text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <p className="font-bold text-sm sm:text-lg leading-tight">{item.name}</p>
                        <p className="text-[10px] sm:text-xs text-rose-300 mt-1 uppercase tracking-wider font-semibold">{item.event}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

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
        <footer className="border-t border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-950">
          <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-6 lg:flex-row lg:px-12">
            <div className="flex items-center gap-2">
              <School className="h-6 w-6 text-rose-600" />
              <span className="font-bold text-slate-900 dark:text-white">DISPO SMANKA</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} Sistem Pembinaan Siswa. Hak Cipta Dilindungi.
            </p>
          </div>
        </footer>

      </main>
    </div>
  );
};

export default LandingPage;
