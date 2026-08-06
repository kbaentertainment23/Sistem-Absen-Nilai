import React, { useState, useEffect } from 'react';
import { Student, GradeFormative, GradeSummative, GradeColumn } from '../types';
const getStudentPhotoUrl = (foto?: string) => foto || undefined;
const handleStudentPhotoError = (e: any, ..._args: any[]) => {
  if (e?.currentTarget) {
    e.currentTarget.style.display = 'none';
  }
};
import { Search, Save, Check, AlertCircle, Sparkles, Loader2, BookOpen, GraduationCap, User, X } from 'lucide-react';

interface GradesTabProps {
  students: Student[];
  formativeGrades: GradeFormative[];
  summativeGrades: GradeSummative[];
  onSave: (
    formative: GradeFormative[],
    summative: GradeSummative[],
    customFormativeCols?: GradeColumn[],
    customSummativeCols?: GradeColumn[]
  ) => Promise<void>;
  formativeCols?: GradeColumn[];
  setFormativeCols?: React.Dispatch<React.SetStateAction<GradeColumn[]>>;
  summativeCols?: GradeColumn[];
  setSummativeCols?: React.Dispatch<React.SetStateAction<GradeColumn[]>>;
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

const getColShortLabel = (col: GradeColumn) => {
  if (!col) return '';
  const keyLower = col.key.toLowerCase();
  const fMatch = keyLower.match(/^f(\d+)$/);
  if (fMatch) return `F${fMatch[1]}`;
  const sMatch = keyLower.match(/^s(\d+)$/);
  if (sMatch) return `S${sMatch[1]}`;
  if (keyLower === 'uts') return 'UTS';
  if (keyLower === 'uas') return 'UAS';
  return col.label.match(/\(([^)]+)\)/)?.[1] || col.label;
};

