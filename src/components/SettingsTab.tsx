import React, { useState, useEffect, useRef } from 'react';
import { 
  DatabaseOverallStats, 
  CollectionStat, 
  getDatabaseStatsFromFirestore,
  deepCleanDatabaseFromFirestore,
  restoreDatabaseFromJSON,
  DeepCleanResult
} from '../lib/firestoreService';
import { 
  Student, 
  AttendanceRecord, 
  GradeFormative, 
  GradeSummative, 
  GradeColumn, 
  StudentNote, 
  JurnalHarianRecord, 
  ExtraTikPeserta, 
  ExtraTikAbsensi, 
  ExtraTikNilai 
} from '../types';
import { 
  Settings, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  HardDrive, 
  Database, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  FileText, 
  Loader2, 
  Info,
  Sliders,
  Cpu,
  Lock,
  Check,
  Download,
  Upload,
  FileJson,
  Image as ImageIcon,
  Save,
  Link as LinkIcon,
  X
} from 'lucide-react';
import { convertGoogleDriveUrl } from '../utils/imageHelper';

interface SettingsTabProps {
  classes: { id: number; name: string }[];
  role: 'admin' | 'guru';
  onRefreshData: () => Promise<void>;
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  appLogoUrl?: string;
  onUpdateAppLogoUrl?: (newUrl: string) => Promise<void>;
  allAppData?: {
    classes: { id: number; name: string }[];
    students: Student[];
    attendance: AttendanceRecord[];
    formativeGrades: GradeFormative[];
    summativeGrades: GradeSummative[];
    formativeCols: GradeColumn[];
    summativeCols: GradeColumn[];
    studentNotes: StudentNote[];
    journals: JurnalHarianRecord[];
    extraTikPeserta: ExtraTikPeserta[];
    extraTikAbsensi: ExtraTikAbsensi[];
    extraTikNilai: ExtraTikNilai[];
  };
}

