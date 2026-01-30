// Laporan monitoring siswa berdasarkan kelas serta status pelanggaran aktif
import React, { useEffect, useMemo, useState } from "react";
import { dashboardService, guardianshipService } from "../services/api";
import { toast } from "sonner";
import { Download, FileText, ChevronDown, X, Clock3, MapPin, Trophy, AlertTriangle, Search } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { formatNumericId } from "../lib/formatters";



// Komponen laporan yang siap cetak untuk wali kelas dan guru BK
const StudentReport = () => {
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState([]);
  const [openClasses, setOpenClasses] = useState({});
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        const response = await dashboardService.getStats();
        const list =
          response.data?.student_violation_summaries &&
            Array.isArray(response.data.student_violation_summaries)
            ? response.data.student_violation_summaries
            : [];
        setSummaries(list);
      } catch (error) {
        console.error("Failed to fetch student report:", error);
        toast.error("Gagal memuat laporan siswa");
      } finally {
        setLoading(false);
      }
    };

    fetchSummaries();
  }, []);

  // Kelompokkan ringkasan siswa per kelas untuk kebutuhan rendering
  const groupedByClass = useMemo(() => {
    const filtered = summaries.filter(s => {
      const q = searchQuery.toLowerCase();
      return s.nama.toLowerCase().includes(q) || s.nis.includes(q);
    });

    // Auto-open classes if search is active
    if (searchQuery && filtered.length > 0) {
      const classesToOpen = {};
      filtered.forEach(item => {
        const key = item.kelas || "Tidak diketahui";
        classesToOpen[key] = true;
      });
      setOpenClasses(prev => ({ ...prev, ...classesToOpen }));
    }

    return filtered.reduce((acc, item) => {
      const key = item.kelas || "Tidak diketahui";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  }, [summaries, searchQuery]);

  const toggleClass = (kelasKey) => {
    setOpenClasses((prev) => ({
      ...prev,
      [kelasKey]: !prev[kelasKey],
    }));
  };

  const handleDownloadPdf = (kelasKey, items) => {
    const doc = new jsPDF();
    const reportDate = format(new Date(), "dd MMMM yyyy", { locale: localeID });

    // Title
    doc.setFontSize(16);
    doc.text(`Laporan Monitoring Siswa - Kelas ${kelasKey.toUpperCase()}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${reportDate}`, 14, 28);

    const tableBody = items.map((s) => [
      s.nama,
      formatNumericId(s.nis),
      formatNumericId(s.angkatan),
      s.status_label,
      `${s.active_counts?.ringan || 0} Ringan, ${s.active_counts?.sedang || 0} Sedang, ${s.active_counts?.berat || 0} Berat`,
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["Nama", "NIS", "Angkatan", "Status", "Pelanggaran Aktif"]],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [200, 32, 32] }, // Red header
      styles: { fontSize: 9 },
    });

    doc.save(`laporan-siswa-${kelasKey}.pdf`);
  };

  const handleDownloadStudentPdf = (student) => {
    const doc = new jsPDF();
    const reportDate = format(new Date(), "dd MMMM yyyy", { locale: localeID });

    // Header Info
    doc.setFontSize(16);
    doc.text(`Laporan Riwayat Pelanggaran Siswa`, 14, 20);

    doc.setFontSize(10);
    const infoStartY = 30;
    doc.text(`Nama: ${student.nama}`, 14, infoStartY);
    doc.text(`NIS: ${formatNumericId(student.nis)}`, 14, infoStartY + 6);
    doc.text(`Kelas: ${student.kelas || "-"}`, 14, infoStartY + 12);
    doc.text(`Angkatan: ${formatNumericId(student.angkatan)}`, 14, infoStartY + 18);
    doc.text(`Tanggal Cetak: ${reportDate}`, 14, infoStartY + 24);

    // Violation Table
    const violations = student.violations || [];
    const tableBody = violations.map((v) => [
      v.waktu ? format(new Date(v.waktu), "dd/MM/yyyy HH:mm") : "-",
      v.jenis || "-",
      v.kategori ? v.kategori.charAt(0).toUpperCase() + v.kategori.slice(1) : "-",
      v.status_display || "-",
      v.catatan_pembinaan || "-"
    ]);

    if (violations.length === 0) {
      doc.text("Tidak ada riwayat pelanggaran tercatat.", 14, infoStartY + 35);
    } else {
      autoTable(doc, {
        startY: infoStartY + 32,
        head: [["Waktu", "Pelanggaran", "Kategori", "Status", "Catatan Pembinaan"]],
        body: tableBody,
        theme: "grid",
        headStyles: { fillColor: [200, 32, 32] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 'auto' },
        }
      });
    }

    doc.save(`riwayat-pelanggaran-${student.nama.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  };

  const handleViewDetail = async (nis) => {
    setDetailLoading(true);
    try {
      const { data } = await guardianshipService.getStudentDetails(nis);
      setSelectedDetail(data);
    } catch (error) {
      toast.error("Gagal memuat detail siswa");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setSelectedDetail(null);

  // Helper styles
  const violationCountColors = {
    ringan: "bg-yellow-100 text-yellow-800",
    sedang: "bg-orange-100 text-orange-800",
    berat: "bg-red-100 text-red-800",
  };

  const pageShellClasses =
    "min-h-screen space-y-6 sm:space-y-4 bg-rose-50/80 text-gray-900 dark:bg-slate-950 dark:text-slate-100 px-3 sm:px-4 lg:px-6 py-6 transition-colors";
  const cardClasses =
    "rounded-[8px] bg-white/95 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/70 dark:shadow-xl dark:shadow-black/40 dark:ring-1 dark:ring-slate-700/60";
  const compactCardClasses =
    "rounded-[8px] bg-white/95 p-0 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/70 dark:shadow-xl dark:shadow-black/40 dark:ring-1 dark:ring-slate-700/60";
  const primaryButtonClasses =
    "inline-flex items-center justify-center gap-2 rounded-full bg-rose-500 px-2 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1 focus:ring-offset-rose-50 dark:focus:ring-offset-slate-950";
  const inputClasses =
    "w-full rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm font-medium text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-rose-400 dark:focus:ring-rose-500/30";

  return (
    <div className={`${pageShellClasses} print:bg-white`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          {/* <div className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-slate-400">
            Laporan Siswa
          </div> */}
          <div>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Laporan Monitoring Siswa
            </h1>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Ringkasan pelanggaran per kelas binaan.
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Cari nama atau NIS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${inputClasses} pl-10`}
          />
        </div>
      </div>

      {loading ? (
        <div className={`${cardClasses} flex items-center justify-center`}>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Memuat laporan siswa...
          </p>
        </div>
      ) : !summaries.length && !searchQuery ? (
        <div className={`${cardClasses} flex items-center justify-center`}>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Tidak ada data siswa yang perlu ditampilkan.
          </p>
        </div>
      ) : Object.keys(groupedByClass).length === 0 && searchQuery ? (
        <div className={`${cardClasses} flex items-center justify-center`}>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Tidak ditemukan siswa dengan kata kunci "{searchQuery}"
          </p>
        </div>
      ) : (
        Object.entries(groupedByClass)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([kelas, items]) => {
            const isOpen = !!openClasses[kelas];
            return (
              <section
                key={kelas}
                className={`${compactCardClasses} overflow-hidden border border-gray-200 shadow-lg dark:border-slate-800/70`}
              >
                <div
                  onClick={() => toggleClass(kelas)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-t-[8px] border-b border-gray-100 bg-[#C82020] px-4 py-3 text-left text-white transition hover:brightness-105 dark:border-slate-800 dark:bg-[#a11818] sm:px-5 sm:py-3.5"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      toggleClass(kelas);
                    }
                  }}
                >
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">
                      Kelas {kelas.toUpperCase()}
                    </h2>
                    <p className="text-xs font-medium opacity-85">
                      {searchQuery ? `Hasil pencarian: ${items.length} siswa` : `Total siswa diawasi: ${items.length}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 opacity-80" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPdf(kelas, items);
                      }}
                      className={`${primaryButtonClasses}`}
                      aria-label="Unduh PDF"
                      title="Unduh PDF"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <ChevronDown
                      className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""
                        }`}
                    />
                  </div>
                </div>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-gray-100 bg-[#f94449] text-xs font-semibold uppercase tracking-[0.2em] text-white dark:border-slate-800 dark:bg-[#a11818]">
                          <th className="px-4 py-3 text-left">Nama</th>
                          <th className="px-4 py-3 text-left">NIS</th>
                          <th className="px-4 py-3 text-left">Angkatan</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">
                            Pelanggaran Aktif
                          </th>
                          <th className="px-4 py-3 text-left">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((student) => (
                          <tr
                            key={student.nis}
                            onClick={() => handleViewDetail(student.nis)}
                            className="border-b border-gray-100/80 transition hover:bg-rose-50 dark:border-slate-800/60 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">
                              {student.nama}
                            </td>
                            <td className="px-4 py-3 text-gray-900 dark:text-slate-100">
                              {formatNumericId(student.nis)}
                            </td>
                            <td className="px-4 py-3 text-gray-900 dark:text-slate-100">
                              {formatNumericId(student.angkatan)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-100">
                                {student.status_label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-900 dark:text-slate-100">
                              {`${student.active_counts?.ringan || 0} ringan, ${student.active_counts?.sedang || 0
                                } sedang, ${student.active_counts?.berat || 0
                                } berat`}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleDownloadStudentPdf(student)}
                                className="inline-flex items-center justify-center rounded-full bg-rose-100 p-2 text-rose-600 transition hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-200 dark:hover:bg-rose-500/30"
                                title="Unduh Riwayat Pelanggaran"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            );
          })
      )}


      {/* Detail Modal */}
      {(selectedDetail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8" onClick={closeDetail}>
          <div className="relative w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {detailLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b px-6 py-4 dark:border-slate-800">
                  <h2 className="text-lg font-bold">Detail Siswa</h2>
                  <button onClick={closeDetail} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-slate-800">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="overflow-y-auto px-6 py-6">
                  <div className="flex flex-col gap-1 mb-6">
                    <h3 className="text-2xl font-bold">{selectedDetail.violation_summary?.nama}</h3>
                    <p className="text-gray-500 dark:text-slate-400">{selectedDetail.violation_summary?.kelas} • NIS {formatNumericId(selectedDetail.violation_summary?.nis)}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {["ringan", "sedang", "berat"].map(sev => (
                      <div key={sev} className="rounded-lg border bg-gray-50 p-4 text-center dark:border-slate-800 dark:bg-slate-800/50">
                        <div className="text-xs uppercase tracking-wider text-gray-500">Pelanggaran {sev}</div>
                        <div className={`text-2xl font-bold ${sev === "berat" && selectedDetail.violation_summary?.active_counts[sev] > 0 ? "text-red-600" :
                          sev === "sedang" && selectedDetail.violation_summary?.active_counts[sev] > 0 ? "text-orange-600" :
                            "text-gray-800 dark:text-gray-100"
                          }`}>
                          {selectedDetail.violation_summary?.active_counts[sev] || 0}
                        </div>
                      </div>
                    ))}
                  </div>

                  <h4 className="flex items-center gap-2 mb-4 font-semibold text-rose-600">
                    <AlertTriangle className="h-5 w-5" /> Riwayat Pelanggaran
                  </h4>
                  {selectedDetail.violation_summary?.violations?.length > 0 ? (
                    <div className="space-y-3 mb-8">
                      {selectedDetail.violation_summary.violations.map(v => (
                        <div key={v.id} className="rounded-lg border p-4 dark:border-slate-800 group hover:shadow-sm transition">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mb-1 ${violationCountColors[v.kategori] || "bg-gray-100"}`}>
                                {v.kategori}
                              </span>
                              <div className="font-semibold">{v.jenis}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                                <Clock3 className="h-3 w-3" />
                                {format(parseISO(v.waktu), "dd MMM yyyy", { locale: localeID })}
                              </div>
                              <span className="text-[10px] uppercase font-bold text-gray-400">{v.status.replace("_", " ")}</span>
                            </div>
                          </div>
                          {v.detail && <p className="text-sm text-gray-600 dark:text-slate-400">{v.detail}</p>}
                          {v.tempat && <div className="mt-2 text-xs text-gray-400 flex items-center gap-1"><MapPin className="h-3 w-3" /> {v.tempat}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 border rounded-lg bg-gray-50 dark:bg-slate-800/50 mb-8">Tidak ada riwayat pelanggaran.</div>
                  )}

                  <h4 className="flex items-center gap-2 mb-4 font-semibold text-blue-600">
                    <Trophy className="h-5 w-5" /> Riwayat Prestasi
                  </h4>
                  {selectedDetail.achievements?.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDetail.achievements.map(a => (
                        <div key={a.id} className="rounded-lg border p-4 dark:border-slate-800 border-l-4 border-l-blue-500 hover:shadow-sm transition">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">{a.judul}</div>
                              <div className="text-sm text-blue-600">{a.kategori} • {a.tingkat}</div>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock3 className="h-3 w-3" />
                              {format(parseISO(a.tanggal_prestasi), "dd MMM yyyy", { locale: localeID })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 border rounded-lg bg-gray-50 dark:bg-slate-800/50">Tidak ada riwayat prestasi.</div>
                  )}
                </div>

                <div className="bg-gray-50 p-4 border-t text-right dark:bg-slate-900 dark:border-slate-800">
                  <button onClick={closeDetail} className="rounded-lg bg-white border px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700">
                    Tutup
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentReport;
