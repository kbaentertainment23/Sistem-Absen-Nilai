import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Student, AttendanceRecord, GradeFormative, GradeSummative, StudentNote, SpreadsheetInfo } from '../types';
import { generatePDF } from '../utils/pdfGenerator';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  HelpCircle, 
  Loader2, 
  Printer, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  User, 
  BookOpen, 
  Settings,
  X,
  FileSpreadsheet,
  Award,
  ChevronDown,
  GraduationCap,
  CheckSquare,
  Users
} from 'lucide-react';

interface ExportTabProps {
  connectedSpreadsheet?: SpreadsheetInfo | null;
  onDownloadFile?: (format: 'pdf' | 'xlsx') => Promise<void>;
  students: Student[];
  attendance: AttendanceRecord[];
  formativeGrades: GradeFormative[];
  summativeGrades: GradeSummative[];
  notes: StudentNote[];
  activeClassName: string;
}

export default function ExportTab({ 
  connectedSpreadsheet, 
  onDownloadFile,
  students = [],
  attendance = [],
  formativeGrades = [],
  summativeGrades = [],
  notes = [],
  activeClassName = 'Kelas 8.1'
}: ExportTabProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<'pdf' | 'xlsx' | null>(null);
  
  // Customizer state for printable report
  const [kepalaSekolah, setKepalaSekolah] = useState<string>(() => localStorage.getItem('report_headmaster_name') || 'Dra. H. Siti Maryam, M.Pd.');
  const [nipKepalaSekolah, setNipKepalaSekolah] = useState<string>(() => localStorage.getItem('report_headmaster_nip') || '19740812 199903 2 001');
  const [waliKelas, setWaliKelas] = useState<string>(() => localStorage.getItem('report_teacher_name') || 'Ahmad Rosadi, S.Pd.');
  const [nipWaliKelas, setNipWaliKelas] = useState<string>(() => localStorage.getItem('report_teacher_nip') || '19850615 201101 1 003');
  const [mataPelajaran, setMataPelajaran] = useState<string>(() => localStorage.getItem('report_teacher_subject') || 'Informatika');
  const [tahunAjaran, setTahunAjaran] = useState<string>('2026/2027');
  const [semester, setSemester] = useState<string>('Ganjil');
  const [tanggalLaporan, setTanggalLaporan] = useState<string>(
    new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  );

  React.useEffect(() => {
    localStorage.setItem('report_teacher_subject', mataPelajaran);
    localStorage.setItem('report_teacher_name', waliKelas);
    localStorage.setItem('report_teacher_nip', nipWaliKelas);
    localStorage.setItem('report_headmaster_name', kepalaSekolah);
    localStorage.setItem('report_headmaster_nip', nipKepalaSekolah);
  }, [mataPelajaran, waliKelas, nipWaliKelas, kepalaSekolah, nipKepalaSekolah]);

  // Layout selection states
  const [includePresensi, setIncludePresensi] = useState<boolean>(true);
  const [includeNilai, setIncludeNilai] = useState<boolean>(true);
  const [includeCatatan, setIncludeCatatan] = useState<boolean>(true);

  // Status Alerts
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Handle Google Drive Download fallback if iframe blocks
  const handleDriveDownload = async (format: 'pdf' | 'xlsx') => {
    if (!connectedSpreadsheet) return;
    setDownloadingFormat(format);
    setErrorMessage('');
    setSuccessMessage('');

    if (format === 'pdf') {
      try {
        await generatePDF({
          reportType: 'collective',
          config: {
            schoolName: 'SATUAN PENDIDIKAN',
            teacherName: waliKelas,
            teacherNip: nipWaliKelas,
            teacherSubject: mataPelajaran,
            headmasterName: kepalaSekolah,
            headmasterNip: nipKepalaSekolah,
            semester,
            academicYear: tahunAjaran,
            activeClassName
          },
          students,
          attendance,
          formativeGrades,
          summativeGrades,
          notes
        });
        setSuccessMessage('Laporan PDF Vector Native berhasil dibuat dan diunduh!');
        setTimeout(() => setSuccessMessage(''), 4000);
      } catch (err: any) {
        console.error('Failed to generate PDF:', err);
        setErrorMessage(`Gagal membuat PDF: ${err?.message || 'Terjadi kesalahan'}`);
      } finally {
        setDownloadingFormat(null);
      }
    } else {
      try {
        await onDownloadFile(format);
        setSuccessMessage(`Ekspor ${format.toUpperCase()} via Google Drive berhasil diproses!`);
        setTimeout(() => setSuccessMessage(''), 4000);
      } catch (err: any) {
        console.error(err);
        setErrorMessage(
          `Gagal mengunduh langsung dari iframe. Hal ini lumrah terjadi karena batasan keamanan browser.`
        );
      } finally {
        setDownloadingFormat(null);
      }
    }
  };

  // Calculate statistics helper for students
  const getStudentStats = (studentNis: string) => {
    // 1. Attendance Counts
    const studentAttendance = attendance.filter(a => a.nis === studentNis);
    const presentCount = studentAttendance.filter(a => ['Hadir', 'H', 'hadir'].includes(a.status)).length;
    const sickCount = studentAttendance.filter(a => ['Sakit', 'S', 'sakit'].includes(a.status)).length;
    const permissionCount = studentAttendance.filter(a => ['Izin', 'I', 'izin'].includes(a.status)).length;
    const absentCount = studentAttendance.filter(a => ['Alfa', 'A', 'alfa'].includes(a.status)).length;
    const totalDays = presentCount + sickCount + permissionCount + absentCount;
    const attendancePercent = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

    // 2. Formative Grades
    const fGrade = formativeGrades.find(f => f.nis === studentNis);
    const avgFormative = fGrade?.rataRata !== undefined && fGrade?.rataRata !== null ? fGrade.rataRata : 80;

    // 3. Summative Grades
    const sGrade = summativeGrades.find(s => s.nis === studentNis);
    const avgSummative = sGrade?.rataRata !== undefined && sGrade?.rataRata !== null ? sGrade.rataRata : 78;

    // 4. Combined Final Grade (60% Formatif + 40% Sumatif)
    const finalGrade = Math.round((avgFormative * 0.6) + (avgSummative * 0.4));

    // Predikat
    let predikat = 'C';
    let keterangan = 'Perlu Bimbingan';
    if (finalGrade >= 85) {
      predikat = 'A';
      keterangan = 'Sangat Baik (Tuntas)';
    } else if (finalGrade >= 75) {
      predikat = 'B';
      keterangan = 'Baik (Tuntas)';
    } else if (finalGrade >= 60) {
      predikat = 'C';
      keterangan = 'Cukup (Tuntas)';
    } else {
      predikat = 'D';
      keterangan = 'Kurang (Perlu Perbaikan)';
    }

    // 5. Jurnal Notes
    const studentNotes = notes.filter(n => n.nis === studentNis);
    const activeNotes = studentNotes.filter(n => n.tipe === 'aktif');
    const problemNotes = studentNotes.filter(n => n.tipe === 'bermasalah');

    return {
      presentCount,
      sickCount,
      permissionCount,
      absentCount,
      totalDays,
      attendancePercent,
      avgFormative,
      avgSummative,
      finalGrade,
      predikat,
      keterangan,
      activeNotes,
      problemNotes,
      studentNotes
    };
  };

  // Direct PDF Generator trigger
  const handlePrint = async () => {
    try {
      const govName = localStorage.getItem('report_gov_name') || 'PEMERINTAH KABUPATEN / KOTA ADMINISTRATIF';
      const deptName = localStorage.getItem('report_dept_name') || 'DINAS PENDIDIKAN, KEPEMUDAAN, DAN OLAHRAGA';
      const schoolName = localStorage.getItem('report_school_name') || 'SATUAN PENDIDIKAN';
      const schoolAddress = localStorage.getItem('report_school_address') || 'Jl. Pendidikan No. 88';
      const schoolPhone = localStorage.getItem('report_school_phone') || 'Telepon: (021) 7654321';
      const cityName = localStorage.getItem('report_city_name') || 'Jakarta';
      const logoKiri = localStorage.getItem('custom_report_logo_kiri');
      const logoKanan = localStorage.getItem('custom_report_logo_kanan');

      await generatePDF({
        reportType: 'collective',
        config: {
          govName,
          deptName,
          schoolName,
          schoolAddress,
          schoolPhone,
          cityName,
          teacherSubject: mataPelajaran,
          teacherName: waliKelas,
          teacherNip: nipWaliKelas,
          headmasterName: kepalaSekolah,
          headmasterNip: nipKepalaSekolah,
          logoKiri,
          logoKanan,
          semester,
          academicYear: tahunAjaran,
          activeClassName,
          orientation: 'landscape'
        },
        students,
        attendance,
        formativeGrades,
        summativeGrades,
        notes
      });
      setSuccessMessage('Laporan PDF berhasil dibuat dan diunduh!');
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      setErrorMessage('Gagal membuat file PDF. Silakan coba kembali.');
    }
  };

  return (
    <div id="export-section" className="space-y-8 w-full mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
        <div className="space-y-1.5 text-center md:text-left">
          <h3 className="text-lg font-black tracking-tight flex items-center gap-2 justify-center md:justify-start">
            🖨️ Pusat Cetak Laporan &amp; Jurnal Kelas
          </h3>
          <p className="text-slate-300 text-xs max-w-xl leading-relaxed">
            Mesin pelaporan otomatis yang memadukan data presensi, rata-rata nilai akademik (Formatif/Sumatif), dan log Catatan Siswa harian dari database Firebase menjadi dokumen PDF formal siap pakai.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" />
            Cetak PDF Laporan
          </button>
        </div>
      </div>

      {/* 2. Main Interface split into Configuration (Left) and Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Controls & Config (Hides during printing) */}
        <div className="space-y-6 lg:col-span-4 print:hidden">
          
          {/* Config Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <h4 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase flex items-center gap-2 pb-3 border-b border-slate-100">
              <Settings className="w-4 h-4 text-indigo-500" /> Kredensial Laporan
            </h4>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Mata Pelajaran (mis. Informatika)
                </label>
                <input
                  type="text"
                  value={mataPelajaran}
                  onChange={e => setMataPelajaran(e.target.value)}
                  placeholder="Informatika"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nama Guru Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={waliKelas}
                  onChange={e => setWaliKelas(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  NIP Guru Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={nipWaliKelas}
                  onChange={e => setNipWaliKelas(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-600"
                />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nama Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={kepalaSekolah}
                  onChange={e => setKepalaSekolah(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={nipKepalaSekolah}
                  onChange={e => setNipKepalaSekolah(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    value={tahunAjaran}
                    onChange={e => setTahunAjaran(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Semester
                  </label>
                  <input
                    type="text"
                    value={semester}
                    onChange={e => setSemester(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Tanggal Laporan
                </label>
                <input
                  type="text"
                  value={tanggalLaporan}
                  onChange={e => setTanggalLaporan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Report Sections Config Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase flex items-center gap-2 pb-3 border-b border-slate-100">
              📂 Bagian Dokumen
            </h4>
            <div className="space-y-3.5 text-xs font-semibold text-slate-700">
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={includePresensi}
                  onChange={e => setIncludePresensi(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <span>Tabel I: Rekapitulasi Presensi</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={includeNilai}
                  onChange={e => setIncludeNilai(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <span>Tabel II: Nilai & Predikat Akademik</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={includeCatatan}
                  onChange={e => setIncludeCatatan(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <span>Bagian III: Jurnal Karakter Siswa</span>
              </label>
            </div>
          </div>

          {/* Trigger Print Button */}
          <button
            onClick={handlePrint}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-2xl transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5"
          >
            <Printer className="w-5 h-5" />
            Cetak PDF Resmi (Presisi)
          </button>

          {/* Backup Google Drive Exporter */}
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4">
            <div>
              <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Ekspor Alternatif (Spreadsheet)</h5>
              <p className="text-[10px] text-slate-400 leading-normal mt-1">
                Jika membutuhkan file master mentah, Anda dapat menarik data langsung dari Drive server.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-[10px] font-bold space-y-1.5 leading-relaxed">
                <div className="flex gap-1.5 items-center">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  <span>Sistem Iframe Membatasi Blob</span>
                </div>
                <p className="font-medium text-slate-500">
                  {errorMessage} silakan gunakan tombol <strong>"Cetak PDF Resmi"</strong> di atas atau buka di tab baru dengan tombol di bawah.
                </p>
                <div className="pt-1.5">
                  <a
                    href={connectedSpreadsheet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold transition uppercase tracking-wider text-[9px] cursor-pointer"
                  >
                    Buka Spreadsheet Baru ↗
                  </a>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-[10px] font-bold flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleDriveDownload('xlsx')}
                disabled={downloadingFormat !== null}
                className="py-2 px-3 bg-white hover:bg-slate-100 disabled:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-[11px] cursor-pointer shadow-2xs"
              >
                {downloadingFormat === 'xlsx' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-indigo-500" />
                    Unduh .XLSX
                  </>
                )}
              </button>

              <button
                onClick={() => handleDriveDownload('pdf')}
                disabled={downloadingFormat !== null}
                className="py-2 px-3 bg-white hover:bg-slate-100 disabled:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-[11px] cursor-pointer shadow-2xs"
              >
                {downloadingFormat === 'pdf' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-rose-500" />
                    Unduh .PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Print Report Sheet (Simulated A4 Paper Layout) */}
        <div className="lg:col-span-8 bg-slate-100/50 p-3 sm:p-6 rounded-3xl border border-slate-200 overflow-x-auto print:p-0 print:m-0 print:border-none print:bg-white print:w-full">
          <div id="printable-report-sheet" className="bg-white p-6 sm:p-12 border border-slate-200 rounded-2xl shadow-xl max-w-[210mm] min-h-[297mm] mx-auto text-slate-800 font-sans leading-relaxed text-xs relative select-text print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none">
            
            {/* Top Premium Color Stripe */}
            <div className="h-2 w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-500 rounded-t-lg -mt-6 sm:-mt-12 -mx-6 sm:-mx-12 mb-6 sm:mb-8" />

            {/* Kop Surat Sekolah / Header */}
            <div className="flex items-center gap-4 border-b-2 border-slate-800 pb-5 mb-6 relative">
              {/* Logo / Badge Emblem Placeholder */}
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl border-2 border-indigo-600 bg-indigo-50 flex items-center justify-center text-indigo-700 shadow-xs">
                <GraduationCap className="w-10 h-10 stroke-[2]" />
              </div>
              
              <div className="flex-1 text-left">
                <span className="text-[9px] font-extrabold tracking-widest text-indigo-600 uppercase block font-sans">
                  SISTEM ADMINISTRASI EVALUASI BELAJAR RESMI
                </span>
                <h2 className="text-sm font-black tracking-wide uppercase text-slate-900 mt-0.5">
                  PEMERINTAH KOTA ADMINISTRASI PENDIDIKAN
                </h2>
                <h1 className="text-base font-black tracking-wider uppercase text-slate-900">
                  DINAS PENDIDIKAN DAN KEBUDAYAAN SMP NEGERI
                </h1>
                <p className="text-[10px] font-medium text-slate-500 mt-0.5 leading-snug">
                  Jl. Pendidikan Luhur No. 23, Sektor V, Jakarta Raya • Telp: (021) 555-8291 • Email: info@kemdikbud.go.id
                </p>
              </div>
              
              {/* Secondary Emblem */}
              <div className="hidden sm:flex flex-shrink-0 w-12 h-12 rounded-full border border-emerald-500 bg-emerald-50 items-center justify-center text-emerald-600">
                <Award className="w-7 h-7" />
              </div>
            </div>

            {/* Document Title & Number */}
            <div className="text-center space-y-1 mb-8">
              <h3 className="text-sm font-black tracking-wider uppercase text-slate-900">
                LAPORAN REKAPITULASI EVALUASI & KARAKTER SISWA
              </h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[9px] font-extrabold text-slate-600 uppercase tracking-widest">
                <span>Tahun Pelajaran: {tahunAjaran}</span>
                <span className="w-1 h-1 rounded-full bg-slate-400" />
                <span>Semester: {semester}</span>
              </div>
            </div>

            {/* Document Metadata Cards Grid */}
            <div className="grid grid-cols-2 gap-4 text-[10px] mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Informasi Lembaga
                </div>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex justify-between border-b border-slate-200/50 pb-1">
                    <span className="text-slate-400 font-medium">Satuan Pendidikan</span>
                    <span className="font-bold text-slate-800">SMP Negeri Administrasi</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-1">
                    <span className="text-slate-400 font-medium">Roster / Rombel</span>
                    <span className="font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">{activeClassName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Total Peserta Didik</span>
                    <span className="font-bold text-slate-800">{students.length} Siswa</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Otorisasi Dokumen
                </div>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex justify-between border-b border-slate-200/50 pb-1">
                    <span className="text-slate-400 font-medium">Wali Kelas</span>
                    <span className="font-bold text-slate-800">{waliKelas}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-1">
                    <span className="text-slate-400 font-medium">NIP Wali Kelas</span>
                    <span className="font-bold text-slate-800">{nipWaliKelas || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Tanggal Penerbitan</span>
                    <span className="font-bold text-slate-800">{tanggalLaporan}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TABEL I: PRESENSI */}
            {includePresensi && (
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <span className="p-1 bg-indigo-50 text-indigo-600 rounded-lg">
                    <CheckSquare className="w-4 h-4" />
                  </span>
                  <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
                    Bagian I: Rekapitulasi Presensi / Kehadiran Siswa
                  </h4>
                </div>
                
                <div className="overflow-hidden border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white text-[9px] font-black uppercase tracking-wider">
                        <th className="p-2.5 text-center w-16">No. Absen</th>
                        <th className="p-2.5 w-24">NIS</th>
                        <th className="p-2.5">Nama Siswa</th>
                        <th className="p-2.5 text-center w-14">Hadir</th>
                        <th className="p-2.5 text-center w-14">Sakit</th>
                        <th className="p-2.5 text-center w-14">Izin</th>
                        <th className="p-2.5 text-center w-14 text-rose-300">Alfa</th>
                        <th className="p-2.5 text-center w-24">Persentase</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((student, idx) => {
                        const stats = getStudentStats(student.nis);
                        return (
                          <tr key={student.nis} className="hover:bg-slate-50/50 transition-colors odd:bg-white even:bg-slate-50/20">
                            <td className="p-2.5 text-center text-slate-500 font-mono font-bold">{student.noAbsen || (idx + 1)}</td>
                            <td className="p-2.5 font-mono text-slate-600 font-bold">{student.nis}</td>
                            <td className="p-2.5 font-bold text-slate-900">{student.nama}</td>
                            <td className="p-2.5 text-center font-semibold text-slate-700">{stats.presentCount}</td>
                            <td className="p-2.5 text-center font-semibold text-yellow-600">{stats.sickCount}</td>
                            <td className="p-2.5 text-center font-semibold text-blue-600">{stats.permissionCount}</td>
                            <td className="p-2.5 text-center font-black text-rose-600">{stats.absentCount}</td>
                            <td className="p-2.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full font-black text-[9px] ${
                                stats.attendancePercent < 80 
                                  ? 'bg-rose-50 text-rose-700' 
                                  : stats.attendancePercent < 90 
                                  ? 'bg-amber-50 text-amber-700' 
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {stats.attendancePercent}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TABEL II: NILAI AKADEMIK */}
            {includeNilai && (
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <span className="p-1 bg-emerald-50 text-emerald-600 rounded-lg">
                    <FileText className="w-4 h-4" />
                  </span>
                  <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
                    Bagian II: Rekapitulasi Penilaian Hasil Belajar Akademik
                  </h4>
                </div>

                <div className="overflow-hidden border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white text-[9px] font-black uppercase tracking-wider">
                        <th className="p-2.5 text-center w-16">No. Absen</th>
                        <th className="p-2.5 w-24">NIS</th>
                        <th className="p-2.5">Nama Siswa</th>
                        <th className="p-2.5 text-center w-20">Formatif</th>
                        <th className="p-2.5 text-center w-20">Sumatif</th>
                        <th className="p-2.5 text-center w-20 bg-indigo-900 text-indigo-100">Nilai Akhir</th>
                        <th className="p-2.5 text-center w-16">Predikat</th>
                        <th className="p-2.5 w-36">Evaluasi Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((student, idx) => {
                        const stats = getStudentStats(student.nis);
                        return (
                          <tr key={student.nis} className="hover:bg-slate-50/50 transition-colors odd:bg-white even:bg-slate-50/20">
                            <td className="p-2.5 text-center text-slate-500 font-mono font-bold">{student.noAbsen || (idx + 1)}</td>
                            <td className="p-2.5 font-mono text-slate-600 font-bold">{student.nis}</td>
                            <td className="p-2.5 font-bold text-slate-900">{student.nama}</td>
                            <td className="p-2.5 text-center font-semibold text-slate-600">{stats.avgFormative}</td>
                            <td className="p-2.5 text-center font-semibold text-slate-600">{stats.avgSummative}</td>
                            <td className="p-2.5 text-center font-extrabold bg-indigo-50/50 text-indigo-950 text-[11px]">{stats.finalGrade}</td>
                            <td className="p-2.5 text-center font-black text-slate-800">{stats.predikat}</td>
                            <td className="p-2.5">
                              <span className={`inline-block px-2 py-0.5 rounded font-black text-[8px] uppercase tracking-wider border ${
                                stats.finalGrade >= 75
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                  : 'bg-rose-50 text-rose-800 border-rose-100'
                              }`}>
                                {stats.keterangan}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TABEL III: CATATAN SISWA & JURNAL KEPRIBADIAN */}
            {includeCatatan && (
              <div className="space-y-3 mb-8 page-break-before">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <span className="p-1 bg-amber-50 text-amber-600 rounded-lg">
                    <Users className="w-4 h-4" />
                  </span>
                  <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
                    Bagian III: Jurnal Karakter & Catatan Keaktifan Harian
                  </h4>
                </div>
                
                {notes.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-center">
                    Tidak ditemukan data catatan jurnal karakter harian untuk kelas ini.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[9px] text-slate-500 leading-normal font-medium">
                      Berikut rekapitulasi data keaktifan (siswa aktif) dan kendala perilaku (siswa bermasalah) harian yang diinput sebagai pertimbangan penilaian sikap karakter:
                    </p>
                    
                    <div className="overflow-hidden border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-[10px] border-collapse">
                        <thead>
                          <tr className="bg-slate-800 text-white text-[9px] font-black uppercase tracking-wider">
                            <th className="p-2.5 text-center w-10">No</th>
                            <th className="p-2.5 w-32">Waktu / Jam</th>
                            <th className="p-2.5 w-44">Siswa</th>
                            <th className="p-2.5 w-28 text-center">Klasifikasi</th>
                            <th className="p-2.5">Isi Catatan Peristiwa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {notes.map((n, idx) => (
                            <tr key={n.id} className="hover:bg-slate-50/50 transition-colors odd:bg-white even:bg-slate-50/20 items-start align-top">
                              <td className="p-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="p-2.5">
                                <span className="font-extrabold text-slate-800 block">{n.tanggal}</span>
                                <span className="text-[8px] text-indigo-600 font-bold bg-indigo-50 px-1 rounded inline-block mt-0.5">{n.jamPembelajaran}</span>
                              </td>
                              <td className="p-2.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {(() => {
                                    const studentObj = students.find(s => s.nis === n.nis);
                                    return studentObj?.noAbsen && (
                                      <span className="px-1 py-0.2 bg-indigo-50 border border-indigo-100 rounded text-indigo-700 font-mono font-extrabold text-[8px] shrink-0">
                                        No. {studentObj.noAbsen}
                                      </span>
                                    );
                                  })()}
                                  <span className="font-bold text-slate-900 block">{n.nama}</span>
                                </div>
                                <span className="text-[8px] text-slate-400 font-mono">NIS: {n.nis}</span>
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                  n.tipe === 'aktif'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                    : 'bg-rose-50 text-rose-800 border border-rose-100'
                                }`}>
                                  {n.tipe === 'aktif' ? '🌟 Aktif' : '⚠️ Kendala'}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-600 italic leading-relaxed text-[9.5px]">
                                "{n.catatan}"
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Signatures / Tanda Tangan */}
            <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 text-[10px]">
              <div className="space-y-16">
                <div className="space-y-1">
                  <p className="text-slate-500 font-medium">Mengetahui,</p>
                  <p className="font-extrabold text-slate-900">Kepala Sekolah SMP Negeri Administrasi</p>
                </div>
                <div className="space-y-0.5 relative">
                  {/* Decorative stamp watermark behind principal signature */}
                  <div className="absolute -top-10 left-6 w-24 h-24 rounded-full border-4 border-double border-indigo-200/40 flex items-center justify-center -rotate-12 pointer-events-none">
                    <div className="text-[8px] font-bold text-indigo-300/40 text-center tracking-widest uppercase leading-snug">
                      SMP NEGERI<br />ADMINISTRASI<br />★ RESMI ★
                    </div>
                  </div>
                  <p className="font-black text-slate-900 underline text-xs">{kepalaSekolah}</p>
                  <p className="text-slate-400 text-[9px] font-bold">NIP. {nipKepalaSekolah || '-'}</p>
                </div>
              </div>

              <div className="space-y-16 text-right">
                <div className="space-y-1">
                  <p className="text-slate-500 font-medium">Ditetapkan di Jakarta, {tanggalLaporan}</p>
                  <p className="font-extrabold text-slate-900">Guru Mata Pelajaran {mataPelajaran || activeClassName}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="font-black text-slate-900 underline text-xs">{waliKelas}</p>
                  <p className="text-slate-400 text-[9px] font-bold">NIP. {nipWaliKelas || '-'}</p>
                </div>
              </div>
            </div>

            {/* Official Stamps Placeholder / Watermark */}
            <div className="mt-12 pt-4 border-t border-slate-100 text-center text-[8px] text-slate-400 font-mono tracking-widest uppercase">
              Dokumen ini dihasilkan secara otomatis oleh sistem evaluasi akademik resmi terintegrasi.
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
