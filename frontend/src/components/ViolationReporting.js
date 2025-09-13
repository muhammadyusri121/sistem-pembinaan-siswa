import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { apiClient } from '../services/api';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  Search, 
  Calendar, 
  MapPin, 
  Camera, 
  Send,
  FileText,
  Clock,
  User,
  BookOpen
} from 'lucide-react';

// Use configured API client with auth header

const ViolationReporting = () => {
  const { user } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [violationTypes, setViolationTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [violation, setViolation] = useState({
    nis_siswa: '',
    jenis_pelanggaran_id: '',
    waktu_kejadian: '',
    tempat: '',
    detail_kejadian: '',
    bukti_foto: ''
  });

  useEffect(() => {
    fetchStudents();
    fetchViolationTypes();
    // Set default time to current time
    setViolation(prev => ({
      ...prev,
      waktu_kejadian: new Date().toISOString().slice(0, 16)
    }));
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await apiClient.get(`/siswa`);
      setStudents(response.data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast.error('Gagal memuat data siswa');
    }
  };

  const fetchViolationTypes = async () => {
    try {
      const response = await apiClient.get(`/master-data/jenis-pelanggaran`);
      setViolationTypes(response.data);
    } catch (error) {
      console.error('Failed to fetch violation types:', error);
      toast.error('Gagal memuat jenis pelanggaran');
    }
  };

  const handleStudentSearch = async (term) => {
    if (term.trim()) {
      try {
        const response = await apiClient.get(`/siswa/search/${term}`);
        setStudents(response.data);
      } catch (error) {
        console.error('Search failed:', error);
      }
    } else {
      fetchStudents();
    }
  };

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setViolation(prev => ({ ...prev, nis_siswa: student.nis }));
    setShowStudentModal(false);
    setSearchTerm('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!violation.nis_siswa) {
      toast.error('Pilih siswa terlebih dahulu');
      return;
    }
    
    if (!violation.jenis_pelanggaran_id) {
      toast.error('Pilih jenis pelanggaran');
      return;
    }

    setLoading(true);
    try {
      const violationData = {
        ...violation,
        waktu_kejadian: new Date(violation.waktu_kejadian).toISOString()
      };
      
      await apiClient.post(`/pelanggaran`, violationData);
      toast.success('Pelanggaran berhasil dilaporkan');
      
      // Reset form
      setSelectedStudent(null);
      setViolation({
        nis_siswa: '',
        jenis_pelanggaran_id: '',
        waktu_kejadian: new Date().toISOString().slice(0, 16),
        tempat: '',
        detail_kejadian: '',
        bukti_foto: ''
      });
    } catch (error) {
      console.error('Failed to report violation:', error);
      toast.error('Gagal melaporkan pelanggaran');
    }
    setLoading(false);
  };

  const filteredStudents = students.filter(student =>
    student.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.id_kelas.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getViolationTypeInfo = (id) => {
    return violationTypes.find(v => v.id === id);
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lapor Pelanggaran</h1>
          <p className="text-gray-600 mt-1">Laporkan pelanggaran siswa dengan detail lengkap</p>
        </div>
        
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <User className="w-4 h-4" />
          <span>Pelapor: {user?.full_name}</span>
        </div>
      </div>

      {/* Warning Info */}
      <div className="modern-card p-6 border-l-4 border-yellow-500 bg-yellow-50">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-2">Panduan Pelaporan</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Pastikan informasi yang dilaporkan akurat dan sesuai fakta</li>
              <li>• Isi detail kejadian dengan lengkap untuk memudahkan proses pembinaan</li>
              <li>• Upload bukti foto jika tersedia (opsional)</li>
              <li>• Laporan akan diteruskan ke wali kelas dan guru BK terkait</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="modern-card p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Selection */}
          <div className="form-group">
            <label className="form-label">Pilih Siswa</label>
            <div className="space-y-3">
              {selectedStudent ? (
                <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedStudent.nama}</p>
                      <p className="text-sm text-gray-600">
                        NIS: {selectedStudent.nis} • Kelas: {selectedStudent.id_kelas} • Angkatan: {selectedStudent.angkatan}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowStudentModal(true)}
                    className="btn-secondary text-sm"
                  >
                    Ganti Siswa
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowStudentModal(true)}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-red-500 hover:bg-red-50 transition-colors"
                >
                  <Search className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Klik untuk memilih siswa</p>
                </button>
              )}
            </div>
          </div>

          {/* Violation Type */}
          <div className="form-group">
            <label className="form-label">Jenis Pelanggaran</label>
            <select
              value={violation.jenis_pelanggaran_id}
              onChange={(e) => setViolation({...violation, jenis_pelanggaran_id: e.target.value})}
              className="modern-input"
              required
            >
              <option value="">Pilih jenis pelanggaran</option>
              {violationTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.nama_pelanggaran} - {type.kategori} ({type.poin} poin)
                </option>
              ))}
            </select>
            
            {violation.jenis_pelanggaran_id && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                {(() => {
                  const typeInfo = getViolationTypeInfo(violation.jenis_pelanggaran_id);
                  return typeInfo ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`badge ${
                          typeInfo.kategori === 'Berat' ? 'badge-danger' : 
                          typeInfo.kategori === 'Sedang' ? 'badge-warning' : 'badge-info'
                        }`}>
                          {typeInfo.kategori}
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          Poin: {typeInfo.poin}
                        </span>
                      </div>
                      {typeInfo.deskripsi && (
                        <p className="text-sm text-gray-600">{typeInfo.deskripsi}</p>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Waktu Kejadian</label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={violation.waktu_kejadian}
                  onChange={(e) => setViolation({...violation, waktu_kejadian: e.target.value})}
                  className="modern-input pl-10"
                  required
                />
                <Clock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tempat Kejadian</label>
              <div className="relative">
                <input
                  type="text"
                  value={violation.tempat}
                  onChange={(e) => setViolation({...violation, tempat: e.target.value})}
                  className="modern-input pl-10"
                  placeholder="contoh: Ruang Kelas 10A, Kantin, Halaman Sekolah"
                  required
                />
                <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Detail */}
          <div className="form-group">
            <label className="form-label">Detail Kejadian</label>
            <div className="relative">
              <textarea
                value={violation.detail_kejadian}
                onChange={(e) => setViolation({...violation, detail_kejadian: e.target.value})}
                className="modern-input min-h-32 pl-10 pt-4"
                placeholder="Jelaskan secara detail kronologi kejadian, siapa saja yang terlibat, dan dampak yang ditimbulkan..."
                required
              />
              <FileText className="w-5 h-5 text-gray-400 absolute left-3 top-4" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Minimal 50 karakter. Berikan informasi sedetail mungkin untuk memudahkan proses pembinaan.
            </p>
          </div>

          {/* Evidence Photo (Optional) */}
          <div className="form-group">
            <label className="form-label">Bukti Foto (Opsional)</label>
            <div className="relative">
              <input
                type="text"
                value={violation.bukti_foto}
                onChange={(e) => setViolation({...violation, bukti_foto: e.target.value})}
                className="modern-input pl-10"
                placeholder="URL foto bukti (jika ada)"
              />
              <Camera className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Upload foto ke layanan cloud dan masukkan URL-nya di sini, atau kosongkan jika tidak ada bukti foto.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setSelectedStudent(null);
                setViolation({
                  nis_siswa: '',
                  jenis_pelanggaran_id: '',
                  waktu_kejadian: new Date().toISOString().slice(0, 16),
                  tempat: '',
                  detail_kejadian: '',
                  bukti_foto: ''
                });
              }}
              className="btn-secondary"
              disabled={loading}
            >
              Reset Form
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Melaporkan...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Laporkan Pelanggaran
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Student Selection Modal */}
      {showStudentModal && (
        <div className="modal-overlay" onClick={() => setShowStudentModal(false)}>
          <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Pilih Siswa</h2>
            
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan NIS, nama, atau kelas..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    handleStudentSearch(e.target.value);
                  }}
                  className="modern-input pl-10"
                />
              </div>
            </div>

            {/* Students Grid */}
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredStudents.map(student => (
                  <div
                    key={student.nis}
                    onClick={() => selectStudent(student)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{student.nama}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>NIS: {student.nis}</span>
                          <span>•</span>
                          <span className="badge badge-info text-xs">{student.id_kelas}</span>
                          <span>•</span>
                          <span>{student.angkatan}</span>
                        </div>
                      </div>
                      <BookOpen className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredStudents.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? 'Tidak ada siswa yang ditemukan' : 'Memuat data siswa...'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowStudentModal(false)}
                className="btn-secondary"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViolationReporting;
