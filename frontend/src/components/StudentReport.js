// Laporan monitoring siswa berdasarkan kelas serta status pelanggaran aktif
import React, { useEffect, useMemo, useState } from "react";
import { dashboardService } from "../services/api";
import { toast } from "sonner";
import { Download, FileText, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";

// Membersihkan format angka agar table mudah dibaca
const normalizeIntegerText = (value) => {
  if (value === null || value === undefined) return "-";
  const str = String(value);
  if (/^\d+\.0+$/.test(str)) {
    return str.split(".")[0];
  }
  const parsed = Number(str);
  if (!Number.isNaN(parsed) && Number.isInteger(parsed)) {
    return String(parsed);
  }
  return str;
};

// Komponen laporan yang siap cetak untuk wali kelas dan guru BK
const StudentReport = () => {
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState([]);
  const [openClasses, setOpenClasses] = useState({});

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
    return summaries.reduce((acc, item) => {
      const key = item.kelas || "Tidak diketahui";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  }, [summaries]);

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
      normalizeIntegerText(s.nis),
      normalizeIntegerText(s.angkatan),
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

  const pageShellClasses =
    "min-h-screen space-y-6 sm:space-y-4 bg-rose-50/80 text-gray-900 dark:bg-slate-950 dark:text-slate-100 px-3 sm:px-4 lg:px-6 py-6 transition-colors";
  const cardClasses =
    "rounded-[8px] bg-white/95 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/70 dark:shadow-xl dark:shadow-black/40 dark:ring-1 dark:ring-slate-700/60";
  const compactCardClasses =
    "rounded-[8px] bg-white/95 p-0 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:border dark:border-slate-800/60 dark:bg-slate-900/70 dark:shadow-xl dark:shadow-black/40 dark:ring-1 dark:ring-slate-700/60";
  const primaryButtonClasses =
    "inline-flex items-center justify-center gap-2 rounded-full bg-rose-500 px-2 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1 focus:ring-offset-rose-50 dark:focus:ring-offset-slate-950";

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
      </div>

      {loading ? (
        <div className={`${cardClasses} flex items-center justify-center`}>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Memuat laporan siswa...
          </p>
        </div>
      ) : !summaries.length ? (
        <div className={`${cardClasses} flex items-center justify-center`}>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Tidak ada data siswa yang perlu ditampilkan.
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
                      Total siswa diawasi: {items.length}
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
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((student) => (
                          <tr
                            key={student.nis}
                            className="border-b border-gray-100/80 transition hover:bg-rose-50 dark:border-slate-800/60 dark:hover:bg-slate-800"
                          >
                            <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">
                              {student.nama}
                            </td>
                            <td className="px-4 py-3 text-gray-900 dark:text-slate-100">
                              {normalizeIntegerText(student.nis)}
                            </td>
                            <td className="px-4 py-3 text-gray-900 dark:text-slate-100">
                              {normalizeIntegerText(student.angkatan)}
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
    </div >
  );
};

export default StudentReport;
