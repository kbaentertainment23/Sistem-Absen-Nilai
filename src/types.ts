export interface Student {
  noAbsen?: string;
  nis: string;
  nama: string;
  jenisKelamin?: 'L' | 'P';
  kelas?: string;
  foto?: string; // Base64 encoded compressed photo
  label?: string; // e.g. "Ketua Kelas", "OSIS", "Siswa Bermasalah", etc.
}

export interface AttendanceRecord {
  tanggal: string; // YYYY-MM-DD
  nis: string;
  nama: string;
  jenisKelamin?: 'L' | 'P';
  kelas?: string;
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alfa';
  terlambat: number; // minutes
  keterangan: string;
}

export interface GradeColumn {
  key: string;
  label: string;
}

export interface GradeFormative {
  nis: string;
  nama: string;
  jenisKelamin?: 'L' | 'P';
  kelas?: string;
  rataRata: number | null;
  [key: string]: any; // supports f1, f2, f3, f4, etc. dynamically
}

export interface GradeSummative {
  nis: string;
  nama: string;
  jenisKelamin?: 'L' | 'P';
  kelas?: string;
  rataRata: number | null;
  [key: string]: any; // supports s1, s2, s3, uts, uas, etc. dynamically
}

export interface MonthlyRecap {
  nis: string;
  nama: string;
  jenisKelamin?: 'L' | 'P';
  kelas?: string;
  hadir: number;
  sakit: number;
  izin: number;
  alfa: number;
  terlambatCount: number;
  persentaseKehadiran: number;
}

export interface SpreadsheetInfo {
  id: string;
  name: string;
  url: string;
}

export interface StudentNote {
  id: string;
  tanggal: string; // YYYY-MM-DD
  nis: string;
  nama: string;
  kelas: string;
  jamPembelajaran: string; // e.g. "Jam 1-2 (07:00-08:30)"
  tipe: 'aktif' | 'bermasalah';
  catatan: string;
}

export interface ExtraTikPeserta {
  nis: string;
  nama: string;
  kelas: string;
  tanggalDaftar: string;
  status: 'Aktif' | 'Alumni' | 'Keluar';
}

export interface ExtraTikAbsensi {
  tanggal: string;
  nis: string;
  nama: string;
  kelas: string;
  statusKehadiran: 'Hadir' | 'Sakit' | 'Izin' | 'Alfa';
  keterangan: string;
}

export interface ExtraTikNilai {
  nis: string;
  nama: string;
  kelas: string;
  nilaiTugas: number | null;
  nilaiPraktik: number | null;
  nilaiTeori: number | null;
  rataRata: number | null;
  predikat: string;
}

export interface JurnalHarianRecord {
  id: string;
  tanggal: string; // YYYY-MM-DD
  kelas: string;
  jamPelajaran: number[]; // e.g., [2, 3]
  materi: string;
  catatan: string;
  hambatan?: string;
  solusi?: string;
  keaktifan?: number; // 1-5 rating
  adaTugas?: boolean;
  deskripsiTugas?: string;
  tidakHadirSnapshot?: { nis: string; nama: string; status: 'Sakit' | 'Izin' | 'Alfa' }[];
  catatanSiswaSnapshot?: { nis: string; nama: string; tipe: 'aktif' | 'bermasalah'; catatan: string; jamPembelajaran: string }[];
}

export interface AttendanceDateNote {
  tanggal: string; // YYYY-MM-DD
  kelas: string;   // e.g. "Kelas 8.1"
  alasan: string;  // e.g. "Libur Hari Raya Idul Fitri", "Kegiatan Sekolah", etc.
}

export interface ReportConfig {
  govName?: string;
  deptName?: string;
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  logoKiri?: string | null;
  logoKanan?: string | null;
  cityName?: string;
  teacherSubject?: string;
  teacherName?: string;
  teacherNip?: string;
  headmasterName?: string;
  headmasterNip?: string;
  parafMode?: 'digital' | 'custom_image' | 'stamp' | 'manual';
  customParafImg?: string | null;
  updatedAt?: string;
}




