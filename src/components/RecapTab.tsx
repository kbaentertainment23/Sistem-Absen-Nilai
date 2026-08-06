import React, { useState } from 'react';
import { Student, GradeFormative, GradeSummative, MonthlyRecap, GradeColumn, StudentNote } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Users, Award, ShieldAlert, TrendingUp, HelpCircle, ClipboardCheck, Sparkles, AlertTriangle, Clock } from 'lucide-react';

interface RecapTabProps {
  students: Student[];
  formativeGrades: GradeFormative[];
  summativeGrades: GradeSummative[];
  recap: MonthlyRecap[];
  formativeCols?: GradeColumn[];
  summativeCols?: GradeColumn[];
  notes?: StudentNote[];
}

const DEFAULT_FORMATIVE_COLS: GradeColumn[] = [
  { key: 'f1', label: 'Formatif 1 (F1)' },
  { key: 'f2', label: 'Formatif 2 (F2)' },
  { key: 'f3', label: 'Formatif 3 (F3)' },
  { key: 'f4', label: 'Formatif 4 (F4)' }
];

const DEFAULT_SUMMATIVE_COLS: GradeColumn[] = [
  { key: 's1', label: 'Sumatif 1 (S1)' },
  { key: 's2', label: 'Sumatif 2 (S2)' },
  { key: 's3', label: 'Sumatif 3 (S3)' },
  { key: 'uts', label: 'UTS' },
  { key: 'uas', label: 'UAS' }
];