export default function GradesTab({
  students,
  formativeGrades,
  summativeGrades,
  onSave,
  formativeCols = [],
  setFormativeCols,
  summativeCols = [],
  setSummativeCols
}: GradesTabProps) {
  const [gradeType, setGradeType] = useState<'formative' | 'summative'>('formative');
  const [searchQuery, setSearchQuery] = useState('');
  const [localFormative, setLocalFormative] = useState<GradeFormative[]>([]);
  const [localSummative, setLocalSummative] = useState<GradeSummative[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const [zoomedName, setZoomedName] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);

  const activeFormativeCols = formativeCols.length > 0 ? formativeCols : DEFAULT_FORMATIVE_COLS;
  const activeSummativeCols = summativeCols.length > 0 ? summativeCols : DEFAULT_SUMMATIVE_COLS;

  const buildFormativeList = (studentList: Student[], grades: GradeFormative[]): GradeFormative[] => {
    return studentList.map(s => {
      const existing = grades.find(g => g.nis === s.nis);
      if (existing) {
        return {
          ...existing,
          nama: s.nama,
          kelas: s.kelas || existing.kelas,
          jenisKelamin: s.jenisKelamin || existing.jenisKelamin
        };
      }
      return {
        nis: s.nis,
        nama: s.nama,
        kelas: s.kelas,
        jenisKelamin: s.jenisKelamin,
        rataRata: null
      };
    });
  };

  const buildSummativeList = (studentList: Student[], grades: GradeSummative[]): GradeSummative[] => {
    return studentList.map(s => {
      const existing = grades.find(g => g.nis === s.nis);
      if (existing) {
        return {
          ...existing,
          nama: s.nama,
          kelas: s.kelas || existing.kelas,
          jenisKelamin: s.jenisKelamin || existing.jenisKelamin
        };
      }
      return {
        nis: s.nis,
        nama: s.nama,
        kelas: s.kelas,
        jenisKelamin: s.jenisKelamin,
        rataRata: null
      };
    });
  };

  // Sync local state when the student roster (class) changes
  useEffect(() => {
    setLocalFormative(buildFormativeList(students, formativeGrades));
    setLocalSummative(buildSummativeList(students, summativeGrades));
    setIsDirty(false);
    setSaveStatus('idle');
  }, [students]);

  // Sync local state with fresh props when they change, but ONLY if not dirty (no unsaved changes)
  useEffect(() => {
    if (!isDirty) {
      setLocalFormative(buildFormativeList(students, formativeGrades));
      setLocalSummative(buildSummativeList(students, summativeGrades));
    }
  }, [formativeGrades, summativeGrades, isDirty, students]);

  const calculateAverage = (scores: (number | null | undefined)[]): number | null => {
    const validScores = scores
      .map(s => (s !== null && s !== undefined ? Number(s) : null))
      .filter((s): s is number => s !== null && !isNaN(s));
    if (validScores.length === 0) return null;
    const sum = validScores.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / validScores.length;
    return isNaN(avg) ? null : parseFloat(avg.toFixed(1));
  };

  const formatAvgPlaceholder = (scores: (number | null | undefined)[]): string => {
    const avg = calculateAverage(scores);
    if (avg === null || isNaN(avg)) return '0.0';
    return avg.toFixed(1);
  };

  const handleGradeChange = (
    nis: string,
    field: string,
    value: string
  ) => {
    setIsDirty(true);
    // If empty string, set as null
    if (value.trim() === '') {
      if (gradeType === 'formative') {
        setLocalFormative(prev =>
          prev.map(g => {
            if (g.nis === nis) {
              const updated = { ...g, [field]: null };
              if (field !== 'rataRata') {
                const scores = activeFormativeCols.map(c => updated[c.key]);
                updated.rataRata = calculateAverage(scores);
              }
              return updated;
            }
            return g;
          })
        );
      } else {
        setLocalSummative(prev =>
          prev.map(g => {
            if (g.nis === nis) {
              const updated = { ...g, [field]: null };
              if (field !== 'rataRata') {
                const scores = activeSummativeCols.map(c => updated[c.key]);
                updated.rataRata = calculateAverage(scores);
              }
              return updated;
            }
            return g;
          })
        );
      }
      return;
    }

    // Otherwise validate range 0-100
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) return;

    if (gradeType === 'formative') {
      setLocalFormative(prev =>
        prev.map(g => {
          if (g.nis === nis) {
            const updated = { ...g, [field]: parsed };
            if (field !== 'rataRata') {
              const scores = activeFormativeCols.map(c => updated[c.key]);
              updated.rataRata = calculateAverage(scores);
            }
            return updated;
          }
          return g;
        })
      );
    } else {
      setLocalSummative(prev =>
        prev.map(g => {
          if (g.nis === nis) {
            const updated = { ...g, [field]: parsed };
            if (field !== 'rataRata') {
              const scores = activeSummativeCols.map(c => updated[c.key]);
              updated.rataRata = calculateAverage(scores);
            }
            return updated;
          }
          return g;
        })
      );
    }
  };

  const handleAddColumn = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      if (gradeType === 'formative') {
        if (!setFormativeCols) return;
        const nextIndex = activeFormativeCols.length + 1;
        const newCol = {
          key: `f${nextIndex}`,
          label: `Formatif ${nextIndex} (F${nextIndex})`
        };
        const updatedCols = [...(formativeCols.length > 0 ? formativeCols : DEFAULT_FORMATIVE_COLS), newCol];
        setFormativeCols(updatedCols);
        
        const updatedGrades = localFormative.map(r => ({ ...r, [newCol.key]: null }));
        setLocalFormative(updatedGrades);

        await onSave(updatedGrades, localSummative, updatedCols, activeSummativeCols);
      } else {
        if (!setSummativeCols) return;
        const sCols = activeSummativeCols.filter(c => c.key.startsWith('s'));
        const nextSIndex = sCols.length + 1;
        const newCol = {
          key: `s${nextSIndex}`,
          label: `Sumatif ${nextSIndex} (S${nextSIndex})`
        };

        let updatedCols: GradeColumn[] = [];
        const cols = summativeCols.length > 0 ? summativeCols : DEFAULT_SUMMATIVE_COLS;
        const utsIndex = cols.findIndex(c => c.key === 'uts');
        if (utsIndex !== -1) {
          const updated = [...cols];
          updated.splice(utsIndex, 0, newCol);
          updatedCols = updated;
        } else {
          updatedCols = [...cols, newCol];
        }
        setSummativeCols(updatedCols);

        const updatedGrades = localSummative.map(r => ({ ...r, [newCol.key]: null }));
        setLocalSummative(updatedGrades);

        await onSave(localFormative, updatedGrades, activeFormativeCols, updatedCols);
      }
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveColumn = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      if (gradeType === 'formative') {
        if (!setFormativeCols || activeFormativeCols.length <= 1) return;
        const colToRemove = activeFormativeCols[activeFormativeCols.length - 1];
        const updatedCols = (formativeCols.length > 0 ? formativeCols : DEFAULT_FORMATIVE_COLS).slice(0, -1);
        setFormativeCols(updatedCols);

        const updatedGrades = localFormative.map(r => {
          const updated = { ...r };
          delete updated[colToRemove.key];
          const scores = updatedCols.map(c => updated[c.key]);
          updated.rataRata = calculateAverage(scores);
          return updated;
        });
        setLocalFormative(updatedGrades);

        await onSave(updatedGrades, localSummative, updatedCols, activeSummativeCols);
      } else {
        if (!setSummativeCols) return;
        const sCols = activeSummativeCols.filter(c => c.key.startsWith('s'));
        if (sCols.length <= 1) return;
        const lastSCol = sCols[sCols.length - 1];

        const updatedCols = (summativeCols.length > 0 ? summativeCols : DEFAULT_SUMMATIVE_COLS).filter(c => c.key !== lastSCol.key);
        setSummativeCols(updatedCols);

        const updatedGrades = localSummative.map(r => {
          const updated = { ...r };
          delete updated[lastSCol.key];
          const scores = updatedCols.map(c => updated[c.key]);
          updated.rataRata = calculateAverage(scores);
          return updated;
        });
        setLocalSummative(updatedGrades);

        await onSave(localFormative, updatedGrades, activeFormativeCols, updatedCols);
      }
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await onSave(localFormative, localSummative);
      setSaveStatus('success');
      setIsDirty(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Get filtered records based on search query
  const filteredFormative = localFormative.filter(
    g =>
      g.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.nis.includes(searchQuery)
  );

  const filteredSummative = localSummative.filter(
    g =>
      g.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.nis.includes(searchQuery)
  );

  // Helper to color grade value
  const getGradeColor = (score: number | null | undefined) => {
    if (score === null || score === undefined || isNaN(Number(score))) return 'text-slate-400';
    if (score >= 80) return 'text-indigo-600 font-bold';
    if (score >= 65) return 'text-amber-600 font-bold';
    return 'text-rose-600 font-bold';
  };

  return (
    <div id="grades-section" className="space-y-6">
      {/* Grade Selector & Info */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setGradeType('formative')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer ${
              gradeType === 'formative'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Nilai Formatif (Harian)
          </button>
          <button
            onClick={() => setGradeType('summative')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer ${
              gradeType === 'summative'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Nilai Sumatif (Akhir Bab/Semester)
          </button>
        </div>

        <div className="flex items-center gap-3 justify-end">
          {saveStatus === 'success' && (
            <span className="text-sm text-emerald-600 font-semibold flex items-center gap-1.5 animate-pulse">
              <Check className="w-4 h-4" /> Nilai Berhasil Disinkronkan!
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-rose-600 font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Gagal sinkronisasi nilai.
            </span>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || students.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Simpan Semua Nilai
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grade Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Search header with add/remove controls */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Cari Siswa..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
          </div>

          <div className="flex flex-wrap items-center gap-3.5 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={handleRemoveColumn}
                disabled={gradeType === 'formative' ? activeFormativeCols.length <= 1 : activeSummativeCols.filter(c => c.key.startsWith('s')).length <= 1}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 font-bold rounded-lg text-[11px] transition border border-slate-200 cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Hapus kolom penilaian terakhir"
              >
                <span>- Kurang</span>
              </button>
              <span className="text-[10px] font-bold text-slate-500 px-2.5 select-none font-mono">
                {gradeType === 'formative'
                  ? `${activeFormativeCols.length} Kolom`
                  : `${activeSummativeCols.filter(c => c.key.startsWith('s')).length} Bab + UTS/UAS`}
              </span>
              <button
                type="button"
                onClick={handleAddColumn}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Tambah kolom penilaian baru"
              >
                <span>+ Tambah</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              Kalkulasi Rata-Rata Otomatis
            </div>
          </div>
        </div>

        {/* Content table */}
        {students.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600">Belum ada siswa.</p>
          </div>
        ) : gradeType === 'formative' ? (
          <div>
            {/* Formative Mobile View: Cards */}
            <div className="block md:hidden space-y-4 p-4 bg-slate-50/50">
              {filteredFormative.map(row => {
                const matchingStudent = students.find(s => s.nis === row.nis);
                const studentPhoto = matchingStudent?.foto || localStorage.getItem(`student_photo_${row.nis}`);
                const noAbsen = matchingStudent?.noAbsen || '';
                return (
                  <div key={row.nis} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                      {noAbsen && (
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-indigo-700 font-mono font-extrabold text-[10px] shrink-0">
                          No. {noAbsen}
                        </span>
                      )}
                      {studentPhoto ? (
                        <img
                          src={getStudentPhotoUrl(studentPhoto)}
                          alt={row.nama}
                          referrerPolicy="no-referrer"
                          onError={(e) => handleStudentPhotoError(e, studentPhoto)}
                          className="w-9 h-9 object-cover rounded-full border border-slate-200"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm block truncate">{row.nama}</span>
                          {matchingStudent?.label && (
                            (() => {
                              let bgClass = "bg-slate-100 text-slate-700 border-slate-200";
                              if (matchingStudent.label.toLowerCase().includes("ketua kelas")) {
                                bgClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
                              } else if (matchingStudent.label.toLowerCase().includes("osis") || matchingStudent.label.toLowerCase().includes("omp")) {
                                bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                              } else if (matchingStudent.label.toLowerCase().includes("bermasalah")) {
                                bgClass = "bg-rose-50 text-rose-700 border-rose-200";
                              }
                              const displayVal = matchingStudent.label.toUpperCase() === 'OSIS' ? 'OMP' : matchingStudent.label;
                              return (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-wider ${bgClass}`}>
                                  {displayVal}
                                </span>
                              );
                            })()
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 block select-all">NIS: {row.nis}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                      {activeFormativeCols.map(col => (
                        <div key={col.key} className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-150">
                          <span className="block text-[10px] font-bold text-slate-500 truncate" title={col.label}>
                            {getColShortLabel(col)}
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="--"
                            value={row[col.key] === null || row[col.key] === undefined || isNaN(Number(row[col.key])) ? '' : row[col.key]}
                            onChange={e => handleGradeChange(row.nis, col.key, e.target.value)}
                            className="w-full text-center py-1 rounded-md border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                          />
                        </div>
                      ))}
                      
                      {/* Rata-Rata Card */}
                      <div className="space-y-1 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 col-span-2 sm:col-span-1">
                        <span className="block text-[10px] font-bold text-indigo-600 truncate">
                          Rata-Rata
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder={formatAvgPlaceholder(activeFormativeCols.map(c => row[c.key]))}
                          value={row.rataRata === null || row.rataRata === undefined || isNaN(Number(row.rataRata)) ? '' : row.rataRata}
                          onChange={e => handleGradeChange(row.nis, 'rataRata', e.target.value)}
                          className={`w-full text-center py-1 rounded-md border border-indigo-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white ${getGradeColor(row.rataRata)}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Formative Desktop View: Standard Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[650px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold text-xs lg:text-sm tracking-wider uppercase border-b border-slate-200">
                    <th className="py-3 px-5 lg:py-4">Siswa</th>
                    {activeFormativeCols.map(col => (
                      <th key={col.key} className="py-3 px-5 lg:py-4 text-center w-24 lg:w-28" title={col.label}>
                        {getColShortLabel(col)}
                      </th>
                    ))}
                    <th className="py-3 px-5 lg:py-4 text-center w-36 lg:w-40 bg-indigo-50/10">Rata-Rata Formatif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFormative.map(row => (
                    <tr key={row.nis} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-5 lg:py-3.5">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const matchingStudent = students.find(s => s.nis === row.nis);
                            const studentPhoto = matchingStudent?.foto || localStorage.getItem(`student_photo_${row.nis}`);
                            const noAbsen = matchingStudent?.noAbsen || '';
                            return (
                              <>
                                {noAbsen && (
                                  <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 font-mono font-extrabold text-xs lg:text-sm shrink-0">
                                    No. {noAbsen}
                                  </span>
                                )}
                                {studentPhoto ? (
                                  <img
                                    src={getStudentPhotoUrl(studentPhoto)}
                                    alt={row.nama}
                                    referrerPolicy="no-referrer"
                                    onError={(e) => handleStudentPhotoError(e, studentPhoto)}
                                    className="w-10 h-10 lg:w-12 lg:h-12 object-cover rounded-full border border-slate-200 cursor-pointer hover:scale-105 transition duration-150"
                                    onClick={() => {
                                      setZoomedPhoto(studentPhoto);
                                      setZoomedName(row.nama);
                                    }}
                                  />
                                ) : (
                                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                                    <User className="w-5 h-5 lg:w-6 lg:h-6" />
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="font-bold text-slate-800 block text-sm lg:text-base">{row.nama}</span>
                              {(() => {
                                const matchingStudent = students.find(s => s.nis === row.nis);
                                if (!matchingStudent?.label) return null;
                                let bgClass = "bg-slate-100 text-slate-700 border-slate-200";
                                if (matchingStudent.label.toLowerCase().includes("ketua kelas")) {
                                  bgClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
                                } else if (matchingStudent.label.toLowerCase().includes("osis") || matchingStudent.label.toLowerCase().includes("omp")) {
                                  bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                } else if (matchingStudent.label.toLowerCase().includes("bermasalah")) {
                                  bgClass = "bg-rose-50 text-rose-700 border-rose-200";
                                }
                                const displayVal = matchingStudent.label.toUpperCase() === 'OSIS' ? 'OMP' : matchingStudent.label;
                                return (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] lg:text-[11px] font-black border uppercase tracking-wider ${bgClass}`}>
                                    {displayVal}
                                  </span>
                                );
                              })()}
                            </div>
                            <span className="font-mono text-xs lg:text-sm text-slate-500">NIS: {row.nis}</span>
                          </div>
                        </div>
                      </td>
                      {activeFormativeCols.map(col => (
                        <td key={col.key} className="py-3.5 px-5 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="--"
                            value={row[col.key] === null || row[col.key] === undefined || isNaN(Number(row[col.key])) ? '' : row[col.key]}
                            onChange={e => handleGradeChange(row.nis, col.key, e.target.value)}
                            className="w-16 lg:w-20 text-center py-1.5 lg:py-2 rounded-lg border border-slate-200 text-sm lg:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                      ))}
                      <td className="py-3.5 px-5 text-center bg-indigo-50/5 font-mono text-sm lg:text-base font-bold">
                        <span className={getGradeColor(row.rataRata)}>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder={formatAvgPlaceholder(activeFormativeCols.map(c => row[c.key]))}
                            value={row.rataRata === null || row.rataRata === undefined || isNaN(Number(row.rataRata)) ? '' : row.rataRata}
                            onChange={e => handleGradeChange(row.nis, 'rataRata', e.target.value)}
                            className={`w-16 lg:w-20 text-center py-1.5 lg:py-2 rounded-lg border border-slate-200 text-sm lg:text-base font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-xs ${getGradeColor(row.rataRata)}`}
                          />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            {/* Summative Mobile View: Cards */}
            <div className="block md:hidden space-y-4 p-4 bg-slate-50/50">
              {filteredSummative.map(row => {
                const matchingStudent = students.find(s => s.nis === row.nis);
                const studentPhoto = matchingStudent?.foto || localStorage.getItem(`student_photo_${row.nis}`);
                const noAbsen = matchingStudent?.noAbsen || '';
                return (
                  <div key={row.nis} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                      {noAbsen && (
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-indigo-700 font-mono font-extrabold text-[10px] shrink-0">
                          No. {noAbsen}
                        </span>
                      )}
                      {studentPhoto ? (
                        <img
                          src={getStudentPhotoUrl(studentPhoto)}
                          alt={row.nama}
                          referrerPolicy="no-referrer"
                          onError={(e) => handleStudentPhotoError(e, studentPhoto)}
                          className="w-9 h-9 object-cover rounded-full border border-slate-200"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm block truncate">{row.nama}</span>
                          {matchingStudent?.label && (
                            (() => {
                              let bgClass = "bg-slate-100 text-slate-700 border-slate-200";
                              if (matchingStudent.label.toLowerCase().includes("ketua kelas")) {
                                bgClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
                              } else if (matchingStudent.label.toLowerCase().includes("osis") || matchingStudent.label.toLowerCase().includes("omp")) {
                                bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                              } else if (matchingStudent.label.toLowerCase().includes("bermasalah")) {
                                bgClass = "bg-rose-50 text-rose-700 border-rose-200";
                              }
                              const displayVal = matchingStudent.label.toUpperCase() === 'OSIS' ? 'OMP' : matchingStudent.label;
                              return (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-wider ${bgClass}`}>
                                  {displayVal}
                                </span>
                              );
                            })()
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 block select-all">NIS: {row.nis}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                      {activeSummativeCols.map(col => (
                        <div key={col.key} className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-150">
                          <span className="block text-[10px] font-bold text-slate-500 truncate" title={col.label}>
                            {getColShortLabel(col)}
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="--"
                            value={row[col.key] === null || row[col.key] === undefined || isNaN(Number(row[col.key])) ? '' : row[col.key]}
                            onChange={e => handleGradeChange(row.nis, col.key, e.target.value)}
                            className="w-full text-center py-1 rounded-md border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                          />
                        </div>
                      ))}
                      
                      {/* Rata-Rata Card */}
                      <div className="space-y-1 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 col-span-2 sm:col-span-1">
                        <span className="block text-[10px] font-bold text-indigo-600 truncate">
                          Rata-Rata
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder={formatAvgPlaceholder(activeSummativeCols.map(c => row[c.key]))}
                          value={row.rataRata === null || row.rataRata === undefined || isNaN(Number(row.rataRata)) ? '' : row.rataRata}
                          onChange={e => handleGradeChange(row.nis, 'rataRata', e.target.value)}
                          className={`w-full text-center py-1 rounded-md border border-indigo-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white ${getGradeColor(row.rataRata)}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summative Desktop View: Standard Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[650px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold text-xs lg:text-sm tracking-wider uppercase border-b border-slate-200">
                    <th className="py-3 px-5 lg:py-4">Siswa</th>
                    {activeSummativeCols.map(col => (
                      <th key={col.key} className="py-3 px-5 lg:py-4 text-center w-20 lg:w-24" title={col.label}>
                        {getColShortLabel(col)}
                      </th>
                    ))}
                    <th className="py-3 px-5 lg:py-4 text-center w-36 lg:w-40 bg-indigo-50/10">Rata-Rata Sumatif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSummative.map(row => (
                    <tr key={row.nis} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-5 lg:py-3.5">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const matchingStudent = students.find(s => s.nis === row.nis);
                            const studentPhoto = matchingStudent?.foto || localStorage.getItem(`student_photo_${row.nis}`);
                            const noAbsen = matchingStudent?.noAbsen || '';
                            return (
                              <>
                                {noAbsen && (
                                  <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 font-mono font-extrabold text-xs lg:text-sm shrink-0">
                                    No. {noAbsen}
                                  </span>
                                )}
                                {studentPhoto ? (
                                  <img
                                    src={getStudentPhotoUrl(studentPhoto)}
                                    alt={row.nama}
                                    referrerPolicy="no-referrer"
                                    onError={(e) => handleStudentPhotoError(e, studentPhoto)}
                                    className="w-10 h-10 lg:w-12 lg:h-12 object-cover rounded-full border border-slate-200 cursor-pointer hover:scale-105 transition duration-150"
                                    onClick={() => {
                                      setZoomedPhoto(studentPhoto);
                                      setZoomedName(row.nama);
                                    }}
                                  />
                                ) : (
                                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                                    <User className="w-5 h-5 lg:w-6 lg:h-6" />
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="font-bold text-slate-800 block text-sm lg:text-base">{row.nama}</span>
                              {(() => {
                                const matchingStudent = students.find(s => s.nis === row.nis);
                                if (!matchingStudent?.label) return null;
                                let bgClass = "bg-slate-100 text-slate-700 border-slate-200";
                                if (matchingStudent.label.toLowerCase().includes("ketua kelas")) {
                                  bgClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
                                } else if (matchingStudent.label.toLowerCase().includes("osis") || matchingStudent.label.toLowerCase().includes("omp")) {
                                  bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                } else if (matchingStudent.label.toLowerCase().includes("bermasalah")) {
                                  bgClass = "bg-rose-50 text-rose-700 border-rose-200";
                                }
                                const displayVal = matchingStudent.label.toUpperCase() === 'OSIS' ? 'OMP' : matchingStudent.label;
                                return (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] lg:text-[11px] font-black border uppercase tracking-wider ${bgClass}`}>
                                    {displayVal}
                                  </span>
                                );
                              })()}
                            </div>
                            <span className="font-mono text-xs lg:text-sm text-slate-500">NIS: {row.nis}</span>
                          </div>
                        </div>
                      </td>
                      {activeSummativeCols.map(col => (
                        <td key={col.key} className="py-3.5 px-5 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="--"
                            value={row[col.key] === null || row[col.key] === undefined || isNaN(Number(row[col.key])) ? '' : row[col.key]}
                            onChange={e => handleGradeChange(row.nis, col.key, e.target.value)}
                            className="w-14 lg:w-20 text-center py-1.5 lg:py-2 rounded-lg border border-slate-200 text-sm lg:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                      ))}
                      <td className="py-3.5 px-5 text-center bg-indigo-50/5 font-mono text-sm lg:text-base font-bold">
                        <span className={getGradeColor(row.rataRata)}>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder={formatAvgPlaceholder(activeSummativeCols.map(c => row[c.key]))}
                            value={row.rataRata === null || row.rataRata === undefined || isNaN(Number(row.rataRata)) ? '' : row.rataRata}
                            onChange={e => handleGradeChange(row.nis, 'rataRata', e.target.value)}
                            className={`w-16 lg:w-20 text-center py-1.5 lg:py-2 rounded-lg border border-slate-200 text-sm lg:text-base font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-xs ${getGradeColor(row.rataRata)}`}
                          />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Photo Zoom Modal Overlay */}
      {zoomedPhoto && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 z-50 animate-in fade-in duration-200"
          onClick={() => setZoomedPhoto(null)}
        >
          <div 
            className="bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl max-w-lg md:max-w-2xl w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div>
                <h4 className="text-base font-extrabold text-slate-100 leading-tight">{zoomedName}</h4>
                <p className="text-[10px] text-indigo-400 font-bold mt-0.5 uppercase tracking-wider">Pratinjau Foto Kualitas HD</p>
              </div>
              <button
                type="button"
                onClick={() => setZoomedPhoto(null)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative flex-1 bg-slate-950 flex items-center justify-center p-4 md:p-6 min-h-[300px] md:min-h-[420px] select-none shadow-inner">
              <img 
                src={getStudentPhotoUrl(zoomedPhoto)} 
                alt={zoomedName} 
                referrerPolicy="no-referrer"
                onError={(e) => handleStudentPhotoError(e, zoomedPhoto || undefined)}
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-2xl border border-slate-800/50"
              />
            </div>

            <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 text-center sm:text-left leading-relaxed">
                Gunakan klik kanan atau tahan layar pada ponsel untuk menyimpan foto beresolusi penuh.
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={zoomedPhoto}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl text-xs transition inline-flex items-center gap-1.5 cursor-pointer border border-slate-700 hover:border-slate-600"
                >
                  Buka Tab Baru ↗
                </a>
                <button
                  type="button"
                  onClick={() => setZoomedPhoto(null)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
