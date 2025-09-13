import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Users, 
  Search, 
  Plus, 
  Upload, 
  Download, 
  Filter,
  Edit,
  Trash2,
  Eye,
  FileSpreadsheet
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StudentManagement = () => {
  const { user } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [newStudent, setNewStudent] = useState({
    nis: '',
    nama: '',
    id_kelas: '',
    angkatan: '',
    jenis_kelamin: 'L',
    aktif: true
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/siswa`);
      setStudents(response.data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast.error('Gagal memuat data siswa');
    }
    setLoading(false);
  };

  const handleSearch = async (term) => {
    if (term.trim()) {
      try {
        const response = await axios.get(`${API}/siswa/search/${term}`);
        setStudents(response.data);
      } catch (error) {
        console.error('Search failed:', error);
      }
    } else {
      fetchStudents();
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/siswa`, newStudent);
      toast.success('Siswa berhasil ditambahkan');
      setShowAddModal(false);
      setNewStudent({
        nis: '',
        nama: '',
        id_kelas: '',
        angkatan: '',
        jenis_kelamin: 'L',
        aktif: true
      });
      fetchStudents();
    } catch (error) {
      console.error('Failed to add student:', error);
      toast.error('Gagal menambahkan siswa');
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);

    setUploadLoading(true);
    try {
      const response = await axios.post(`${API}/siswa/upload-csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success(`Upload berhasil! ${response.data.success_count} siswa ditambahkan`);
      if (response.data.error_count > 0) {
        toast.warning(`${response.data.error_count} data gagal diproses`);
      }
      
      setShowUploadModal(false);
      setUploadFile(null);
      fetchStudents();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Gagal upload file');
    }
    setUploadLoading(false);
  };

  const filteredStudents = students.filter(student =>
    student.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.id_kelas.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Siswa</h1>
          <p className="text-gray-600 mt-1">Kelola data siswa sekolah</p>
        </div>
        
        {user?.role === 'admin' && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Tambah Siswa
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Siswa</p>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Siswa Aktif</p>
              <p className="text-2xl font-bold text-gray-900">
                {students.filter(s => s.aktif).length}
              </p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Laki-laki</p>
              <p className="text-2xl font-bold text-gray-900">
                {students.filter(s => s.jenis_kelamin === 'L').length}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Perempuan</p>
              <p className="text-2xl font-bold text-gray-900">
                {students.filter(s => s.jenis_kelamin === 'P').length}
              </p>
            </div>
            <Users className="w-8 h-8 text-pink-600" />
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="modern-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berdasarkan NIS, nama, atau kelas..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleSearch(e.target.value);
              }}
              className="modern-input pl-10"
            />
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="modern-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th>NIS</th>
                <th>Nama</th>
                <th>Kelas</th>
                <th>Angkatan</th>
                <th>Jenis Kelamin</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.nis}>
                  <td className="font-medium">{student.nis}</td>
                  <td>{student.nama}</td>
                  <td>
                    <span className="badge badge-info">{student.id_kelas}</span>
                  </td>
                  <td>{student.angkatan}</td>
                  <td>
                    <span className={`badge ${student.jenis_kelamin === 'L' ? 'badge-info' : 'badge-warning'}`}>
                      {student.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${student.aktif ? 'badge-success' : 'badge-danger'}`}>
                      {student.aktif ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      {user?.role === 'admin' && (
                        <>
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Tambah Siswa Baru</h2>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">NIS</label>
                  <input
                    type="text"
                    value={newStudent.nis}
                    onChange={(e) => setNewStudent({...newStudent, nis: e.target.value})}
                    className="modern-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap</label>
                  <input
                    type="text"
                    value={newStudent.nama}
                    onChange={(e) => setNewStudent({...newStudent, nama: e.target.value})}
                    className="modern-input"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="form-label">Kelas</label>
                  <input
                    type="text"
                    value={newStudent.id_kelas}
                    onChange={(e) => setNewStudent({...newStudent, id_kelas: e.target.value})}
                    className="modern-input"
                    placeholder="contoh: 10A"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Angkatan</label>
                  <input
                    type="text"
                    value={newStudent.angkatan}
                    onChange={(e) => setNewStudent({...newStudent, angkatan: e.target.value})}
                    className="modern-input"
                    placeholder="contoh: 2024"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Jenis Kelamin</label>
                  <select
                    value={newStudent.jenis_kelamin}
                    onChange={(e) => setNewStudent({...newStudent, jenis_kelamin: e.target.value})}
                    className="modern-input"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Tambah Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload CSV Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Data Siswa</h2>
            
            <div className="mb-6">
              <div className="p-4 bg-blue-50 rounded-lg mb-4">
                <h3 className="font-medium text-blue-900 mb-2">Format File CSV/Excel:</h3>
                <p className="text-sm text-blue-700 mb-2">File harus memiliki kolom berikut:</p>
                <code className="text-xs bg-blue-100 p-2 rounded block">
                  nis,nama,id_kelas,angkatan,jeniskelamin,aktif
                </code>
                <p className="text-xs text-blue-600 mt-2">
                  Contoh: 20240001,Budi Setiawan,10A,2024,L,true
                </p>
              </div>
            </div>
            
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Pilih File</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Klik untuk memilih file
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    Format yang didukung: CSV, Excel (.xlsx, .xls)
                  </p>
                  {uploadFile && (
                    <p className="text-sm text-green-600 mt-2">
                      File dipilih: {uploadFile.name}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn-secondary"
                  disabled={uploadLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                  disabled={uploadLoading}
                >
                  {uploadLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Mengupload...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;