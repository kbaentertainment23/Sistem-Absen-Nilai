import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, anonymousSignIn, logout } from './lib/firebase';
import { 
  initializeDatabaseIfEmpty,
  getClassesFromFirestore,
  saveClassesToFirestore,
  getStudentsFromFirestore,
  saveStudentsToFirestore,
  saveStudentsToFirestoreForClass,
  deleteStudentFromFirestore,
  getAttendanceFromFirestore,
  saveAttendanceToFirestore,
  deleteAttendanceByDateFromFirestore,
  getFormativeGradesFromFirestore,
  saveFormativeGradesToFirestore,
  getSummativeGradesFromFirestore,
  saveSummativeGradesToFirestore,
  getStudentNotesFromFirestore,
  saveStudentNoteToFirestore,
  deleteStudentNoteFromFirestore,
  getJournalsFromFirestore,
  saveJournalToFirestore,
  deleteJournalFromFirestore,
  getExtraTikDataFromFirestore,
  saveExtraTikPesertaToFirestore,
  saveExtraTikAbsensiToFirestore,
  deleteExtraTikAbsensiByDateFromFirestore,
  saveExtraTikNilaiToFirestore,
  deepCleanDatabaseFromFirestore,
  getAppLogoFromFirestore,
  saveAppLogoToFirestore,
  getAttendanceDateNotesFromFirestore,
  saveAttendanceDateNoteToFirestore,
  deleteAttendanceDateNoteFromFirestore,
  DeepCleanResult
} from './lib/firestoreService';
import { convertGoogleDriveUrl } from './utils/imageHelper';

import { 
  Student, 
  AttendanceRecord, 
  GradeFormative, 
  GradeSummative, 
  MonthlyRecap, 
  GradeColumn, 
  StudentNote, 
  ExtraTikPeserta, 
  ExtraTikAbsensi, 
  ExtraTikNilai, 
  JurnalHarianRecord,
  AttendanceDateNote
} from './types';

// Tab components (Lazy-loaded for optimal initial page bundle & fast rendering)
import AttendanceTab from './components/AttendanceTab';
import LoginPage from './components/LoginPage';
import StudentSpinnerModal from './components/StudentSpinnerModal';
import ErrorBoundary from './components/ErrorBoundary';

const JurnalHarianTab = React.lazy(() => import('./components/JurnalHarianTab'));
const GradesTab = React.lazy(() => import('./components/GradesTab'));
const RecapTab = React.lazy(() => import('./components/RecapTab'));
const StudentsTab = React.lazy(() => import('./components/StudentsTab'));
const StudentNotesTab = React.lazy(() => import('./components/StudentNotesTab'));
const ProfessionalReportTab = React.lazy(() => import('./components/ProfessionalReportTab'));
const ExtraTIKTab = React.lazy(() => import('./components/ExtraTIKTab'));
const SettingsTab = React.lazy(() => import('./components/SettingsTab'));

import {
  Database,
  LogOut,
  CalendarDays,
  GraduationCap,
  PieChart,
  Users,
  Loader2,
  AlertCircle,
  Award,
  ChevronRight,
  ClipboardList,
  Sparkles,
  BookOpen,
  UserCheck,
  Menu,
  X,
  ShieldCheck,
  Check,
  Layers,
  FileText,
  RefreshCw,
  Lock,
  KeyRound,
  Settings,
  Dices
} from 'lucide-react';

const DEFAULT_CLASSES = Array.from({ length: 11 }, (_, i) => ({
  id: i + 1,
  name: `Kelas 8.${i + 1}`
}));

// LocalStorage caching helpers for fast tab switching & instant load
const getLocalCache = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (err) {
    console.warn(`Gagal membaca cache ${key}:`, err);
    return fallback;
  }
};

