import React, { useEffect, useMemo, useState } from "react";
import { dashboardService } from "../services/api";
import { toast } from "sonner";

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

const StudentReport = () => {
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState([]);

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

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="modern-card p-10 text-center">
        <p className="text-gray-600 text-sm">Memuat laporan siswa...</p>
      </div>
    );
  }

  if (!summaries.length) {
    return (
      <div className="modern-card p-10 text-center">
        <p className="text-gray-600 text-sm">
          Tidak ada data siswa yang perlu ditampilkan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:bg-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Laporan Monitoring Siswa
          </h1>
          <p className="text-gray-500 text-sm">
            Daftar ringkasan pelanggaran menurut kelas binaan.
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="btn-primary self-start print:hidden"
        >
          Unduh PDF
        </button>
      </div>

      {Object.entries(groupedByClass)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([kelas, items]) => (
          <section key={kelas} className="modern-card overflow-hidden">
            <header className="border-b border-gray-100 bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Kelas {kelas.toUpperCase()}
              </h2>
            <p className="text-xs text-gray-500">
              Total siswa diawasi: {items.length}
            </p>
          </header>
          <div className="overflow-x-auto">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>NIS</th>
                  <th>Angkatan</th>
                  <th>Status</th>
                  <th>Pelanggaran Aktif</th>
                </tr>
              </thead>
              <tbody>
                {items.map((student) => (
                  <tr key={student.nis}>
                    <td className="font-medium text-gray-900">{student.nama}</td>
                    <td>{normalizeIntegerText(student.nis)}</td>
                    <td>{normalizeIntegerText(student.angkatan)}</td>
                    <td>{student.status_label}</td>
                    <td>
                      {`${student.active_counts?.ringan || 0} ringan, ${
                        student.active_counts?.sedang || 0
                      } sedang, ${student.active_counts?.berat || 0} berat`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
};

export default StudentReport;