export default function RecapTab({
  students,
  formativeGrades,
  summativeGrades,
  recap,
  formativeCols = [],
  summativeCols = [],
  notes = []
}: RecapTabProps) {
  const activeFormativeCols = formativeCols.length > 0 ? formativeCols : DEFAULT_FORMATIVE_COLS;
  const activeSummativeCols = summativeCols.length > 0 ? summativeCols : DEFAULT_SUMMATIVE_COLS;

  const [selectedStudentNisForNotes, setSelectedStudentNisForNotes] = useState<string | null>(null);

  // 1. Calculate general stats
  const totalStudents = students.length;
  
  const studentsWithAttendance = recap.filter(r => (r.hadir + r.sakit + r.izin + r.alfa) > 0);
  const rawAvg = studentsWithAttendance.length > 0
    ? (studentsWithAttendance.reduce((acc, curr) => acc + (isNaN(curr.persentaseKehadiran) ? 0 : curr.persentaseKehadiran), 0) / studentsWithAttendance.length) * 100
    : 0;
  const avgAttendance = isNaN(rawAvg) ? 0 : rawAvg;

  const totalLateCases = recap.reduce((acc, curr) => acc + curr.terlambatCount, 0);

  // Top disciplined (only students with attendance > 0 days and >= 80% attendance)
  const topDisciplined = [...recap]
    .filter(r => (r.hadir + r.sakit + r.izin + r.alfa) > 0)
    .sort((a, b) => b.persentaseKehadiran - a.persentaseKehadiran)
    .filter(r => r.persentaseKehadiran >= 0.8)
    .slice(0, 3);

  // Needs attention (only students with attendance > 0 days and < 85% attendance or high lateness)
  const needsAttention = [...recap]
    .filter(r => (r.hadir + r.sakit + r.izin + r.alfa) > 0 && (r.persentaseKehadiran < 0.85 || r.terlambatCount > 1))
    .sort((a, b) => a.persentaseKehadiran - b.persentaseKehadiran || b.terlambatCount - a.terlambatCount)
    .slice(0, 3);

  // Helper to calculate average from non-null values dynamically
  const calculateAvg = (scores: (number | null)[]): number => {
    const validScores = scores.filter((v): v is number => v !== null && !isNaN(v));
    if (validScores.length === 0) return 0;
    const total = validScores.reduce((acc, curr) => acc + curr, 0);
    return parseFloat((total / validScores.length).toFixed(1));
  };

  // 2. Prepare Academic Chart Data
  const allAcademicData = students.map(s => {
    const f = formativeGrades.find(g => g.nis === s.nis);
    const sum = summativeGrades.find(g => g.nis === s.nis);
    
    const fAvg = f 
      ? (f.rataRata !== null && !isNaN(f.rataRata) && f.rataRata > 0 ? f.rataRata : calculateAvg(activeFormativeCols.map(c => f[c.key])))
      : 0;
      
    const sumAvg = sum
      ? (sum.rataRata !== null && !isNaN(sum.rataRata) && sum.rataRata > 0 ? sum.rataRata : calculateAvg(activeSummativeCols.map(c => sum[c.key])))
      : 0;

    return {
      name: s.nama,
      'Nilai Formatif': fAvg,
      'Nilai Sumatif': sumAvg,
      overallAverage: (fAvg + sumAvg) / 2,
    };
  });

  // Only display 3 students with the highest overall average
  const academicChartData = allAcademicData
    .sort((a, b) => b.overallAverage - a.overallAverage)
    .slice(0, 3);

  // 3. Prepare Attendance Distribution Data (for Pie Chart)
  const totalHadir = recap.reduce((acc, curr) => acc + curr.hadir, 0);
  const totalSakit = recap.reduce((acc, curr) => acc + curr.sakit, 0);
  const totalIzin = recap.reduce((acc, curr) => acc + curr.izin, 0);
  const totalAlfa = recap.reduce((acc, curr) => acc + curr.alfa, 0);

  const attendancePieData = [
    { name: 'Hadir', value: totalHadir, color: '#6366f1' }, // Indigo-500
    { name: 'Sakit', value: totalSakit, color: '#0ea5e9' }, // Sky-500
    { name: 'Izin', value: totalIzin, color: '#f59e0b' },  // Amber-500
    { name: 'Alfa', value: totalAlfa, color: '#f43f5e' },  // Rose-500
  ].filter(d => d.value > 0);

  const hasAttendanceData = attendancePieData.length > 0;

  // Formatting Helper for percentage
  const formatPct = (val: number) => {
    return (val * 100).toFixed(1) + '%';
  };

  const getPctColorClass = (pct: number) => {
    if (pct >= 0.95) return 'text-indigo-600 bg-indigo-50 border border-indigo-100';
    if (pct >= 0.85) return 'text-amber-600 bg-amber-50 border border-amber-100';
    return 'text-rose-600 bg-rose-50 border border-rose-100';
  };

  return (
    <div id="recap-section" className="space-y-8">
      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block tracking-wider">Total Siswa</span>
            <span className="text-2xl font-bold text-slate-900">{totalStudents}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block tracking-wider">Rata Kehadiran</span>
            <span className="text-2xl font-bold text-slate-900">{avgAttendance.toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block tracking-wider">Kasus Terlambat</span>
            <span className="text-2xl font-bold text-slate-900">{totalLateCases} <span className="text-xs font-normal text-slate-400">kali</span></span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block tracking-wider">Presensi Penuh</span>
            <span className="text-2xl font-bold text-slate-900">
              {recap.filter(r => (r.hadir + r.sakit + r.izin + r.alfa) > 0 && r.persentaseKehadiran >= 0.99).length} <span className="text-xs font-normal text-slate-400">siswa</span>
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs col-span-1 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center justify-between gap-2 flex-wrap">
            <span>Performa Akademik (Formatif & Sumatif)</span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
              🏆 Top 3 Teratas
            </span>
          </h3>
          {totalStudents === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400">Belum ada data nilai</div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={academicChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="Nilai Formatif" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="Nilai Sumatif" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Attendance Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
              Komposisi Kehadiran
            </h3>
            {!hasAttendanceData ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                Belum ada data absensi tercatat
              </div>
            ) : (
              <div className="h-48 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendancePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {attendancePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-800">{(avgAttendance).toFixed(0)}%</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Kehadiran</span>
                </div>
              </div>
            )}
          </div>

          {/* Legend and lists */}
          <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
            {attendancePieData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="font-bold">{d.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-800">{d.value} hari</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monitoring Highlights Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Disciplined Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            🏆 Murid Paling Disiplin (Kehadiran Tertinggi)
          </h4>
          {topDisciplined.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">Belum ada data presensi.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {topDisciplined.map((item, idx) => {
                const s = students.find(std => std.nis === item.nis);
                return (
                  <div key={item.nis} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {s?.noAbsen && (
                          <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-700 font-mono font-extrabold text-[9px] shrink-0">
                            No. {s.noAbsen}
                          </span>
                        )}
                        <span className="font-bold text-slate-800 text-sm">{item.nama}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">NIS: {item.nis}</span>
                    </div>
                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {formatPct(item.persentaseKehadiran)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Needs attention (absent/late cases) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            🚨 Perlu Pemantauan (Sering Terlambat / Absen)
          </h4>
          {needsAttention.length === 0 ? (
            <p className="text-sm text-slate-500 bg-indigo-50/20 p-3 rounded-xl border border-indigo-100 text-center">
              🎉 Semua murid terpantau sangat tertib dan tepat waktu!
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {needsAttention.map((item, idx) => {
                const s = students.find(std => std.nis === item.nis);
                return (
                  <div key={item.nis} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {s?.noAbsen && (
                          <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-700 font-mono font-extrabold text-[9px] shrink-0">
                            No. {s.noAbsen}
                          </span>
                        )}
                        <span className="font-bold text-slate-800 text-sm">{item.nama}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">NIS: {item.nis}</span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      {item.terlambatCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100">
                          {item.terlambatCount}x Terlambat
                        </span>
                      )}
                      <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">
                        {formatPct(item.persentaseKehadiran)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Running Rekapitulasi Bulanan Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Rekapitulasi Bulanan Siswa (Otomatis dari Google Sheets)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Data rekapitulasi dihitung otomatis oleh formula spreadsheet berbasis data kehadiran di lembar "Absensi".
          </p>
        </div>

        {students.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Belum ada data untuk ditampilkan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-xs tracking-wider uppercase border-b border-slate-200">
                  <th className="py-3 px-5">Siswa</th>
                  <th className="py-3 px-5 text-center w-24">Hadir</th>
                  <th className="py-3 px-5 text-center w-24">Sakit</th>
                  <th className="py-3 px-5 text-center w-24">Izin</th>
                  <th className="py-3 px-5 text-center w-24">Alfa</th>
                  <th className="py-3 px-5 text-center w-28">Terlambat (Frekuensi)</th>
                  <th className="py-3 px-5 text-center w-36 bg-slate-50">Persentase Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recap.map(row => {
                  const s = students.find(std => std.nis === row.nis);
                  return (
                    <tr key={row.nis} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {s?.noAbsen && (
                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 font-mono font-extrabold text-xs shrink-0">
                              No. {s.noAbsen}
                            </span>
                          )}
                          <div>
                            <span className="font-bold text-slate-800 block text-sm">{row.nama}</span>
                            <span className="font-mono text-xs text-slate-500">NIS: {row.nis}</span>
                          </div>
                        </div>
                      </td>
                    <td className="py-3.5 px-5 text-center font-bold text-indigo-600 font-mono text-sm">{row.hadir}</td>
                    <td className="py-3.5 px-5 text-center font-bold text-sky-600 font-mono text-sm">{row.sakit}</td>
                    <td className="py-3.5 px-5 text-center font-bold text-amber-500 font-mono text-sm">{row.izin}</td>
                    <td className="py-3.5 px-5 text-center font-bold text-rose-600 font-mono text-sm">{row.alfa}</td>
                    <td className="py-3.5 px-5 text-center font-bold text-rose-500 font-mono text-sm">
                      <span className={row.terlambatCount > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-400'}>
                        {row.terlambatCount}x
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center bg-slate-50/50">
                      {(row.hadir + row.sakit + row.izin + row.alfa) === 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold text-slate-400 bg-slate-100 border border-slate-200">
                          0.0%
                        </span>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${getPctColorClass(row.persentaseKehadiran)}`}>
                          {formatPct(row.persentaseKehadiran)}
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

      {/* Jurnal Karakter & Keaktifan Siswa (Pertimbangan Nilai Sikap) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              🗒️ Rekap Jurnal Karakter & Keaktifan Siswa
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Data pencatatan keaktifan (siswa aktif) dan kendala harian (siswa bermasalah) sebagai acuan penilaian perkembangan karakter/afektif.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 font-extrabold rounded-lg flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> {notes.filter(n => n.tipe === 'aktif').length} Keaktifan
            </span>
            <span className="px-3 py-1 bg-rose-50 border border-rose-100 text-rose-700 font-extrabold rounded-lg flex items-center gap-1.5 shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> {notes.filter(n => n.tipe === 'bermasalah').length} Kendala
            </span>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Belum ada data roster siswa.
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* List of students and their notes summary */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/20 lg:col-span-5 shadow-inner">
                <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Daftar Perkembangan Karakter Siswa
                </div>
                <div className="divide-y divide-slate-150 max-h-[380px] overflow-y-auto">
                  {students.map(s => {
                    const studentNotes = notes.filter(n => n.nis === s.nis);
                    const activeCount = studentNotes.filter(n => n.tipe === 'aktif').length;
                    const problemCount = studentNotes.filter(n => n.tipe === 'bermasalah').length;
                    const isSelected = selectedStudentNisForNotes === s.nis;

                    return (
                      <button
                        key={s.nis}
                        type="button"
                        onClick={() => setSelectedStudentNisForNotes(isSelected ? null : s.nis)}
                        className={`w-full text-left px-4 py-3.5 flex items-center justify-between transition cursor-pointer text-xs ${
                          isSelected ? 'bg-indigo-50/70 border-l-4 border-l-indigo-600 font-bold' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="space-y-1 pr-3 truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            {s.noAbsen && (
                              <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-700 font-mono font-extrabold text-[9px] shrink-0">
                                No. {s.noAbsen}
                              </span>
                            )}
                            <span className="font-extrabold text-slate-800 block truncate">{s.nama}</span>
                          </div>
                          <span className="font-mono text-[9px] text-slate-400 block">NIS: {s.nis}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {activeCount > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-100/80 text-emerald-800 font-bold rounded text-[9px] flex items-center gap-0.5">
                              ⭐ {activeCount}x
                            </span>
                          )}
                          {problemCount > 0 && (
                            <span className="px-2 py-0.5 bg-rose-100/80 text-rose-800 font-bold rounded text-[9px] flex items-center gap-0.5">
                              ⚠️ {problemCount}x
                            </span>
                          )}
                          {activeCount === 0 && problemCount === 0 && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-400 font-semibold rounded text-[9px]">
                              -
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detail view of the selected student's notes */}
              <div className="border border-slate-200 rounded-2xl bg-white p-5 flex flex-col justify-between min-h-[380px] lg:col-span-7 shadow-xs">
                {selectedStudentNisForNotes ? (() => {
                  const s = students.find(std => std.nis === selectedStudentNisForNotes);
                  const studentNotes = notes.filter(n => n.nis === selectedStudentNisForNotes);

                  return (
                    <div className="space-y-4 flex-grow flex flex-col">
                      <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider block">Pertimbangan Nilai Sikap</span>
                          <h4 className="font-black text-slate-800 text-sm mt-0.5">{s?.nama}</h4>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIS: {s?.nis}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold rounded-lg">
                            {studentNotes.filter(n => n.tipe === 'aktif').length}x Aktif
                          </span>
                          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-extrabold rounded-lg">
                            {studentNotes.filter(n => n.tipe === 'bermasalah').length}x Kendala
                          </span>
                        </div>
                      </div>

                      {studentNotes.length === 0 ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center p-6 text-slate-400">
                          <ClipboardCheck className="w-10 h-10 text-slate-200 mb-3" />
                          <p className="font-extrabold text-xs text-slate-700">Belum Ada Catatan Jurnal</p>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                            Tidak ditemukan riwayat catatan untuk siswa ini. Seluruh rekam jejak perilaku selama jam pelajaran di kelas akan muncul di sini.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 flex-grow overflow-y-auto max-h-[300px] pr-1">
                          {studentNotes.map(n => (
                            <div 
                              key={n.id} 
                              className={`p-3.5 rounded-xl border text-[11px] space-y-2 ${
                                n.tipe === 'aktif'
                                  ? 'bg-emerald-50/20 border-emerald-100'
                                  : 'bg-rose-50/20 border-rose-100'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold">
                                <span className={n.tipe === 'aktif' ? 'text-emerald-700 flex items-center gap-1' : 'text-rose-700 flex items-center gap-1'}>
                                  {n.tipe === 'aktif' ? (
                                    <>
                                      <Sparkles className="w-3 h-3 text-emerald-500" /> Jurnal Aktif
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="w-3 h-3 text-rose-500" /> Jurnal Kendala Perilaku
                                    </>
                                  )}
                                </span>
                                <span className="text-slate-400 font-mono text-[9px]">{n.tanggal}</span>
                              </div>
                              <p className="text-slate-600 leading-relaxed font-semibold italic text-xs">
                                "{n.catatan}"
                              </p>
                              <div className="text-[9px] text-slate-400 font-bold flex items-center gap-1 border-t border-slate-100/50 pt-1.5 mt-1.5">
                                <Clock className="w-3 h-3 text-slate-300" /> Jam Pembelajaran: {n.jamPembelajaran}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-6 text-slate-400 my-auto">
                    <ClipboardCheck className="w-12 h-12 text-slate-200 mb-3 animate-bounce" />
                    <p className="font-extrabold text-xs text-slate-700">Pilih Siswa Terlebih Dahulu</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed font-medium">
                      Pilih nama siswa pada panel sebelah kiri untuk menampilkan riwayat keaktifan dan kendala perilaku yang terdokumentasi harian.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