const setLocalCache = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Gagal menyimpan cache ${key}:`, err);
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [role, setRole] = useState<'admin' | 'guru'>('admin');

  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' | 'error' }[]>([]);

  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Active tab
  const [activeTab, setActiveTab] = useState<
    'attendance' | 'journal' | 'grades' | 'notes' | 'recap' | 'students' | 'professional_report' | 'extra_tik' | 'settings'
  >('attendance');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Classes State with LocalStorage Caching
  const [classes, setClasses] = useState<{ id: number; name: string }[]>(() =>
    getLocalCache('cache_classes', DEFAULT_CLASSES)
  );
  const [selectedClassId, setSelectedClassId] = useState<number>(1);

  const activeClassName = useMemo(() => {
    return classes.find(c => c.id === selectedClassId)?.name || `Kelas 8.${selectedClassId}`;
  }, [classes, selectedClassId]);

  // Firestore Data State with LocalStorage Caching
  const [allStudents, setAllStudents] = useState<Student[]>(() =>
    getLocalCache('cache_allStudents', [])
  );
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>(() =>
    getLocalCache('cache_allAttendance', [])
  );
  const [allFormative, setAllFormative] = useState<GradeFormative[]>(() =>
    getLocalCache('cache_allFormative', [])
  );
  const [allSummative, setAllSummative] = useState<GradeSummative[]>(() =>
    getLocalCache('cache_allSummative', [])
  );
  const [formativeCols, setFormativeCols] = useState<GradeColumn[]>(() =>
    getLocalCache('cache_formativeCols', [])
  );
  const [summativeCols, setSummativeCols] = useState<GradeColumn[]>(() =>
    getLocalCache('cache_summativeCols', [])
  );
  const [allNotes, setAllNotes] = useState<StudentNote[]>(() =>
    getLocalCache('cache_allNotes', [])
  );
  const [allJournals, setAllJournals] = useState<JurnalHarianRecord[]>(() =>
    getLocalCache('cache_allJournals', [])
  );

  // Extra TIK States with LocalStorage Caching
  const [extraTikPeserta, setExtraTikPeserta] = useState<ExtraTikPeserta[]>(() =>
    getLocalCache('cache_extraTikPeserta', [])
  );
  const [extraTikAbsensi, setExtraTikAbsensi] = useState<ExtraTikAbsensi[]>(() =>
    getLocalCache('cache_extraTikAbsensi', [])
  );
  const [extraTikNilai, setExtraTikNilai] = useState<ExtraTikNilai[]>(() =>
    getLocalCache('cache_extraTikNilai', [])
  );
  const [allDateNotes, setAllDateNotes] = useState<AttendanceDateNote[]>(() =>
    getLocalCache('cache_allDateNotes', [])
  );

  // Custom App Logo State
  const [appLogoUrl, setAppLogoUrl] = useState<string>(() => localStorage.getItem('app_custom_logo') || '');
  const [logoHeaderError, setLogoHeaderError] = useState(false);

  useEffect(() => {
    setLogoHeaderError(false);
  }, [appLogoUrl]);

  const handleUpdateAppLogoUrl = async (newUrl: string) => {
    setAppLogoUrl(newUrl);
    setLogoHeaderError(false);
    if (newUrl) {
      localStorage.setItem('app_custom_logo', newUrl);
    } else {
      localStorage.removeItem('app_custom_logo');
    }
    await saveAppLogoToFirestore(newUrl);
  };

  // Auto-sync state updates to LocalStorage cache
  useEffect(() => { setLocalCache('cache_classes', classes); }, [classes]);
  useEffect(() => { setLocalCache('cache_allStudents', allStudents); }, [allStudents]);
  useEffect(() => { setLocalCache('cache_allAttendance', allAttendance); }, [allAttendance]);
  useEffect(() => { setLocalCache('cache_allFormative', allFormative); }, [allFormative]);
  useEffect(() => { setLocalCache('cache_formativeCols', formativeCols); }, [formativeCols]);
  useEffect(() => { setLocalCache('cache_allSummative', allSummative); }, [allSummative]);
  useEffect(() => { setLocalCache('cache_summativeCols', summativeCols); }, [summativeCols]);
  useEffect(() => { setLocalCache('cache_allNotes', allNotes); }, [allNotes]);
  useEffect(() => { setLocalCache('cache_allJournals', allJournals); }, [allJournals]);
  useEffect(() => { setLocalCache('cache_extraTikPeserta', extraTikPeserta); }, [extraTikPeserta]);
  useEffect(() => { setLocalCache('cache_extraTikAbsensi', extraTikAbsensi); }, [extraTikAbsensi]);
  useEffect(() => { setLocalCache('cache_extraTikNilai', extraTikNilai); }, [extraTikNilai]);
  useEffect(() => { setLocalCache('cache_allDateNotes', allDateNotes); }, [allDateNotes]);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Spin Siswa Modal State
  const [isSpinModalOpen, setIsSpinModalOpen] = useState(false);

  // Admin Auth Modal for switching roles
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordModalError, setAdminPasswordModalError] = useState('');

  // Deep Clean Database States
  const [isDeepCleanModalOpen, setIsDeepCleanModalOpen] = useState(false);
  const [isDeepCleaning, setIsDeepCleaning] = useState(false);
  const [deepCleanResult, setDeepCleanResult] = useState<DeepCleanResult | null>(null);

  // 1. Auth Listener - Syncs user state without triggering layout reset flickers
  useEffect(() => {
    const unsubscribe = initAuth(
      async (authenticatedUser) => {
        setUser(authenticatedUser);
        const savedRole = (localStorage.getItem('user_role') as 'admin' | 'guru') || 'guru';
        setRole(savedRole);
      },
      async () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Load all data from Firestore
  const loadAllDatabaseData = async () => {
    // Only show full loading spinner if cache is completely empty
    if (allStudents.length === 0 && allAttendance.length === 0) {
      setIsLoadingData(true);
    }
    setErrorMsg('');
    try {
      await initializeDatabaseIfEmpty();

      const [
        loadedClasses,
        loadedStudents,
        loadedAttendance,
        formativeData,
        summativeData,
        loadedNotes,
        loadedJournals,
        extraTikData,
        loadedDateNotes,
        remoteAppLogo
      ] = await Promise.all([
        getClassesFromFirestore(),
        getStudentsFromFirestore(),
        getAttendanceFromFirestore(),
        getFormativeGradesFromFirestore(),
        getSummativeGradesFromFirestore(),
        getStudentNotesFromFirestore(),
        getJournalsFromFirestore(),
        getExtraTikDataFromFirestore(),
        getAttendanceDateNotesFromFirestore(),
        getAppLogoFromFirestore()
      ]);

      if (remoteAppLogo !== null) {
        setAppLogoUrl(remoteAppLogo);
        if (remoteAppLogo) {
          localStorage.setItem('app_custom_logo', remoteAppLogo);
        } else {
          localStorage.removeItem('app_custom_logo');
        }
      }

      setClasses(loadedClasses);
      setAllStudents(loadedStudents);
      setAllAttendance(loadedAttendance);
      setAllFormative(formativeData.grades);
      setFormativeCols(formativeData.cols);
      setAllSummative(summativeData.grades);
      setSummativeCols(summativeData.cols);
      setAllNotes(loadedNotes);
      setAllJournals(loadedJournals);
      setAllDateNotes(loadedDateNotes);

      setExtraTikPeserta(extraTikData.peserta);
      setExtraTikAbsensi(extraTikData.absensi);
      setExtraTikNilai(extraTikData.nilai);
    } catch (err: any) {
      console.error('Error loading Firestore data:', err);
      setErrorMsg(err?.message || 'Gagal memuat data dari Firebase Firestore.');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleManualRefresh = async () => {
    await loadAllDatabaseData();
    addToast('Data berhasil disinkronkan dari Firebase!', 'success');
  };

  const handleRunDeepClean = async () => {
    setIsDeepCleaning(true);
    try {
      const result = await deepCleanDatabaseFromFirestore(classes);
      setDeepCleanResult(result);
      await loadAllDatabaseData();
      addToast('Pembersihan Deep Clean database Firestore selesai!', 'success');
    } catch (err: any) {
      console.error('Deep clean error:', err);
      addToast(`Gagal Deep Clean: ${err?.message || 'Terjadi kesalahan'}`, 'error');
    } finally {
      setIsDeepCleaning(false);
    }
  };

  // 3. Filtered data for active class
  const classStudents = useMemo(() => {
    const classNum = activeClassName.replace(/^Kelas\s+/i, '').trim();
    return allStudents.filter(s => {
      if (!s.kelas && selectedClassId === 1) return true;
      if (!s.kelas) return false;
      const sClassNum = s.kelas.replace(/^Kelas\s+/i, '').trim();
      return s.kelas === activeClassName || sClassNum === classNum;
    });
  }, [allStudents, activeClassName, selectedClassId]);

  const classStudentNisSet = useMemo(() => {
    return new Set(classStudents.map(s => s.nis));
  }, [classStudents]);

  const classAttendance = useMemo(() => {
    const classNum = activeClassName.replace(/^Kelas\s+/i, '').trim();
    return allAttendance.filter(a => {
      if (classStudentNisSet.has(a.nis)) return true;
      if (a.kelas === activeClassName) return true;
      if (!a.kelas && selectedClassId === 1) return true;
      if (a.kelas) {
        return a.kelas.replace(/^Kelas\s+/i, '').trim() === classNum;
      }
      return false;
    });
  }, [allAttendance, activeClassName, selectedClassId, classStudentNisSet]);

  const classFormative = useMemo(() => {
    const classNum = activeClassName.replace(/^Kelas\s+/i, '').trim();
    return allFormative.filter(f => {
      if (classStudentNisSet.has(f.nis)) return true;
      if (f.kelas === activeClassName) return true;
      if (!f.kelas && selectedClassId === 1) return true;
      if (f.kelas) {
        return f.kelas.replace(/^Kelas\s+/i, '').trim() === classNum;
      }
      return false;
    });
  }, [allFormative, activeClassName, selectedClassId, classStudentNisSet]);

  const classSummative = useMemo(() => {
    const classNum = activeClassName.replace(/^Kelas\s+/i, '').trim();
    return allSummative.filter(s => {
      if (classStudentNisSet.has(s.nis)) return true;
      if (s.kelas === activeClassName) return true;
      if (!s.kelas && selectedClassId === 1) return true;
      if (s.kelas) {
        return s.kelas.replace(/^Kelas\s+/i, '').trim() === classNum;
      }
      return false;
    });
  }, [allSummative, activeClassName, selectedClassId, classStudentNisSet]);

  const classNotes = useMemo(() => {
    return allNotes.filter(n => n.kelas === activeClassName || (!n.kelas && selectedClassId === 1));
  }, [allNotes, activeClassName, selectedClassId]);

  const classJournals = useMemo(() => {
    return allJournals.filter(j => j.kelas === activeClassName || (!j.kelas && selectedClassId === 1));
  }, [allJournals, activeClassName, selectedClassId]);

  const classDateNotes = useMemo(() => {
    return allDateNotes.filter(n => !n.kelas || n.kelas === activeClassName || n.kelas === 'all');
  }, [allDateNotes, activeClassName]);

  // Monthly Recap calculation for current class
  const classRecap = useMemo(() => {
    return classStudents.map(student => {
      const studentRecords = classAttendance.filter(a => a.nis === student.nis);
      const hadir = studentRecords.filter(a => a.status === 'Hadir').length;
      const sakit = studentRecords.filter(a => a.status === 'Sakit').length;
      const izin = studentRecords.filter(a => a.status === 'Izin').length;
      const alfa = studentRecords.filter(a => a.status === 'Alfa').length;
      const terlambatCount = studentRecords.filter(a => a.status === 'Hadir' && a.terlambat > 0).length;
      const totalDays = hadir + sakit + izin + alfa;

      if (totalDays === 0) {
        return {
          nis: student.nis,
          nama: student.nama,
          jenisKelamin: student.jenisKelamin,
          kelas: activeClassName,
          hadir: 0,
          sakit: 0,
          izin: 0,
          alfa: 0,
          terlambatCount: 0,
          persentaseKehadiran: 0
        };
      }

      const persentaseKehadiran = hadir / totalDays;

      return {
        nis: student.nis,
        nama: student.nama,
        jenisKelamin: student.jenisKelamin,
        kelas: activeClassName,
        hadir,
        sakit,
        izin,
        alfa,
        terlambatCount,
        persentaseKehadiran
      };
    });
  }, [classStudents, classAttendance, activeClassName]);

  // Handlers for Data Syncing with Firebase
  const handleSaveAttendance = async (records: AttendanceRecord[]) => {
    // Inject active class into records
    const enrichedRecords = records.map(r => ({ ...r, kelas: activeClassName }));
    await saveAttendanceToFirestore(enrichedRecords);
    
    // Update local state
    setAllAttendance(prev => {
      const filtered = prev.filter(
        a => !(a.kelas === activeClassName && enrichedRecords.some(r => r.tanggal === a.tanggal && r.nis === a.nis))
      );
      return [...filtered, ...enrichedRecords];
    });
    addToast('Data absensi berhasil disimpan ke Firebase!', 'success');
  };

  const handleDeleteAttendance = async (date: string) => {
    await deleteAttendanceByDateFromFirestore(date, activeClassName);
    setAllAttendance(prev => prev.filter(a => !(a.tanggal === date && a.kelas === activeClassName)));
    addToast(`Absensi tanggal ${date} berhasil dihapus dari Firebase.`, 'info');
  };

  const handleSaveDateNote = async (note: AttendanceDateNote) => {
    const enrichedNote = { ...note, kelas: note.kelas || activeClassName };
    await saveAttendanceDateNoteToFirestore(enrichedNote);
    setAllDateNotes(prev => {
      const filtered = prev.filter(n => !(n.tanggal === enrichedNote.tanggal && (n.kelas === enrichedNote.kelas || (!n.kelas && enrichedNote.kelas === activeClassName))));
      return [...filtered, enrichedNote];
    });
    addToast(`Penanda tanggal ${enrichedNote.tanggal} berhasil disimpan!`, 'success');
  };

  const handleDeleteDateNote = async (date: string) => {
    await deleteAttendanceDateNoteFromFirestore(date, activeClassName);
    setAllDateNotes(prev => prev.filter(n => !(n.tanggal === date && (n.kelas === activeClassName || n.kelas === 'all' || !n.kelas))));
    addToast(`Penanda tanggal ${date} berhasil dihapus.`, 'info');
  };

  const handleSaveGrades = async (
    formative: GradeFormative[],
    summative: GradeSummative[],
    colsF?: GradeColumn[],
    colsS?: GradeColumn[]
  ) => {
    const enrichedFormative = formative.map(f => ({ ...f, kelas: activeClassName }));
    const enrichedSummative = summative.map(s => ({ ...s, kelas: activeClassName }));

    await saveFormativeGradesToFirestore(enrichedFormative, colsF);
    await saveSummativeGradesToFirestore(enrichedSummative, colsS);

    if (colsF) setFormativeCols(colsF);
    if (colsS) setSummativeCols(colsS);

    setAllFormative(prev => {
      const filtered = prev.filter(f => f.kelas !== activeClassName);
      return [...filtered, ...enrichedFormative];
    });

    setAllSummative(prev => {
      const filtered = prev.filter(s => s.kelas !== activeClassName);
      return [...filtered, ...enrichedSummative];
    });

    addToast('Data nilai berhasil disimpan ke Firebase!', 'success');
  };

  const handleSyncRoster = async (updatedStudents: Student[], _nisChanges?: Record<string, string>, targetNis?: string) => {
    const enriched = updatedStudents.map(s => ({ ...s, kelas: activeClassName }));
    await saveStudentsToFirestoreForClass(activeClassName, enriched, targetNis);

    const activeNum = activeClassName.replace(/^Kelas\s+/i, '').trim();
    const targetNisList = targetNis ? targetNis.split(',').map(n => n.trim()).filter(Boolean) : [];
    const targetNisSet = new Set(targetNisList);

    setAllStudents(prev => {
      const filtered = prev.filter(s => {
        if (targetNisSet.has(s.nis)) return false;
        const sClass = s.kelas || 'Kelas 8.1';
        const sClassNum = sClass.replace(/^Kelas\s+/i, '').trim();
        return sClass !== activeClassName && sClassNum !== activeNum;
      });
      return [...filtered, ...enriched];
    });
    addToast('Daftar siswa kelas berhasil diperbarui di Firebase!', 'success');
  };

  const handleSyncClasses = async (updatedClasses: { id: number; name: string }[]) => {
    await saveClassesToFirestore(updatedClasses);
    setClasses(updatedClasses);
    addToast('Daftar kelas berhasil disimpan!', 'success');
  };

  const handleSaveNote = async (note: StudentNote) => {
    const enrichedNote = { ...note, kelas: activeClassName };
    const savedId = await saveStudentNoteToFirestore(enrichedNote);
    const finalNote = { ...enrichedNote, id: savedId };
    setAllNotes(prev => {
      const idx = prev.findIndex(n => n.id === savedId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = finalNote;
        return copy;
      }
      return [finalNote, ...prev];
    });
    addToast('Catatan siswa berhasil disimpan ke Firebase!', 'success');
  };

  const handleDeleteNote = async (id: string) => {
    if (!id) return;
    try {
      await deleteStudentNoteFromFirestore(id);
    } catch (err) {
      console.error('Error deleting student note:', err);
    }
    setAllNotes(prev => prev.filter(n => n.id !== id));
    addToast('Catatan siswa berhasil dihapus.', 'info');
  };

  const handleSaveJournal = async (journal: JurnalHarianRecord) => {
    const enriched = { ...journal, kelas: activeClassName };
    const savedId = await saveJournalToFirestore(enriched);
    const finalJournal = { ...enriched, id: savedId };
    setAllJournals(prev => {
      const idx = prev.findIndex(j => j.id === savedId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = finalJournal;
        return copy;
      }
      return [finalJournal, ...prev];
    });
    addToast('Jurnal harian berhasil disimpan ke Firebase!', 'success');
  };

  const handleDeleteJournal = async (id: string) => {
    if (!id) return;
    try {
      await deleteJournalFromFirestore(id);
    } catch (err) {
      console.error('Error deleting journal:', err);
    }
    setAllJournals(prev => prev.filter(j => j.id !== id));
    addToast('Jurnal harian berhasil dihapus.', 'info');
  };

  const handleSyncExtraTikPeserta = async (list: ExtraTikPeserta[], deletedNis?: string) => {
    await saveExtraTikPesertaToFirestore(list, deletedNis);
    setExtraTikPeserta(list);
    addToast(deletedNis ? 'Peserta Extra TIK berhasil dihapus dari Firebase!' : 'Data peserta Extra TIK tersimpan ke Firebase!', 'success');
  };

  const handleSyncExtraTikAbsensi = async (list: ExtraTikAbsensi[], dateToClear?: string, classToClear?: string) => {
    if (dateToClear) {
      await deleteExtraTikAbsensiByDateFromFirestore(dateToClear, classToClear);
    }
    await saveExtraTikAbsensiToFirestore(list);
    setExtraTikAbsensi(list);
    if (dateToClear && list.length < extraTikAbsensi.length) {
      addToast('Data absensi Extra TIK berhasil diperbarui / dihapus dari Firebase.', 'info');
    } else {
      addToast('Data absensi Extra TIK tersimpan ke Firebase!', 'success');
    }
  };

  const handleSyncExtraTikNilai = async (list: ExtraTikNilai[]) => {
    await saveExtraTikNilaiToFirestore(list);
    setExtraTikNilai(list);
    addToast('Data nilai Extra TIK tersimpan ke Firebase!', 'success');
  };

  // Sign In Actions
  const handleGuruSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await anonymousSignIn();
      if (res?.user) {
        setUser(res.user);
      } else {
        setUser({ uid: 'guest_teacher_user', isAnonymous: true, displayName: 'Guru' } as any);
      }
      setRole('guru');
      localStorage.setItem('user_role', 'guru');
      localStorage.setItem('user_logged_in', 'true');
      setNeedsAuth(false);
      await loadAllDatabaseData();
      addToast('Berhasil masuk sebagai Guru', 'success');
    } catch (err: any) {
      console.error(err);
      // Fallback sign in
      setUser({ uid: 'guest_teacher_user', isAnonymous: true, displayName: 'Guru' } as any);
      setRole('guru');
      localStorage.setItem('user_role', 'guru');
      localStorage.setItem('user_logged_in', 'true');
      setNeedsAuth(false);
      await loadAllDatabaseData();
      addToast('Berhasil masuk sebagai Guru', 'success');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminSignIn = async (password: string): Promise<boolean> => {
    if (password !== 'budiardika25') {
      return false;
    }

    setIsLoggingIn(true);
    try {
      const res = await anonymousSignIn();
      if (res?.user) {
        setUser(res.user);
      } else {
        setUser({ uid: 'guest_admin_user', isAnonymous: true, displayName: 'Admin' } as any);
      }
      setRole('admin');
      localStorage.setItem('user_role', 'admin');
      localStorage.setItem('user_logged_in', 'true');
      setNeedsAuth(false);
      await loadAllDatabaseData();
      addToast('Berhasil masuk sebagai Admin', 'success');
      return true;
    } catch (err: any) {
      console.error(err);
      setUser({ uid: 'guest_admin_user', isAnonymous: true, displayName: 'Admin' } as any);
      setRole('admin');
      localStorage.setItem('user_role', 'admin');
      localStorage.setItem('user_logged_in', 'true');
      setNeedsAuth(false);
      await loadAllDatabaseData();
      addToast('Berhasil masuk sebagai Admin', 'success');
      return true;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('user_logged_in');
    localStorage.removeItem('user_role');
    await logout();
    setUser(null);
    setNeedsAuth(true);
  };

  const handleSwitchRole = (targetRole: 'admin' | 'guru') => {
    if (targetRole === role) return;

    if (targetRole === 'guru') {
      setRole('guru');
      localStorage.setItem('user_role', 'guru');
      addToast('Hak akses diubah ke Guru', 'info');
    } else {
      // Require Admin Password
      setAdminPasswordInput('');
      setAdminPasswordModalError('');
      setIsAdminAuthModalOpen(true);
    }
  };

  const handleConfirmAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPasswordModalError('');
    if (!adminPasswordInput) {
      setAdminPasswordModalError('Silakan masukkan password Admin.');
      return;
    }

    if (adminPasswordInput === 'budiardika25') {
      setRole('admin');
      localStorage.setItem('user_role', 'admin');
      setIsAdminAuthModalOpen(false);
      setAdminPasswordInput('');
      addToast('Hak akses berhasil diubah ke Admin!', 'success');
    } else {
      setAdminPasswordModalError('Password Admin salah! Silakan coba lagi.');
    }
  };

  if (needsAuth) {
    return (
      <LoginPage
        onGuruSignIn={handleGuruSignIn}
        onAdminSignIn={handleAdminSignIn}
        isLoggingIn={isLoggingIn}
        isSyncingData={isLoadingData}
        errorMsg={errorMsg}
        appLogoUrl={appLogoUrl}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-x-clip w-full max-w-full">
      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`p-4 rounded-2xl shadow-xl border text-xs font-bold pointer-events-auto flex items-center justify-between gap-3 ${
                toast.type === 'success'
                  ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                  : toast.type === 'error'
                  ? 'bg-rose-900 text-rose-100 border-rose-700'
                  : 'bg-slate-900 text-slate-100 border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'success' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => setToasts(t => t.filter(x => x.id !== toast.id))}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Frozen Sticky Header & Navigation Container */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md print:hidden w-full shadow-md border-b border-slate-200/80">
        {/* Main App Navbar */}
        <header className="bg-transparent w-full">
          <div className="w-full px-2.5 sm:px-3 md:px-4 lg:px-6 xl:px-8">
            <div className="flex items-center justify-between h-16 gap-2">
              
              {/* Left Brand */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {appLogoUrl && !logoHeaderError ? (
                  <img
                    src={convertGoogleDriveUrl(appLogoUrl)}
                    alt="Logo Portal"
                    className="h-8 sm:h-9 md:h-10 lg:h-12 w-auto object-contain shrink-0"
                    onError={() => setLogoHeaderError(true)}
                  />
                ) : (
                  <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-11 lg:w-11 bg-linear-to-tr from-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
                    <Database className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5 sm:gap-2">
                    <span className="truncate">S I M P A N</span>
                    <span className="hidden xl:inline-block text-[10px] lg:text-xs font-extrabold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                      Sistem Manajemen Presensi &amp; Nilai
                    </span>
                  </h1>
                  <p className="text-[10px] sm:text-[11px] lg:text-xs font-bold text-indigo-600 truncate">
                    Sistem Manajemen Presensi &amp; Nilai ({role === 'admin' ? 'Mode Admin' : 'Mode Guru'})
                  </p>
                </div>
              </div>

              {/* Right Class Selector & User Role Controls */}
              <div className="hidden md:flex items-center gap-1 sm:gap-1.5 lg:gap-2.5 shrink-0">
                {/* Spin Siswa Button */}
                <button
                  onClick={() => setIsSpinModalOpen(true)}
                  className="px-2.5 py-1.5 lg:px-3.5 lg:py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs lg:text-sm font-black border border-amber-200/80 shadow-2xs group shrink-0"
                  title={`Acak / Spin Siswa ${activeClassName} untuk Maju Menjawab`}
                >
                  <Dices className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-amber-600 group-hover:rotate-180 transition-transform duration-500" />
                  <span className="hidden xl:inline">Spin Siswa</span>
                  <span className="xl:hidden">Spin</span>
                </button>

                {/* Sync / Refresh Button */}
                <button
                  onClick={handleManualRefresh}
                  disabled={isLoadingData}
                  className="px-2.5 py-1.5 lg:px-3.5 lg:py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs lg:text-sm font-black border border-indigo-150 disabled:opacity-50 shrink-0"
                  title="Sinkronkan Data Firebase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 lg:w-4 lg:h-4 text-indigo-600 ${isLoadingData ? 'animate-spin' : ''}`} />
                  <span className="hidden xl:inline">Sinkronkan</span>
                  <span className="xl:hidden">Sync</span>
                </button>

                {role === 'admin' && (
                  <button
                    onClick={() => {
                      setDeepCleanResult(null);
                      setIsDeepCleanModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 lg:px-3.5 lg:py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs lg:text-sm font-black transition cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
                    title="Deep Clean Database: Hapus data yatim / dummy tidak terhubung kelas"
                  >
                    <Sparkles className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-rose-600 animate-pulse" />
                    <span className="hidden lg:inline">Deep Clean DB</span>
                  </button>
                )}

                {/* Class Switcher Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 lg:p-1.5 rounded-xl border border-slate-200 shrink-0">
                  <Layers className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5 text-indigo-600 ml-1 shrink-0" />
                  <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(Number(e.target.value))}
                    className="bg-transparent text-xs lg:text-sm font-black text-slate-800 focus:outline-none cursor-pointer pr-1"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role Toggle */}
                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-0.5 lg:gap-1 border border-slate-200 text-xs lg:text-sm font-bold shrink-0">
                  <button
                    onClick={() => handleSwitchRole('admin')}
                    className={`px-2.5 lg:px-3 py-1 rounded-lg transition cursor-pointer ${
                      role === 'admin' ? 'bg-white text-indigo-700 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => handleSwitchRole('guru')}
                    className={`px-2.5 lg:px-3 py-1 rounded-lg transition cursor-pointer ${
                      role === 'guru' ? 'bg-white text-indigo-700 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Guru
                  </button>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-1.5 lg:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer shrink-0"
                  title="Keluar Sistem"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Hamburger Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-slate-200 p-4 bg-slate-50 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pilih Kelas</label>
                <select
                  value={selectedClassId}
                  onChange={e => {
                    setSelectedClassId(Number(e.target.value));
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-white p-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-800"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs font-bold text-slate-600">Peran Pengguna:</span>
                <div className="bg-slate-200 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
                  <button
                    onClick={() => {
                      handleSwitchRole('admin');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-1 rounded-lg ${role === 'admin' ? 'bg-white text-indigo-700' : 'text-slate-600'}`}
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => {
                      handleSwitchRole('guru');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-1 rounded-lg ${role === 'guru' ? 'bg-white text-indigo-700' : 'text-slate-600'}`}
                  >
                    Guru
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsSpinModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 bg-amber-50 text-amber-800 font-extrabold text-xs rounded-xl border border-amber-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Dices className="w-4 h-4 text-amber-600" />
                <span>Spin Siswa Maju ({activeClassName})</span>
              </button>

              <button
                onClick={() => {
                  handleManualRefresh();
                  setIsMobileMenuOpen(false);
                }}
                disabled={isLoadingData}
                className="w-full py-2.5 bg-indigo-50 text-indigo-700 font-extrabold text-xs rounded-xl border border-indigo-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-indigo-600 ${isLoadingData ? 'animate-spin' : ''}`} />
                <span>Sinkronkan Data Firebase</span>
              </button>

              {role === 'admin' && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setDeepCleanResult(null);
                    setIsDeepCleanModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-rose-50 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-rose-600 animate-pulse" />
                  <span>Deep Clean Database</span>
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full py-2.5 bg-rose-50 text-rose-600 font-extrabold text-xs rounded-xl border border-rose-200 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Keluar Sistem
              </button>
            </div>
          )}
        </header>

        {/* Main App Navigation Tabs Bar */}
        <div className="bg-white border-b border-slate-200 w-full">
          <div className="w-full px-2.5 sm:px-3 md:px-4 lg:px-6 xl:px-8">
            <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-2 scrollbar-none">
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-2.5 sm:px-3 md:px-3.5 lg:px-4 py-2 sm:py-2.5 rounded-xl text-xs lg:text-sm font-black transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'attendance'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4.5 lg:h-4.5" />
                Absensi Harian
              </button>

              <button
                onClick={() => setActiveTab('journal')}
                className={`px-2.5 sm:px-3 md:px-3.5 lg:px-4 py-2 sm:py-2.5 rounded-xl text-xs lg:text-sm font-black transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'journal'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4.5 lg:h-4.5" />
                Jurnal Harian
              </button>

              <button
                onClick={() => setActiveTab('grades')}
                className={`px-2.5 sm:px-3 md:px-3.5 lg:px-4 py-2 sm:py-2.5 rounded-xl text-xs lg:text-sm font-black transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'grades'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4.5 lg:h-4.5" />
                Nilai Akademik
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className={`px-2.5 sm:px-3 md:px-3.5 lg:px-4 py-2 sm:py-2.5 rounded-xl text-xs lg:text-sm font-black transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'notes'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4.5 lg:h-4.5" />
                Catatan Siswa
              </button>

              <button
                onClick={() => setActiveTab('recap')}
                className={`px-2.5 sm:px-3 md:px-3.5 lg:px-4 py-2 sm:py-2.5 rounded-xl text-xs lg:text-sm font-black transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'recap'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4.5 lg:h-4.5" />
                Rekapitulasi
              </button>

              <button
                onClick={() => setActiveTab('students')}
                className={`px-2.5 sm:px-3 md:px-3.5 lg:px-4 py-2 sm:py-2.5 rounded-xl text-xs lg:text-sm font-black transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'students'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4.5 lg:h-4.5" />
                Kelola Siswa
              </button>

              <button
                onClick={() => setActiveTab('extra_tik')}
                className={`px-2.5 sm:px-3 md:px-3.5 lg:px-4 py-2 sm:py-2.5 rounded-xl text-xs lg:text-sm font-black transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'extra_tik'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4.5 lg:h-4.5" />
                Extra TIK
              </button>

              <button
                onClick={() => setActiveTab('professional_report')}
                className={`px-2.5 sm:px-3 md:px-3.5 lg:px-4 py-2 sm:py-2.5 rounded-xl text-xs lg:text-sm font-black transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'professional_report'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4.5 lg:h-4.5" />
                Cetak Laporan
              </button>

              {role === 'admin' && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-2.5 sm:px-3 md:px-3.5 lg:px-4 py-2 sm:py-2.5 rounded-xl text-xs lg:text-sm font-black transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4.5 lg:h-4.5" />
                  Pengaturan
                </button>
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content View */}
      <main className="flex-1 w-full max-w-full px-2.5 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 md:py-6">
        {isLoadingData ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
              Memuat data dari Firebase Firestore...
            </p>
          </div>
        ) : (
          <div className="w-full max-w-full">
            {/* Active Class Info Header */}
            <div className="mb-4 sm:mb-6 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-black text-xs">
                  {activeClassName}
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Siswa Terdaftar: <span className="text-indigo-600">{classStudents.length} murid</span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Database Firebase terhubung &amp; tersinkronisasi otomatis.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 px-3 py-1.5 rounded-xl">
                <ShieldCheck className="w-3.5 h-3.5" />
                Firebase Cloud Database Safe
              </div>
            </div>

            {/* TAB CONTENT */}
            <ErrorBoundary key={activeTab} fallbackTitle="Gagal Memuat Halaman Modul">
              <React.Suspense
                fallback={
                  <div className="min-h-[350px] flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl p-8 border border-slate-200">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-xs font-bold text-slate-500">Memuat modul aplikasi...</p>
                  </div>
                }
              >
                {activeTab === 'attendance' && (
                  <AttendanceTab
                    students={classStudents}
                    attendance={classAttendance}
                    dateNotes={classDateNotes}
                    onSave={handleSaveAttendance}
                    onDelete={handleDeleteAttendance}
                    onSaveDateNote={handleSaveDateNote}
                    onDeleteDateNote={handleDeleteDateNote}
                  />
                )}

                {activeTab === 'journal' && (
                  <JurnalHarianTab
                    journals={classJournals}
                    students={classStudents}
                    attendance={classAttendance}
                    studentNotes={classNotes}
                    activeClassName={activeClassName}
                    onSaveJournal={handleSaveJournal}
                    onDeleteJournal={handleDeleteJournal}
                  />
                )}

                {activeTab === 'grades' && (
                  <GradesTab
                    students={classStudents}
                    formativeGrades={classFormative}
                    summativeGrades={classSummative}
                    formativeCols={formativeCols}
                    setFormativeCols={setFormativeCols}
                    summativeCols={summativeCols}
                    setSummativeCols={setSummativeCols}
                    onSave={handleSaveGrades}
                  />
                )}

                {activeTab === 'notes' && (
                  <StudentNotesTab
                    students={classStudents}
                    notes={classNotes}
                    onSaveNote={handleSaveNote}
                    onDeleteNote={handleDeleteNote}
                  />
                )}

                {activeTab === 'recap' && (
                  <RecapTab
                    students={classStudents}
                    formativeGrades={classFormative}
                    summativeGrades={classSummative}
                    recap={classRecap}
                    formativeCols={formativeCols}
                    summativeCols={summativeCols}
                    notes={classNotes}
                  />
                )}

                {activeTab === 'students' && (
                  <StudentsTab
                    students={classStudents}
                    allStudents={allStudents}
                    onSyncRoster={handleSyncRoster}
                    role={role}
                    classes={classes}
                    selectedClassId={selectedClassId}
                    onSelectClassId={setSelectedClassId}
                    onSyncClasses={handleSyncClasses}
                    onDeepClean={() => {
                      setDeepCleanResult(null);
                      setIsDeepCleanModalOpen(true);
                    }}
                  />
                )}

                {activeTab === 'extra_tik' && (
                  <ExtraTIKTab
                    students={allStudents}
                    extraTikPeserta={extraTikPeserta}
                    extraTikAbsensi={extraTikAbsensi}
                    extraTikNilai={extraTikNilai}
                    onSyncPeserta={handleSyncExtraTikPeserta}
                    onSyncAbsensi={handleSyncExtraTikAbsensi}
                    onSyncNilai={handleSyncExtraTikNilai}
                    onBackToDashboard={() => setActiveTab('attendance')}
                    classes={classes}
                  />
                )}

                {activeTab === 'professional_report' && (
                  <ProfessionalReportTab
                    students={classStudents}
                    attendance={classAttendance}
                    formativeGrades={classFormative}
                    summativeGrades={classSummative}
                    recap={classRecap}
                    notes={classNotes}
                    journals={classJournals}
                    formativeCols={formativeCols}
                    summativeCols={summativeCols}
                    activeClassName={activeClassName}
                    extraTikPeserta={extraTikPeserta}
                    extraTikAbsensi={extraTikAbsensi}
                    extraTikNilai={extraTikNilai}
                  />
                )}

                {activeTab === 'settings' && (
                  <SettingsTab
                    classes={classes}
                    role={role}
                    onRefreshData={loadAllDatabaseData}
                    addToast={addToast}
                    appLogoUrl={appLogoUrl}
                    onUpdateAppLogoUrl={handleUpdateAppLogoUrl}
                    allAppData={{
                      classes,
                      students: allStudents,
                      attendance: allAttendance,
                      formativeGrades: allFormative,
                      summativeGrades: allSummative,
                      formativeCols,
                      summativeCols,
                      studentNotes: allNotes,
                      journals: allJournals,
                      extraTikPeserta,
                      extraTikAbsensi,
                      extraTikNilai,
                    }}
                  />
                )}
              </React.Suspense>
            </ErrorBoundary>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 font-bold print:hidden">
        Aplikasi Pencatat Absensi &amp; Nilai Siswa — Sepenuhnya Berbasis Firebase Firestore
      </footer>

      {/* Admin Password Verification Modal */}
      {isAdminAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-5 relative">
            <button
              type="button"
              onClick={() => setIsAdminAuthModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Verifikasi Akses Admin</h3>
                <p className="text-xs font-medium text-slate-500">Masukkan password Admin untuk mengubah hak akses.</p>
              </div>
            </div>

            <form onSubmit={handleConfirmAdminPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Password Admin
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoFocus
                    value={adminPasswordInput}
                    onChange={e => {
                      setAdminPasswordInput(e.target.value);
                      setAdminPasswordModalError('');
                    }}
                    placeholder="Masukkan password Admin..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  />
                </div>
                {adminPasswordModalError && (
                  <p className="mt-2 text-xs font-bold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{adminPasswordModalError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdminAuthModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md shadow-indigo-100 transition cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verifikasi &amp; Masuk Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deep Clean Database Modal */}
      {isDeepCleanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 print:hidden animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl p-6 overflow-hidden relative">
            <button
              type="button"
              onClick={() => {
                setIsDeepCleanModalOpen(false);
                setDeepCleanResult(null);
              }}
              disabled={isDeepCleaning}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full transition cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Deep Clean Database Firebase</h3>
                <p className="text-xs font-bold text-slate-400">Pembersihan Otomatis Data Yatim &amp; Dummy</p>
              </div>
            </div>

            {!deepCleanResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-rose-50/80 border border-rose-150 rounded-2xl text-xs text-rose-900 leading-relaxed space-y-2">
                  <p className="font-extrabold flex items-center gap-1.5 text-rose-900 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    Pemberitahuan Sistem Admin:
                  </p>
                  <p>
                    Fitur ini akan memindai seluruh koleksi Firestore (<code>students</code>, <code>attendance</code>, <code>grades_formative</code>, <code>grades_summative</code>, <code>student_notes</code>, <code>journals</code>, dan <code>extra_tik</code>) serta menghapus secara permanen data yatim/dummy yang <strong>tidak terdaftar dalam {classes.length} kelas aktif</strong> saat ini.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    {classes.length} Kelas Aktif yang Dipertahankan:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {classes.map(c => (
                      <span key={c.id} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 font-extrabold text-[11px] rounded-xl shadow-2xs">
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-500 font-medium">
                  💡 Seluruh siswa dan rekaman transaksi di luar daftar kelas di atas akan dibersihkan guna menghemat kuota Firestore dan mempercepat performa loading.
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isDeepCleaning}
                    onClick={() => setIsDeepCleanModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isDeepCleaning}
                    onClick={handleRunDeepClean}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md shadow-rose-100 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isDeepCleaning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Memproses Pembersihan Firebase...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Jalankan Deep Clean Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* RESULT STATS REPORT */
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Deep Clean berhasil dilakukan! Firestore database kini bersih &amp; optimal.</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-100">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500">Total Dokumen Dihapus</p>
                    <p className="text-2xl font-black text-rose-700">{deepCleanResult.totalDeletedDocs} <span className="text-xs font-bold text-rose-400">item</span></p>
                  </div>
                  <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Siswa Aktif Terjaga</p>
                    <p className="text-2xl font-black text-emerald-700">{deepCleanResult.activeStudentsCount} <span className="text-xs font-bold text-emerald-500">murid</span></p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                  <p className="font-extrabold text-slate-800 border-b border-slate-200 pb-1.5 flex justify-between">
                    <span>Rincian Item yang Dibersihkan:</span>
                    <span className="text-indigo-600 font-black">{deepCleanResult.activeClassesCount} Kelas Aktif</span>
                  </p>
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[11px] text-slate-600 font-semibold">
                    <div>• Siswa Yatim: <strong className="text-slate-900 font-bold">{deepCleanResult.deletedStudentsCount}</strong></div>
                    <div>• Presensi Yatim: <strong className="text-slate-900 font-bold">{deepCleanResult.deletedAttendanceCount}</strong></div>
                    <div>• Nilai Formatif: <strong className="text-slate-900 font-bold">{deepCleanResult.deletedFormativeGradesCount}</strong></div>
                    <div>• Nilai Sumatif: <strong className="text-slate-900 font-bold">{deepCleanResult.deletedSummativeGradesCount}</strong></div>
                    <div>• Catatan Siswa: <strong className="text-slate-900 font-bold">{deepCleanResult.deletedNotesCount}</strong></div>
                    <div>• Jurnal Harian: <strong className="text-slate-900 font-bold">{deepCleanResult.deletedJournalsCount}</strong></div>
                    <div>• Extra TIK Peserta: <strong className="text-slate-900 font-bold">{deepCleanResult.deletedExtraTikPesertaCount}</strong></div>
                    <div>• Extra TIK Presensi: <strong className="text-slate-900 font-bold">{deepCleanResult.deletedExtraTikAbsensiCount}</strong></div>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeepCleanModalOpen(false);
                      setDeepCleanResult(null);
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer"
                  >
                    Tutup &amp; Selesai
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spin Siswa Wheel Modal */}
      <StudentSpinnerModal
        isOpen={isSpinModalOpen}
        onClose={() => setIsSpinModalOpen(false)}
        students={classStudents}
        classNameText={activeClassName}
      />
    </div>
  );
}