export default function SettingsTab({ 
  classes, 
  role, 
  onRefreshData, 
  addToast, 
  appLogoUrl = '', 
  onUpdateAppLogoUrl, 
  allAppData 
}: SettingsTabProps) {
  const [stats, setStats] = useState<DatabaseOverallStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isCleaningCache, setIsCleaningCache] = useState(false);
  const [isDeepCleaning, setIsDeepCleaning] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [deepCleanResult, setDeepCleanResult] = useState<DeepCleanResult | null>(null);
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [cleanType, setCleanType] = useState<'cache' | 'deepclean' | 'all'>('all');
  const [lastCacheClearedTime, setLastCacheClearedTime] = useState<string | null>(null);

  // Logo settings state
  const [logoInput, setLogoInput] = useState(appLogoUrl || '');
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [logoPreviewError, setLogoPreviewError] = useState(false);

  useEffect(() => {
    setLogoInput(appLogoUrl || '');
    setLogoPreviewError(false);
  }, [appLogoUrl]);

  const handleSaveAppLogo = async () => {
    if (!onUpdateAppLogoUrl) return;
    setIsSavingLogo(true);
    try {
      const trimmed = logoInput.trim();
      await onUpdateAppLogoUrl(trimmed);
      addToast(trimmed ? 'Logo portal aplikasi berhasil diperbarui!' : 'Logo kustom dihapus (kembali ke default)', 'success');
    } catch (err: any) {
      addToast(`Gagal menyimpan logo: ${err?.message || 'Terjadi kesalahan'}`, 'error');
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleRemoveAppLogo = async () => {
    if (!onUpdateAppLogoUrl) return;
    setIsSavingLogo(true);
    try {
      setLogoInput('');
      await onUpdateAppLogoUrl('');
      addToast('Logo portal kembali ke default sistem', 'info');
    } catch (err: any) {
      addToast(`Gagal menghapus logo: ${err?.message || 'Terjadi kesalahan'}`, 'error');
    } finally {
      setIsSavingLogo(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await getDatabaseStatsFromFirestore();
      setStats(data);
    } catch (err: any) {
      console.error('Error loading database stats:', err);
      addToast('Gagal mengambil statistik database', 'error');
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Handler untuk mengunduh seluruh data lokal ke dalam file JSON
  const handleDownloadJSONBackup = () => {
    if (!allAppData) {
      addToast('Data aplikasi belum dimuat secara lengkap', 'error');
      return;
    }

    try {
      const backupPayload = {
        exportDate: new Date().toISOString(),
        exportedAtFormatted: new Date().toLocaleString('id-ID'),
        appName: 'Aplikasi Manajemen Presensi & Nilai Sekolah',
        systemInfo: {
          totalClasses: allAppData.classes.length,
          totalStudents: allAppData.students.length,
          totalAttendanceRecords: allAppData.attendance.length,
          totalFormativeGrades: allAppData.formativeGrades.length,
          totalSummativeGrades: allAppData.summativeGrades.length,
          totalStudentNotes: allAppData.studentNotes.length,
          totalJournals: allAppData.journals.length,
          totalExtraTikPeserta: allAppData.extraTikPeserta.length,
          totalExtraTikAbsensi: allAppData.extraTikAbsensi.length,
          totalExtraTikNilai: allAppData.extraTikNilai.length,
        },
        data: {
          classes: allAppData.classes,
          students: allAppData.students,
          attendance: allAppData.attendance,
          formativeGrades: allAppData.formativeGrades,
          summativeGrades: allAppData.summativeGrades,
          formativeCols: allAppData.formativeCols,
          summativeCols: allAppData.summativeCols,
          studentNotes: allAppData.studentNotes,
          journals: allAppData.journals,
          extraTik: {
            peserta: allAppData.extraTikPeserta,
            absensi: allAppData.extraTikAbsensi,
            nilai: allAppData.extraTikNilai,
          },
        },
      };

      const jsonString = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `Backup_Data_Sistem_${dateStr}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast(`Backup berhasil diunduh: ${fileName}`, 'success');
    } catch (err: any) {
      console.error('Error downloading JSON backup:', err);
      addToast('Gagal membuat file backup JSON: ' + (err?.message || err), 'error');
    }
  };

  // Handler untuk mengunggah dan memulihkan database dari file JSON
  const handleUploadJSONFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      addToast('Harap pilih file dengan ekstensi .json', 'error');
      if (e.target) e.target.value = '';
      return;
    }

    const confirmRestore = window.confirm(
      `Apakah Anda yakin ingin mengunggah & memulihkan database dari file "${file.name}"?\n\n` +
      `Data yang terdapat di dalam file backup akan disimpan ke dalam database Firestore sistem.`
    );

    if (!confirmRestore) {
      if (e.target) e.target.value = '';
      return;
    }

    setIsRestoring(true);
    addToast('Memproses dan mengunggah database ke server...', 'info');

    try {
      const fileText = await file.text();
      const jsonObj = JSON.parse(fileText);

      const res = await restoreDatabaseFromJSON(jsonObj);

      await onRefreshData();
      await fetchStats();

      addToast(
        `Berhasil mengunggah & memulihkan database!\n` +
        `Siswa: ${res.restoredStudents} | Presensi: ${res.restoredAttendance} | Nilai: ${res.restoredGrades} | Jurnal: ${res.restoredJournals}`,
        'success'
      );
    } catch (err: any) {
      console.error('Error uploading JSON backup:', err);
      addToast('Gagal memulihkan database dari JSON: ' + (err?.message || err), 'error');
    } finally {
      setIsRestoring(false);
      if (e.target) e.target.value = '';
    }
  };

  // Hapus Cache Browser & Storage Sementara
  const handleClearBrowserCache = () => {
    setIsCleaningCache(true);
    try {
      // Simpan credential penting
      const savedRole = localStorage.getItem('user_role');
      const savedLoggedIn = localStorage.getItem('user_logged_in');

      // Clear sessionStorage sepenuhnya
      sessionStorage.clear();

      // Clear non-essential keys from localStorage
      const keysToKeep = ['user_role', 'user_logged_in', 'firebase:authUser'];
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.some(k => key.includes(k))) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(k => localStorage.removeItem(k));

      const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setLastCacheClearedTime(now);
      addToast('Cache browser dan temporary storage berhasil dibersihkan!', 'success');
    } catch (err: any) {
      console.error('Error clearing browser cache:', err);
      addToast('Gagal membersihkan cache browser', 'error');
    } finally {
      setIsCleaningCache(false);
    }
  };

  // Hapus Sampah Firestore (Deep Clean)
  const handleRunDeepClean = async () => {
    setIsDeepCleaning(true);
    try {
      const result = await deepCleanDatabaseFromFirestore(classes);
      setDeepCleanResult(result);
      await onRefreshData();
      await fetchStats();
      addToast('Pembersihan sampah database Firestore selesai!', 'success');
    } catch (err: any) {
      console.error('Deep clean error:', err);
      addToast(`Gagal pembersihan database: ${err?.message || 'Terjadi kesalahan'}`, 'error');
    } finally {
      setIsDeepCleaning(false);
    }
  };

  const handleConfirmClean = async () => {
    setIsCleanModalOpen(false);
    if (cleanType === 'cache') {
      handleClearBrowserCache();
    } else if (cleanType === 'deepclean') {
      await handleRunDeepClean();
    } else if (cleanType === 'all') {
      handleClearBrowserCache();
      await handleRunDeepClean();
    }
  };

  if (role !== 'admin') {
    return (
      <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xs text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200/60">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-slate-800">Akses Khusus Admin</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Menu Pengaturan dan Pemeliharaan Database hanya dapat diakses oleh akun dengan peran Admin. Silakan masuk menggunakan password Admin untuk mengakses menu ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600/30 border border-indigo-400/30 rounded-xl text-indigo-300">
                <Settings className="w-5 h-5 animate-spin-slow" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-indigo-300 bg-indigo-900/60 border border-indigo-700/50 px-2.5 py-0.5 rounded-full">
                Pengaturan Sistem &amp; DB
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Pengaturan &amp; Optimasi Database Firebase
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium">
              Kelola kapasitas penyimpanan Firestore, lihat penggunaan koleksi data, serta bersihkan cache dan sampah data yang tidak terpakai agar sistem selalu cepat.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchStats}
            disabled={isLoadingStats}
            className="self-start md:self-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
            <span>Perbarui Statistik</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Database Size */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Ukuran Database</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              {isLoadingStats ? '...' : stats?.totalSizeFormatted || '0 KB'}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              Estimasi penggunaan kuota Firestore
            </p>
          </div>
        </div>

        {/* Total Documents */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Total Dokumen</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              {isLoadingStats ? '...' : `${stats?.totalDocs || 0} Rekor`}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              Tersebar di {stats?.collections.length || 10} koleksi data
            </p>
          </div>
        </div>

        {/* Cache Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Cache Browser</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              {lastCacheClearedTime ? 'Bersih' : 'Terisi'}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              {lastCacheClearedTime ? `Terakhir dibersihkan pkl ${lastCacheClearedTime}` : 'Penyimpanan lokal aktif'}
            </p>
          </div>
        </div>

        {/* Data Protection Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Proteksi Data</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Aktif &amp; Aman
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              File &amp; Siswa Aktif Dijamin Selamat
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 0: UNDUH & UNGGAH BACKUP DATA LOKAL (FORMAT JSON) */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-indigo-800 shadow-md space-y-4">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUploadJSONFile}
          accept=".json,application/json"
          className="hidden"
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-indigo-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/30 text-indigo-300 rounded-xl border border-indigo-400/30">
                <FileJson className="w-5 h-5" />
              </span>
              <h3 className="text-base font-black text-white">
                Backup &amp; Pulihkan Database (Format JSON)
              </h3>
            </div>
            <p className="text-xs text-indigo-200 leading-relaxed max-w-2xl">
              Unduh seluruh salinan data aktif atau unggah file backup <strong>.json</strong> sebelumnya untuk memulihkan seluruh data (Daftar Siswa, Presensi Harian, Nilai Formatif &amp; Sumatif, Jurnal Guru, Catatan Perilaku, &amp; Extra TIK) ke dalam database Firestore.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleDownloadJSONBackup}
              className="px-4.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Backup</span>
            </button>

            <button
              type="button"
              disabled={isRestoring}
              onClick={() => fileInputRef.current?.click()}
              className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-black rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/20 cursor-pointer"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengunggah...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload Database JSON</span>
                </>
              )}
            </button>
          </div>
        </div>

        {allAppData ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
            <div className="p-2.5 bg-indigo-950/70 border border-indigo-800/60 rounded-xl">
              <p className="text-indigo-300 text-[10px] font-medium">Siswa Terdaftar</p>
              <p className="font-black text-white text-sm">{allAppData.students.length} murid</p>
            </div>
            <div className="p-2.5 bg-indigo-950/70 border border-indigo-800/60 rounded-xl">
              <p className="text-indigo-300 text-[10px] font-medium">Rekor Presensi</p>
              <p className="font-black text-white text-sm">{allAppData.attendance.length} data</p>
            </div>
            <div className="p-2.5 bg-indigo-950/70 border border-indigo-800/60 rounded-xl">
              <p className="text-indigo-300 text-[10px] font-medium">Data Nilai</p>
              <p className="font-black text-white text-sm">
                {allAppData.formativeGrades.length + allAppData.summativeGrades.length} data
              </p>
            </div>
            <div className="p-2.5 bg-indigo-950/70 border border-indigo-800/60 rounded-xl">
              <p className="text-indigo-300 text-[10px] font-medium">Jurnal Mengajar</p>
              <p className="font-black text-white text-sm">{allAppData.journals.length} entri</p>
            </div>
            <div className="p-2.5 bg-indigo-950/70 border border-indigo-800/60 rounded-xl">
              <p className="text-indigo-300 text-[10px] font-medium">Catatan Perilaku</p>
              <p className="font-black text-white text-sm">{allAppData.studentNotes.length} rekor</p>
            </div>
            <div className="p-2.5 bg-indigo-950/70 border border-indigo-800/60 rounded-xl">
              <p className="text-indigo-300 text-[10px] font-medium">Extra TIK</p>
              <p className="font-black text-white text-sm">{allAppData.extraTikPeserta.length} peserta</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-indigo-300 italic">Memuat rincian data aplikasi...</p>
        )}
      </div>

      {/* SECTION LOGO PORTAL & APLIKASI */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Logo Portal &amp; Aplikasi</h3>
              <p className="text-xs text-slate-500 font-medium">Atur logo instansi / sekolah dari link Google Drive atau URL gambar langsung</p>
            </div>
          </div>
          {appLogoUrl ? (
            <span className="self-start sm:self-auto text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Logo Kustom Aktif
            </span>
          ) : (
            <span className="self-start sm:self-auto text-[11px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full">
              Logo Default Sistem
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Left: Input & Actions */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Link Gambar Logo (URL / Link Google Drive)
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={logoInput}
                  onChange={(e) => {
                    setLogoInput(e.target.value);
                    setLogoPreviewError(false);
                  }}
                  placeholder="Contoh: https://drive.google.com/file/d/123XYZ/view?usp=sharing atau https://..."
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  disabled={role !== 'admin' || isSavingLogo}
                />
                {logoInput && role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoInput('');
                      setLogoPreviewError(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                💡 Tempelkan URL gambar langsung (PNG, JPG, SVG) atau <strong>Link Berbagi Google Drive</strong>. Sistem akan mengonversi link Google Drive secara otomatis untuk ditampilkan di Login Portal &amp; Header Aplikasi.
              </p>
            </div>

            {role === 'admin' ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveAppLogo}
                  disabled={isSavingLogo}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {isSavingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Simpan Logo</span>
                </button>
                {appLogoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAppLogo}
                    disabled={isSavingLogo}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Hapus / Reset Logo</span>
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400 italic">
                * Login sebagai Admin untuk mengubah link logo aplikasi.
              </p>
            )}
          </div>

          {/* Right: Live Preview Box */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center text-center gap-2 min-h-40">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pratinjau Logo</p>
            {logoInput.trim() && !logoPreviewError ? (
              <div className="p-2 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-center min-h-16 min-w-16">
                <img
                  src={convertGoogleDriveUrl(logoInput.trim())}
                  alt="Preview Logo"
                  className="h-16 w-16 object-contain rounded-xl"
                  onError={() => setLogoPreviewError(true)}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 p-3">
                <div className="h-16 w-16 bg-linear-to-tr from-indigo-600 to-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-md shadow-indigo-100">
                  <Database className="w-8 h-8" />
                </div>
                {logoPreviewError && (
                  <p className="text-[10px] font-bold text-rose-600 mt-1">
                    Gambar tidak dapat dimuat (Cek URL / Hak Akses Drive)
                  </p>
                )}
              </div>
            )}
            <p className="text-[11px] text-slate-500 font-bold">
              {logoInput.trim() && !logoPreviewError ? 'Logo Kustom Siap Tampil' : 'Logo Default Sistem (Database)'}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: FITUR PEMBERSIHAN CACHE & SAMPAH DATA */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              Pembersihan Cache &amp; Garbage Collection (Hapus Sampah)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hapus file sementara, cache lokal, dan data yatim di database agar tidak membebani kuota penyimpanan.
            </p>
          </div>

          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 self-start sm:self-auto">
            Terakhir Diperbarui: {stats?.lastUpdated || '-'}
          </span>
        </div>

        {/* Safety Guarantee Callout Box */}
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-emerald-500 text-white rounded-xl shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs text-emerald-950">
              <p className="font-extrabold text-emerald-900 text-sm">
                🛡️ Jaminan Keamanan Data Penting (Safety Guaranteed)
              </p>
              <p className="leading-relaxed text-emerald-800">
                Fitur pembersihan ini bekerja secara <strong>cerdas dan selektif</strong>. Sistem <strong>TIDAK AKAN PERNAH</strong> menghapus data siswa terdaftar, presensi resmi kelas, nilai siswa, jurnal harian mengajar, atau akun pengguna.
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-emerald-850 font-medium text-[11px] pt-1">
                <li><strong>Yang Dibersihkan:</strong> Cache browser sementara, data yatim (rekor tanpa NIS/Kelas valid), dan log tidak terpakai.</li>
                <li><strong>Yang Selalu Disimpan Aman:</strong> Seluruh file penting, daftar siswa aktif, rekapitulasi, dan jurnal guru.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Button 1: Clear Cache */}
          <button
            type="button"
            onClick={() => {
              setCleanType('cache');
              setIsCleanModalOpen(true);
            }}
            disabled={isCleaningCache || isDeepCleaning}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-2xl text-left transition cursor-pointer space-y-2 group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="p-2 bg-amber-100 text-amber-700 rounded-xl group-hover:scale-105 transition">
                <Cpu className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                Browser Cache
              </span>
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 group-hover:text-amber-700 transition">
                Hapus Cache Browser
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Bersihkan buffer foto lokal &amp; temporary storage di browser pengguna.
              </p>
            </div>
          </button>

          {/* Button 2: Deep Clean Database */}
          <button
            type="button"
            onClick={() => {
              setCleanType('deepclean');
              setIsCleanModalOpen(true);
            }}
            disabled={isCleaningCache || isDeepCleaning || role !== 'admin'}
            className="p-4 bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200 rounded-2xl text-left transition cursor-pointer space-y-2 group disabled:opacity-50"
            title={role !== 'admin' ? 'Fitur pembersihan database Firestore khusus Admin' : ''}
          >
            <div className="flex items-center justify-between">
              <span className="p-2 bg-rose-100 text-rose-700 rounded-xl group-hover:scale-105 transition">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold text-rose-700 bg-white px-2 py-0.5 rounded-md border border-rose-200">
                Firestore DB
              </span>
            </div>
            <div>
              <p className="text-xs font-black text-rose-900 group-hover:text-rose-700 transition">
                Hapus Sampah Database (Deep Clean)
              </p>
              <p className="text-[11px] text-rose-700/80 mt-0.5 leading-snug">
                Bersihkan rekor yatim tanpa NIS/kelas valid secara aman di Firebase.
              </p>
            </div>
          </button>

          {/* Button 3: Total Clean */}
          <button
            type="button"
            onClick={() => {
              setCleanType('all');
              setIsCleanModalOpen(true);
            }}
            disabled={isCleaningCache || isDeepCleaning}
            className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 rounded-2xl text-left transition cursor-pointer space-y-2 group shadow-md disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="p-2 bg-indigo-500 text-white rounded-xl group-hover:scale-105 transition">
                <Trash2 className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold text-indigo-100 bg-indigo-800/80 px-2 py-0.5 rounded-md">
                Rekomendasi
              </span>
            </div>
            <div>
              <p className="text-xs font-black text-white transition">
                Pembersihan Total (Cache + Sampah DB)
              </p>
              <p className="text-[11px] text-indigo-100/80 mt-0.5 leading-snug">
                Jalankan pembersihan menyeluruh untuk performa maksimal.
              </p>
            </div>
          </button>
        </div>

        {/* Deep Clean Execution Results Display */}
        {deepCleanResult && (
          <div className="mt-4 p-4 bg-slate-900 text-slate-100 rounded-2xl space-y-3 text-xs border border-slate-800 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Hasil Pembersihan Deep Clean Database Selesai</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Total Dihapus: {deepCleanResult.totalDeletedDocs} Dokumen
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 bg-slate-800/80 rounded-xl">
                <p className="text-slate-400 text-[10px]">Presensi Yatim</p>
                <p className="font-bold text-white">{deepCleanResult.deletedAttendanceCount} data</p>
              </div>
              <div className="p-2 bg-slate-800/80 rounded-xl">
                <p className="text-slate-400 text-[10px]">Nilai Yatim</p>
                <p className="font-bold text-white">
                  {(deepCleanResult.deletedFormativeGradesCount || 0) + (deepCleanResult.deletedSummativeGradesCount || 0)} data
                </p>
              </div>
              <div className="p-2 bg-slate-800/80 rounded-xl">
                <p className="text-slate-400 text-[10px]">Catatan Yatim</p>
                <p className="font-bold text-white">{deepCleanResult.deletedNotesCount} data</p>
              </div>
              <div className="p-2 bg-slate-800/80 rounded-xl">
                <p className="text-slate-400 text-[10px]">Siswa Aktif Terjaga</p>
                <p className="font-bold text-emerald-400">{deepCleanResult.activeStudentsCount} murid</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: TAMPILAN PENYIMPANAN DATABASE FIREBASE */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              Tampilan &amp; Rincian Koleksi Database Firebase
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Informasi lengkap koleksi data yang disimpan di Cloud Firestore beserta jumlah rekor dan estimasi ukurannya.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-150 px-3 py-1 rounded-xl">
              Firestore Cloud Database
            </span>
          </div>
        </div>

        {/* Collections Table */}
        {isLoadingStats ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs font-bold text-slate-500">Menganalisis penggunaan koleksi Firestore...</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Nama Koleksi / Data</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-center">Jumlah Dokumen</th>
                  <th className="py-3 px-4 text-right">Estimasi Ukuran</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs font-medium text-slate-800">
                {stats?.collections.map((col) => {
                  const percentOfTotal = stats.totalSizeBytes > 0 
                    ? Math.round((col.sizeBytes / stats.totalSizeBytes) * 100) 
                    : 0;

                  return (
                    <tr key={col.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            {col.name}
                            <span className="text-[10px] font-mono text-slate-400 font-normal">({col.id})</span>
                          </p>
                          <p className="text-[11px] text-slate-500">{col.description}</p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          col.category === 'Master Data' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : col.category === 'Presensi'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : col.category === 'Nilai'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : col.category === 'Jurnal & Catatan'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {col.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                        {col.docCount} rekor
                      </td>

                      <td className="py-3.5 px-4 text-right space-y-1">
                        <span className="font-mono font-bold text-slate-900">{col.sizeFormatted}</span>
                        <div className="w-24 ml-auto bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-1.5 rounded-full" 
                            style={{ width: `${Math.max(percentOfTotal, 3)}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {col.docCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Aman
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                            Kosong
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 3: SYSTEM PREFERENCES & ACCESS CONTROL */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-150 pb-3">
          <Sliders className="w-5 h-5 text-indigo-600" />
          Informasi Hak Akses &amp; Konfigurasi Aplikasi
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Mode Hak Akses Aktif</span>
            <p className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600" />
              {role === 'admin' ? 'Mode Administrator (Akses Penuh)' : 'Mode Guru (Akses Input & Laporan)'}
            </p>
            <p className="text-xs text-slate-500">
              {role === 'admin' 
                ? 'Anda memiliki wewenang untuk mengelola kelas, daftar siswa, serta menjalankan Deep Clean DB.' 
                : 'Mode ini membatasi pengubahan struktur kelas demi keamanan data.'}
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Konektivitas Firebase</span>
            <p className="text-sm font-black text-emerald-700 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Real-time Firestore Database Connected
            </p>
            <p className="text-xs text-slate-500">
              Setiap entri nilai, absensi, dan jurnal harian disinkronkan secara otomatis ke cloud database.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Cleaning */}
      {isCleanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Konfirmasi Pembersihan Data</h3>
                <p className="text-xs text-slate-500">
                  {cleanType === 'cache' && 'Bersihkan cache browser dan temporary storage?'}
                  {cleanType === 'deepclean' && 'Jalankan pembersihan sampah database Firestore?'}
                  {cleanType === 'all' && 'Jalankan pembersihan total (cache & sampah DB)?'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-1">
              <p className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                Data Penting Dijamin Aman:
              </p>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                Seluruh data siswa terdaftar, presensi resmi, nilai akademik, dan jurnal harian guru <strong>TIDAK AKAN terhapus</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCleanModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClean}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition cursor-pointer shadow-md"
              >
                Lanjutkan Pembersihan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
