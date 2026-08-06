import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  query, 
  where,
  DocumentReference
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Student, 
  AttendanceRecord, 
  GradeFormative, 
  GradeSummative, 
  GradeColumn, 
  StudentNote, 
  ExtraTikPeserta, 
  ExtraTikAbsensi, 
  ExtraTikNilai, 
  JurnalHarianRecord,
  AttendanceDateNote,
  ReportConfig
} from '../types';

// ==================== HELPER ====================
/**
 * Recursively removes `undefined` values from an object or array so Firestore batch/setDoc won't throw error.
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanFirestoreData(item)) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined && val !== null && val !== '') {
      result[key] = typeof val === 'object' ? cleanFirestoreData(val) : val;
    }
  }
  return result as T;
}

export function cleanStudentRecord(s: Student): Record<string, any> {
  const clean: Record<string, any> = {
    nis: String(s.nis).trim(),
    nama: String(s.nama).trim(),
  };
  if (s.noAbsen && String(s.noAbsen).trim() !== '') clean.noAbsen = String(s.noAbsen).trim();
  if (s.jenisKelamin) clean.jenisKelamin = s.jenisKelamin;
  if (s.kelas && s.kelas.trim() !== '') clean.kelas = s.kelas.trim();
  if (s.foto && s.foto.trim() !== '') clean.foto = s.foto.trim();
  if (s.label && s.label.trim() !== '') clean.label = s.label.trim();
  return clean;
}

export function cleanGradeRecord(g: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {
    nis: String(g.nis).trim(),
    nama: g.nama ? String(g.nama).trim() : '',
  };
  if (g.jenisKelamin) clean.jenisKelamin = g.jenisKelamin;
  if (g.kelas && String(g.kelas).trim() !== '') clean.kelas = String(g.kelas).trim();
  if (g.rataRata !== null && g.rataRata !== undefined && !isNaN(Number(g.rataRata))) {
    clean.rataRata = Number(g.rataRata);
  }

  for (const [key, val] of Object.entries(g)) {
    if (['nis', 'nama', 'jenisKelamin', 'kelas', 'rataRata'].includes(key)) continue;
    if (val !== null && val !== undefined && val !== '') {
      const num = Number(val);
      clean[key] = isNaN(num) ? val : num;
    }
  }
  return clean;
}

const DEFAULT_CLASSES = Array.from({ length: 11 }, (_, i) => ({
  id: i + 1,
  name: `Kelas 8.${i + 1}`
}));

const DEFAULT_SAMPLE_STUDENTS: Student[] = [
  { noAbsen: '1', nis: '12001', nama: 'Andi Pratama', jenisKelamin: 'L', kelas: 'Kelas 8.1' },
  { noAbsen: '2', nis: '12002', nama: 'Budi Santoso', jenisKelamin: 'L', kelas: 'Kelas 8.1' },
  { noAbsen: '3', nis: '12003', nama: 'Citra Lestari', jenisKelamin: 'P', kelas: 'Kelas 8.1' },
  { noAbsen: '4', nis: '12004', nama: 'Dewi Sartika', jenisKelamin: 'P', kelas: 'Kelas 8.1' },
  { noAbsen: '5', nis: '12005', nama: 'Eko Prasetyo', jenisKelamin: 'L', kelas: 'Kelas 8.1' },
  { noAbsen: '6', nis: '12006', nama: 'Farhan Wijaya', jenisKelamin: 'L', kelas: 'Kelas 8.1' },
];

const DEFAULT_FORMATIVE_COLS: GradeColumn[] = [
  { key: 'f1', label: 'Formatif 1 (F1)' },
  { key: 'f2', label: 'Formatif 2 (F2)' },
  { key: 'f3', label: 'Formatif 3 (F3)' },
  { key: 'f4', label: 'Formatif 4 (F4)' },
];

const DEFAULT_SUMMATIVE_COLS: GradeColumn[] = [
  { key: 's1', label: 'Sumatif 1 (S1)' },
  { key: 's2', label: 'Sumatif 2 (S2)' },
  { key: 's3', label: 'Sumatif 3 (S3)' },
  { key: 'uts', label: 'UTS' },
  { key: 'uas', label: 'UAS' },
];

/**
 * Initialize / Seed default database if empty
 */
export async function initializeDatabaseIfEmpty() {
  try {
    const systemStateDoc = await getDoc(doc(db, 'config', 'systemState'));
    if (systemStateDoc.exists() && systemStateDoc.data()?.initialized) {
      return;
    }

    const [classesSnap, studentsSnap, formativeColsDoc, summativeColsDoc] = await Promise.all([
      getDocs(collection(db, 'classes')),
      getDocs(collection(db, 'students')),
      getDoc(doc(db, 'config', 'formativeCols')),
      getDoc(doc(db, 'config', 'summativeCols'))
    ]);

    const batch = writeBatch(db);
    let hasWrites = false;

    if (classesSnap.empty) {
      DEFAULT_CLASSES.forEach(c => {
        batch.set(doc(db, 'classes', c.id.toString()), cleanFirestoreData(c));
      });
      hasWrites = true;
    }

    if (studentsSnap.empty) {
      DEFAULT_SAMPLE_STUDENTS.forEach(s => {
        batch.set(doc(db, 'students', s.nis), cleanFirestoreData(s));
      });
      hasWrites = true;
    }

    if (!formativeColsDoc.exists()) {
      batch.set(doc(db, 'config', 'formativeCols'), cleanFirestoreData({ cols: DEFAULT_FORMATIVE_COLS }));
      hasWrites = true;
    }

    if (!summativeColsDoc.exists()) {
      batch.set(doc(db, 'config', 'summativeCols'), cleanFirestoreData({ cols: DEFAULT_SUMMATIVE_COLS }));
      hasWrites = true;
    }

    batch.set(doc(db, 'config', 'systemState'), cleanFirestoreData({ initialized: true, timestamp: new Date().toISOString() }));
    hasWrites = true;

    if (hasWrites) {
      await batch.commit();
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// ==================== CLASSES ====================
export async function getClassesFromFirestore(): Promise<{ id: number; name: string }[]> {
  try {
    const snap = await getDocs(collection(db, 'classes'));
    if (snap.empty) {
      return DEFAULT_CLASSES;
    }
    const list: { id: number; name: string }[] = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({ id: data.id || Number(d.id), name: data.name });
    });
    return list.sort((a, b) => a.id - b.id);
  } catch (err) {
    console.error('Error loading classes:', err);
    return DEFAULT_CLASSES;
  }
}

export async function saveClassesToFirestore(classes: { id: number; name: string }[]): Promise<void> {
  const snap = await getDocs(collection(db, 'classes'));
  const batch = writeBatch(db);
  const currentClassIds = new Set(classes.map(c => c.id.toString()));
  const currentClassNames = new Set(classes.map(c => c.name));

  // Delete removed class documents
  snap.forEach(d => {
    if (!currentClassIds.has(d.id)) {
      batch.delete(d.ref);
    }
  });

  // Save current classes
  classes.forEach(c => {
    batch.set(doc(db, 'classes', c.id.toString()), cleanFirestoreData(c));
  });

  // Also remove students belonging to deleted classes from Firestore
  const studentsSnap = await getDocs(collection(db, 'students'));
  studentsSnap.forEach(d => {
    const student = d.data() as Student;
    if (student.kelas && !currentClassNames.has(student.kelas)) {
      const classNum = student.kelas.replace(/^Kelas\s+/i, '').trim();
      const hasMatchingClass = classes.some(c => c.name.replace(/^Kelas\s+/i, '').trim() === classNum);
      if (!hasMatchingClass) {
        batch.delete(d.ref);
      }
    }
  });

  await batch.commit();
}

// ==================== STUDENTS ====================
export async function getStudentsFromFirestore(): Promise<Student[]> {
  try {
    const snap = await getDocs(collection(db, 'students'));
    if (snap.empty) {
      return [];
    }
    const list: Student[] = [];
    snap.forEach(d => {
      list.push(d.data() as Student);
    });
    return list.sort((a, b) => {
      const noA = parseInt(a.noAbsen || '999', 10);
      const noB = parseInt(b.noAbsen || '999', 10);
      if (noA !== noB) return noA - noB;
      return a.nama.localeCompare(b.nama);
    });
  } catch (err) {
    console.error('Error loading students:', err);
    return [];
  }
}

export async function saveStudentsToFirestore(students: Student[]): Promise<void> {
  const batch = writeBatch(db);
  students.forEach(s => {
    batch.set(doc(db, 'students', s.nis), cleanStudentRecord(s));
  });
  await batch.commit();
}

export async function saveStudentsToFirestoreForClass(className: string, classStudents: Student[], targetNis?: string): Promise<void> {
  const classNum = className.replace(/^Kelas\s+/i, '').trim();
  const newNisSet = new Set(classStudents.map(s => s.nis));
  const targetNisList = targetNis ? targetNis.split(',').map(n => n.trim()).filter(Boolean) : [];
  const targetNisSet = new Set(targetNisList);

  const snap = await getDocs(collection(db, 'students'));
  const batch = writeBatch(db);

  // 1. Delete students in Firestore that belong to className but are no longer in classStudents, or match targetNisSet
  snap.forEach(d => {
    const student = d.data() as Student;
    const sClass = student.kelas || 'Kelas 8.1';
    const sClassNum = sClass.replace(/^Kelas\s+/i, '').trim();

    if (targetNisSet.has(student.nis) || targetNisSet.has(d.id)) {
      batch.delete(d.ref);
      return;
    }

    if (sClass === className || sClassNum === classNum) {
      if (!newNisSet.has(student.nis)) {
        batch.delete(d.ref);
      }
    }
  });

  // 2. Explicitly delete targetNis items if provided and not in newNisSet
  targetNisList.forEach(nis => {
    if (!newNisSet.has(nis)) {
      batch.delete(doc(db, 'students', nis));
    }
  });

  // 3. Save/Update current class students
  classStudents.forEach(s => {
    batch.set(doc(db, 'students', s.nis), cleanStudentRecord(s));
  });

  await batch.commit();
}

export async function deleteStudentFromFirestore(nis: string): Promise<void> {
  await deleteDoc(doc(db, 'students', nis));
}

// ==================== ATTENDANCE ====================
function cleanAttendanceRecord(r: AttendanceRecord): Record<string, any> {
  const clean: Record<string, any> = {
    tanggal: r.tanggal,
    nis: r.nis,
    nama: r.nama ? r.nama.trim() : '',
    status: r.status || 'Hadir',
    terlambat: Number(r.terlambat) || 0
  };
  if (r.kelas) clean.kelas = r.kelas.trim();
  if (r.jenisKelamin) clean.jenisKelamin = r.jenisKelamin;
  if (r.keterangan && r.keterangan.trim() !== '') {
    clean.keterangan = r.keterangan.trim();
  }
  return clean;
}

export async function getAttendanceFromFirestore(): Promise<AttendanceRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'attendance'));
    const list: AttendanceRecord[] = [];
    snap.forEach(d => {
      const data = d.data() as any;
      list.push({
        tanggal: data.tanggal || '',
        nis: data.nis || '',
        nama: data.nama || '',
        jenisKelamin: data.jenisKelamin,
        kelas: data.kelas || '',
        status: data.status || 'Hadir',
        terlambat: data.terlambat || 0,
        keterangan: data.keterangan || ''
      });
    });
    return list;
  } catch (err) {
    console.error('Error loading attendance:', err);
    return [];
  }
}

export async function saveAttendanceToFirestore(records: AttendanceRecord[]): Promise<void> {
  if (records.length === 0) return;
  const batch = writeBatch(db);
  records.forEach(r => {
    const docId = `${r.tanggal}_${r.nis}`;
    batch.set(doc(db, 'attendance', docId), cleanAttendanceRecord(r));
  });
  await batch.commit();
}

export async function deleteAttendanceByDateFromFirestore(date: string, kelas?: string): Promise<void> {
  const snap = await getDocs(collection(db, 'attendance'));
  const batch = writeBatch(db);
  let count = 0;
  snap.forEach(d => {
    const data = d.data() as AttendanceRecord;
    if (data.tanggal === date && (!kelas || data.kelas === kelas)) {
      batch.delete(d.ref);
      count++;
    }
  });
  if (count > 0) {
    await batch.commit();
  }
}

// ==================== GRADES (FORMATIVE & SUMMATIVE) ====================
export async function getFormativeGradesFromFirestore(): Promise<{ grades: GradeFormative[]; cols: GradeColumn[] }> {
  try {
    const [colsDoc, snap] = await Promise.all([
      getDoc(doc(db, 'config', 'formativeCols')),
      getDocs(collection(db, 'grades_formative'))
    ]);
    const cols: GradeColumn[] = colsDoc.exists() ? colsDoc.data().cols : DEFAULT_FORMATIVE_COLS;

    const grades: GradeFormative[] = [];
    snap.forEach(d => {
      grades.push(d.data() as GradeFormative);
    });
    return { grades, cols };
  } catch (err) {
    console.error('Error loading formative grades:', err);
    return { grades: [], cols: DEFAULT_FORMATIVE_COLS };
  }
}

export async function saveFormativeGradesToFirestore(grades: GradeFormative[], cols?: GradeColumn[]): Promise<void> {
  if (cols) {
    await setDoc(doc(db, 'config', 'formativeCols'), cleanFirestoreData({ cols }));
  }
  if (grades.length > 0) {
    const batch = writeBatch(db);
    grades.forEach(g => {
      batch.set(doc(db, 'grades_formative', g.nis), cleanGradeRecord(g));
    });
    await batch.commit();
  }
}

export async function getSummativeGradesFromFirestore(): Promise<{ grades: GradeSummative[]; cols: GradeColumn[] }> {
  try {
    const [colsDoc, snap] = await Promise.all([
      getDoc(doc(db, 'config', 'summativeCols')),
      getDocs(collection(db, 'grades_summative'))
    ]);
    const cols: GradeColumn[] = colsDoc.exists() ? colsDoc.data().cols : DEFAULT_SUMMATIVE_COLS;

    const grades: GradeSummative[] = [];
    snap.forEach(d => {
      grades.push(d.data() as GradeSummative);
    });
    return { grades, cols };
  } catch (err) {
    console.error('Error loading summative grades:', err);
    return { grades: [], cols: DEFAULT_SUMMATIVE_COLS };
  }
}

export async function saveSummativeGradesToFirestore(grades: GradeSummative[], cols?: GradeColumn[]): Promise<void> {
  if (cols) {
    await setDoc(doc(db, 'config', 'summativeCols'), cleanFirestoreData({ cols }));
  }
  if (grades.length > 0) {
    const batch = writeBatch(db);
    grades.forEach(g => {
      batch.set(doc(db, 'grades_summative', g.nis), cleanGradeRecord(g));
    });
    await batch.commit();
  }
}

// ==================== STUDENT NOTES ====================
function cleanStudentNote(note: StudentNote): Record<string, any> {
  const clean: Record<string, any> = {
    id: note.id,
    tanggal: note.tanggal,
    nis: note.nis,
    nama: note.nama ? note.nama.trim() : '',
    kelas: note.kelas ? note.kelas.trim() : '',
    tipe: note.tipe || 'aktif',
    catatan: note.catatan ? note.catatan.trim() : ''
  };
  if (note.jamPembelajaran && note.jamPembelajaran.trim() !== '') {
    clean.jamPembelajaran = note.jamPembelajaran.trim();
  }
  return clean;
}

export async function getStudentNotesFromFirestore(): Promise<StudentNote[]> {
  try {
    const snap = await getDocs(collection(db, 'student_notes'));
    const list: StudentNote[] = [];
    snap.forEach(d => {
      const data = d.data() as any;
      list.push({
        id: data.id || d.id,
        tanggal: data.tanggal || '',
        nis: data.nis || '',
        nama: data.nama || '',
        kelas: data.kelas || '',
        jamPembelajaran: data.jamPembelajaran || '',
        tipe: data.tipe || 'aktif',
        catatan: data.catatan || ''
      });
    });
    return list.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  } catch (err) {
    console.error('Error loading student notes:', err);
    return [];
  }
}

export async function saveStudentNoteToFirestore(note: StudentNote): Promise<string> {
  const noteId = note.id || `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const updatedNote = { ...note, id: noteId };
  await setDoc(doc(db, 'student_notes', noteId), cleanStudentNote(updatedNote));
  return noteId;
}

export async function deleteStudentNoteFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, 'student_notes', id));
}

// ==================== JURNAL HARIAN ====================
function cleanJournalRecord(journal: JurnalHarianRecord): Record<string, any> {
  const clean: Record<string, any> = {
    id: journal.id,
    tanggal: journal.tanggal,
    kelas: journal.kelas ? journal.kelas.trim() : '',
    jamPelajaran: Array.isArray(journal.jamPelajaran) ? journal.jamPelajaran : [],
    materi: journal.materi ? journal.materi.trim() : '',
    catatan: journal.catatan ? journal.catatan.trim() : ''
  };

  if (journal.hambatan && journal.hambatan.trim() !== '') {
    clean.hambatan = journal.hambatan.trim();
  }
  if (journal.solusi && journal.solusi.trim() !== '') {
    clean.solusi = journal.solusi.trim();
  }
  if (journal.keaktifan !== undefined && journal.keaktifan !== null) {
    clean.keaktifan = Number(journal.keaktifan);
  }
  if (journal.adaTugas) {
    clean.adaTugas = true;
    if (journal.deskripsiTugas && journal.deskripsiTugas.trim() !== '') {
      clean.deskripsiTugas = journal.deskripsiTugas.trim();
    }
  }

  if (Array.isArray(journal.tidakHadirSnapshot) && journal.tidakHadirSnapshot.length > 0) {
    clean.tidakHadirSnapshot = journal.tidakHadirSnapshot.map(item => ({
      nis: item.nis,
      nama: item.nama ? item.nama.trim() : '',
      status: item.status
    }));
  }

  if (Array.isArray(journal.catatanSiswaSnapshot) && journal.catatanSiswaSnapshot.length > 0) {
    clean.catatanSiswaSnapshot = journal.catatanSiswaSnapshot.map(item => ({
      nis: item.nis,
      nama: item.nama ? item.nama.trim() : '',
      tipe: item.tipe || 'aktif',
      catatan: item.catatan ? item.catatan.trim() : '',
      jamPembelajaran: item.jamPembelajaran ? item.jamPembelajaran.trim() : ''
    }));
  }

  return clean;
}

export async function getJournalsFromFirestore(): Promise<JurnalHarianRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'journals'));
    const list: JurnalHarianRecord[] = [];
    snap.forEach(d => {
      const data = d.data() as any;
      list.push({
        id: data.id || d.id,
        tanggal: data.tanggal || '',
        kelas: data.kelas || '',
        jamPelajaran: Array.isArray(data.jamPelajaran) ? data.jamPelajaran : [],
        materi: data.materi || '',
        catatan: data.catatan || '',
        hambatan: data.hambatan || '',
        solusi: data.solusi || '',
        keaktifan: data.keaktifan,
        adaTugas: !!data.adaTugas,
        deskripsiTugas: data.deskripsiTugas || '',
        tidakHadirSnapshot: Array.isArray(data.tidakHadirSnapshot) ? data.tidakHadirSnapshot : [],
        catatanSiswaSnapshot: Array.isArray(data.catatanSiswaSnapshot) ? data.catatanSiswaSnapshot : []
      });
    });
    return list.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  } catch (err) {
    console.error('Error loading journals:', err);
    return [];
  }
}

export async function saveJournalToFirestore(journal: JurnalHarianRecord): Promise<string> {
  const journalId = journal.id || `journal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const updated = { ...journal, id: journalId };
  await setDoc(doc(db, 'journals', journalId), cleanJournalRecord(updated));
  return journalId;
}

export async function deleteJournalFromFirestore(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, 'journals', id));
}

// ==================== EXTRA TIK ====================
export async function getExtraTikDataFromFirestore(): Promise<{
  peserta: ExtraTikPeserta[];
  absensi: ExtraTikAbsensi[];
  nilai: ExtraTikNilai[];
}> {
  try {
    const [pesertaSnap, absensiSnap, nilaiSnap] = await Promise.all([
      getDocs(collection(db, 'extra_tik_peserta')),
      getDocs(collection(db, 'extra_tik_absensi')),
      getDocs(collection(db, 'extra_tik_nilai'))
    ]);

    const peserta: ExtraTikPeserta[] = [];
    pesertaSnap.forEach(d => peserta.push(d.data() as ExtraTikPeserta));

    const absensi: ExtraTikAbsensi[] = [];
    absensiSnap.forEach(d => absensi.push(d.data() as ExtraTikAbsensi));

    const nilai: ExtraTikNilai[] = [];
    nilaiSnap.forEach(d => nilai.push(d.data() as ExtraTikNilai));

    return { peserta, absensi, nilai };
  } catch (err) {
    console.error('Error loading Extra TIK data:', err);
    return { peserta: [], absensi: [], nilai: [] };
  }
}

export async function saveExtraTikPesertaToFirestore(list: ExtraTikPeserta[], deletedNis?: string): Promise<void> {
  const snap = await getDocs(collection(db, 'extra_tik_peserta'));
  const batch = writeBatch(db);
  const currentNisSet = new Set(list.map(p => p.nis?.toString().trim()).filter(Boolean));

  // Delete documents no longer present in list from Firestore
  snap.forEach(d => {
    const docNis = (d.data().nis || d.id)?.toString().trim();
    if (!currentNisSet.has(docNis)) {
      batch.delete(d.ref);
    }
  });

  // Explicitly delete target deletedNis if provided
  if (deletedNis) {
    const cleanDeletedNis = deletedNis.toString().trim();
    batch.delete(doc(db, 'extra_tik_peserta', cleanDeletedNis));
  }

  // Save/Set current list items
  list.forEach(p => {
    if (p.nis) {
      batch.set(doc(db, 'extra_tik_peserta', p.nis.toString().trim()), cleanFirestoreData(p));
    }
  });

  await batch.commit();
}

export async function deleteExtraTikAbsensiByDateFromFirestore(date: string, kelas?: string): Promise<void> {
  const snap = await getDocs(collection(db, 'extra_tik_absensi'));
  const batch = writeBatch(db);
  let count = 0;
  snap.forEach(d => {
    const data = d.data() as ExtraTikAbsensi;
    if (data.tanggal === date && (!kelas || kelas === 'Semua' || data.kelas === kelas)) {
      batch.delete(d.ref);
      count++;
    }
  });
  if (count > 0) {
    await batch.commit();
  }
}

export async function saveExtraTikAbsensiToFirestore(list: ExtraTikAbsensi[]): Promise<void> {
  if (list.length === 0) return;
  const batch = writeBatch(db);
  list.forEach(a => {
    const docId = `${a.tanggal}_${a.nis}`;
    batch.set(doc(db, 'extra_tik_absensi', docId), cleanFirestoreData(a));
  });
  await batch.commit();
}

export async function saveExtraTikNilaiToFirestore(list: ExtraTikNilai[]): Promise<void> {
  const snap = await getDocs(collection(db, 'extra_tik_nilai'));
  const batch = writeBatch(db);
  const currentNisSet = new Set(list.map(n => n.nis?.toString().trim()).filter(Boolean));

  snap.forEach(d => {
    const docNis = (d.data().nis || d.id)?.toString().trim();
    if (!currentNisSet.has(docNis)) {
      batch.delete(d.ref);
    }
  });

  list.forEach(n => {
    if (n.nis) {
      batch.set(doc(db, 'extra_tik_nilai', n.nis.toString().trim()), cleanFirestoreData(n));
    }
  });

  await batch.commit();
}

// ==================== APP LOGO SETTINGS ====================
export async function getAppLogoFromFirestore(): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, 'config', 'appSettings'));
    if (snap.exists() && snap.data().appLogoUrl) {
      return snap.data().appLogoUrl as string;
    }
    return null;
  } catch (err) {
    console.error('Error loading app logo from Firestore:', err);
    return null;
  }
}

export async function saveAppLogoToFirestore(logoUrl: string): Promise<void> {
  await setDoc(doc(db, 'config', 'appSettings'), {
    appLogoUrl: logoUrl,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

// ==================== REPORT CONFIG ====================
export async function getReportConfigFromFirestore(): Promise<ReportConfig | null> {
  try {
    const snap = await getDoc(doc(db, 'config', 'reportConfig'));
    if (snap.exists()) {
      return snap.data() as ReportConfig;
    }
    return null;
  } catch (err) {
    console.error('Error loading report config:', err);
    return null;
  }
}

export async function saveReportConfigToFirestore(config: ReportConfig): Promise<void> {
  const cleanConfig: Record<string, any> = { updatedAt: new Date().toISOString() };
  Object.entries(config).forEach(([key, val]) => {
    if (val !== undefined) {
      cleanConfig[key] = val;
    }
  });
  await setDoc(doc(db, 'config', 'reportConfig'), cleanConfig);
}

// ==================== DEEP CLEAN DATABASE ====================
export interface DeepCleanResult {
  activeClassesCount: number;
  activeStudentsCount: number;
  deletedStudentsCount: number;
  deletedAttendanceCount: number;
  deletedFormativeGradesCount: number;
  deletedSummativeGradesCount: number;
  deletedNotesCount: number;
  deletedJournalsCount: number;
  deletedExtraTikPesertaCount: number;
  deletedExtraTikAbsensiCount: number;
  deletedExtraTikNilaiCount: number;
  optimizedPhotosCount: number;
  totalDeletedDocs: number;
}

export async function deepCleanDatabaseFromFirestore(
  classes: { id: number; name: string }[]
): Promise<DeepCleanResult> {
  const activeClassNamesSet = new Set(classes.map(c => c.name.trim()));
  const activeClassNumsSet = new Set(classes.map(c => c.name.replace(/^Kelas\s+/i, '').trim()));

  const isClassActive = (className?: string): boolean => {
    if (!className || className.trim() === '') return false;
    const trimmed = className.trim();
    if (activeClassNamesSet.has(trimmed)) return true;
    const num = trimmed.replace(/^Kelas\s+/i, '').trim();
    if (activeClassNumsSet.has(num)) return true;
    return false;
  };

  const deletions: DocumentReference[] = [];
  const updates: { ref: DocumentReference; data: any }[] = [];

  // Fetch all collections in parallel
  const [
    studentsSnap,
    attendanceSnap,
    formativeSnap,
    summativeSnap,
    notesSnap,
    journalsSnap,
    extraPesertaSnap,
    extraAbsensiSnap,
    extraNilaiSnap
  ] = await Promise.all([
    getDocs(collection(db, 'students')),
    getDocs(collection(db, 'attendance')),
    getDocs(collection(db, 'grades_formative')),
    getDocs(collection(db, 'grades_summative')),
    getDocs(collection(db, 'student_notes')),
    getDocs(collection(db, 'journals')),
    getDocs(collection(db, 'extra_tik_peserta')),
    getDocs(collection(db, 'extra_tik_absensi')),
    getDocs(collection(db, 'extra_tik_nilai'))
  ]);

  const validStudentNisSet = new Set<string>();
  let deletedStudentsCount = 0;
  let optimizedPhotosCount = 0;

  // 1. Process students
  studentsSnap.forEach(d => {
    const s = d.data() as Student;
    if (s.kelas && isClassActive(s.kelas) && s.nis) {
      validStudentNisSet.add(s.nis.trim());
    } else {
      deletions.push(d.ref);
      deletedStudentsCount++;
    }
  });

  // 2. Process attendance
  let deletedAttendanceCount = 0;
  attendanceSnap.forEach(d => {
    const a = d.data();
    if (!a.nis || (!validStudentNisSet.has(String(a.nis).trim()) && !isClassActive(a.kelas))) {
      deletions.push(d.ref);
      deletedAttendanceCount++;
    }
  });

  // 3. Process formative grades
  let deletedFormativeGradesCount = 0;
  formativeSnap.forEach(d => {
    const g = d.data();
    const nis = g.nis || d.id;
    if (!nis || (!validStudentNisSet.has(String(nis).trim()) && !isClassActive(g.kelas))) {
      deletions.push(d.ref);
      deletedFormativeGradesCount++;
    }
  });

  // 4. Process summative grades
  let deletedSummativeGradesCount = 0;
  summativeSnap.forEach(d => {
    const g = d.data();
    const nis = g.nis || d.id;
    if (!nis || (!validStudentNisSet.has(String(nis).trim()) && !isClassActive(g.kelas))) {
      deletions.push(d.ref);
      deletedSummativeGradesCount++;
    }
  });

  // 5. Process student notes
  let deletedNotesCount = 0;
  notesSnap.forEach(d => {
    const n = d.data();
    if (!n.nis || (!validStudentNisSet.has(String(n.nis).trim()) && !isClassActive(n.kelas))) {
      deletions.push(d.ref);
      deletedNotesCount++;
    }
  });

  // 6. Process journals
  let deletedJournalsCount = 0;
  journalsSnap.forEach(d => {
    const j = d.data();
    if (!j.kelas || !isClassActive(j.kelas)) {
      deletions.push(d.ref);
      deletedJournalsCount++;
    }
  });

  // 7. Process extra TIK
  const validExtraTikNisSet = new Set<string>();
  let deletedExtraTikPesertaCount = 0;
  extraPesertaSnap.forEach(d => {
    const p = d.data();
    if (!p.nis || (!validStudentNisSet.has(String(p.nis).trim()) && !isClassActive(p.kelas))) {
      deletions.push(d.ref);
      deletedExtraTikPesertaCount++;
    } else {
      validExtraTikNisSet.add(String(p.nis).trim());
    }
  });

  let deletedExtraTikAbsensiCount = 0;
  extraAbsensiSnap.forEach(d => {
    const a = d.data();
    if (!a.nis || (!validStudentNisSet.has(String(a.nis).trim()) && !validExtraTikNisSet.has(String(a.nis).trim()) && !isClassActive(a.kelas))) {
      deletions.push(d.ref);
      deletedExtraTikAbsensiCount++;
    }
  });

  let deletedExtraTikNilaiCount = 0;
  extraNilaiSnap.forEach(d => {
    const n = d.data();
    if (!n.nis || (!validStudentNisSet.has(String(n.nis).trim()) && !validExtraTikNisSet.has(String(n.nis).trim()))) {
      deletions.push(d.ref);
      deletedExtraTikNilaiCount++;
    }
  });

  // Execute batch operations
  let currentBatch = writeBatch(db);
  let opCount = 0;

  for (const ref of deletions) {
    currentBatch.delete(ref);
    opCount++;
    if (opCount % 400 === 0) {
      await currentBatch.commit();
      currentBatch = writeBatch(db);
    }
  }

  for (const item of updates) {
    currentBatch.update(item.ref, item.data);
    opCount++;
    if (opCount % 400 === 0) {
      await currentBatch.commit();
      currentBatch = writeBatch(db);
    }
  }

  if (opCount % 400 !== 0 && opCount > 0) {
    await currentBatch.commit();
  }

  return {
    activeClassesCount: classes.length,
    activeStudentsCount: validStudentNisSet.size,
    deletedStudentsCount,
    deletedAttendanceCount,
    deletedFormativeGradesCount,
    deletedSummativeGradesCount,
    deletedNotesCount,
    deletedJournalsCount,
    deletedExtraTikPesertaCount,
    deletedExtraTikAbsensiCount,
    deletedExtraTikNilaiCount,
    optimizedPhotosCount,
    totalDeletedDocs: deletions.length
  };
}

export interface CollectionStat {
  id: string;
  name: string;
  description: string;
  docCount: number;
  sizeBytes: number;
  sizeFormatted: string;
  category: 'Master Data' | 'Presensi' | 'Nilai' | 'Jurnal & Catatan' | 'Ekstrakurikuler';
  status: 'Aman' | 'Memerlukan Pembersihan' | 'Kosong';
}

export interface DatabaseOverallStats {
  collections: CollectionStat[];
  totalDocs: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  lastUpdated: string;
}

export async function getDatabaseStatsFromFirestore(): Promise<DatabaseOverallStats> {
  const collectionDefs: { id: string; name: string; description: string; category: CollectionStat['category'] }[] = [
    { id: 'classes', name: 'Daftar Kelas', description: 'Data struktur kelas aktif sekolah', category: 'Master Data' },
    { id: 'students', name: 'Data Siswa & Profil', description: 'Profil murid, NIS, foto & kontak', category: 'Master Data' },
    { id: 'attendance', name: 'Presensi Harian', description: 'Catatan kehadiran harian murid', category: 'Presensi' },
    { id: 'grades_formative', name: 'Nilai Formatif', description: 'Tugas, kuis, & asesmen harian', category: 'Nilai' },
    { id: 'grades_summative', name: 'Nilai Sumatif', description: 'STS, SAS, & ujian akhir bab', category: 'Nilai' },
    { id: 'student_notes', name: 'Catatan Perilaku', description: 'Jurnal observasi sikap & perilaku', category: 'Jurnal & Catatan' },
    { id: 'journals', name: 'Jurnal Harian Guru', description: 'Laporan materi & kejadian kelas', category: 'Jurnal & Catatan' },
    { id: 'extra_tik_peserta', name: 'Peserta Extra TIK', description: 'Anggota ekstrakurikuler TIK', category: 'Ekstrakurikuler' },
    { id: 'extra_tik_absensi', name: 'Presensi Extra TIK', description: 'Absensi kegiatan ekstrakurikuler', category: 'Ekstrakurikuler' },
    { id: 'extra_tik_nilai', name: 'Nilai Extra TIK', description: 'Asesmen & praktikum TIK', category: 'Ekstrakurikuler' },
  ];

  const collections: CollectionStat[] = [];
  let totalDocs = 0;
  let totalSizeBytes = 0;

  for (const def of collectionDefs) {
    try {
      const snap = await getDocs(collection(db, def.id));
      const docCount = snap.size;
      let sizeBytes = 0;

      snap.forEach(d => {
        const str = JSON.stringify(d.data());
        sizeBytes += str ? str.length * 2 + 100 : 100;
      });

      totalDocs += docCount;
      totalSizeBytes += sizeBytes;

      let sizeFormatted = '0 KB';
      if (sizeBytes > 1024 * 1024) {
        sizeFormatted = (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB';
      } else if (sizeBytes > 0) {
        sizeFormatted = (sizeBytes / 1024).toFixed(1) + ' KB';
      }

      collections.push({
        id: def.id,
        name: def.name,
        description: def.description,
        docCount,
        sizeBytes,
        sizeFormatted,
        category: def.category,
        status: docCount > 0 ? 'Aman' : 'Kosong'
      });
    } catch (err) {
      console.error(`Error fetching collection stats for ${def.id}:`, err);
      collections.push({
        id: def.id,
        name: def.name,
        description: def.description,
        docCount: 0,
        sizeBytes: 0,
        sizeFormatted: '0 KB',
        category: def.category,
        status: 'Kosong'
      });
    }
  }

  let totalSizeFormatted = '0 KB';
  if (totalSizeBytes > 1024 * 1024) {
    totalSizeFormatted = (totalSizeBytes / (1024 * 1024)).toFixed(2) + ' MB';
  } else if (totalSizeBytes > 0) {
    totalSizeFormatted = (totalSizeBytes / 1024).toFixed(1) + ' KB';
  }

  return {
    collections,
    totalDocs,
    totalSizeBytes,
    totalSizeFormatted,
    lastUpdated: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
}

export async function restoreDatabaseFromJSON(jsonObj: any): Promise<{
  restoredStudents: number;
  restoredAttendance: number;
  restoredGrades: number;
  restoredJournals: number;
  restoredNotes: number;
  restoredExtraTik: number;
}> {
  if (!jsonObj || typeof jsonObj !== 'object') {
    throw new Error('Format file JSON backup tidak valid.');
  }

  const d = jsonObj.data || jsonObj;

  let opsCount = 0;
  let currentBatch = writeBatch(db);

  const commitBatchIfNeeded = async (force = false) => {
    if (opsCount >= 350 || (force && opsCount > 0)) {
      await currentBatch.commit();
      currentBatch = writeBatch(db);
      opsCount = 0;
    }
  };

  // 1. Classes
  if (Array.isArray(d.classes) && d.classes.length > 0) {
    d.classes.forEach((c: any) => {
      if (c && c.id) {
        currentBatch.set(doc(db, 'classes', c.id.toString()), cleanFirestoreData(c));
        opsCount++;
      }
    });
    await commitBatchIfNeeded();
  }

  // 2. Formative & Summative Columns
  if (Array.isArray(d.formativeCols) && d.formativeCols.length > 0) {
    currentBatch.set(doc(db, 'config', 'formativeCols'), cleanFirestoreData({ cols: d.formativeCols }));
    opsCount++;
  }
  if (Array.isArray(d.summativeCols) && d.summativeCols.length > 0) {
    currentBatch.set(doc(db, 'config', 'summativeCols'), cleanFirestoreData({ cols: d.summativeCols }));
    opsCount++;
  }
  await commitBatchIfNeeded();

  // 3. Students
  let restoredStudents = 0;
  if (Array.isArray(d.students)) {
    for (const s of d.students) {
      if (s && s.nis) {
        currentBatch.set(doc(db, 'students', String(s.nis).trim()), cleanStudentRecord(s));
        opsCount++;
        restoredStudents++;
        await commitBatchIfNeeded();
      }
    }
  }

  // 4. Attendance
  let restoredAttendance = 0;
  if (Array.isArray(d.attendance)) {
    for (const r of d.attendance) {
      if (r && r.tanggal && r.nis) {
        const docId = `${r.tanggal}_${String(r.nis).trim()}`;
        currentBatch.set(doc(db, 'attendance', docId), cleanAttendanceRecord(r));
        opsCount++;
        restoredAttendance++;
        await commitBatchIfNeeded();
      }
    }
  }

  // 5. Formative Grades
  let restoredGrades = 0;
  if (Array.isArray(d.formativeGrades)) {
    for (const g of d.formativeGrades) {
      if (g && g.nis) {
        currentBatch.set(doc(db, 'grades_formative', String(g.nis).trim()), cleanGradeRecord(g));
        opsCount++;
        restoredGrades++;
        await commitBatchIfNeeded();
      }
    }
  }

  // 6. Summative Grades
  if (Array.isArray(d.summativeGrades)) {
    for (const g of d.summativeGrades) {
      if (g && g.nis) {
        currentBatch.set(doc(db, 'grades_summative', String(g.nis).trim()), cleanGradeRecord(g));
        opsCount++;
        restoredGrades++;
        await commitBatchIfNeeded();
      }
    }
  }

  // 7. Student Notes
  let restoredNotes = 0;
  if (Array.isArray(d.studentNotes)) {
    for (const n of d.studentNotes) {
      if (n && n.nis) {
        const noteId = n.id || `${n.tanggal}_${n.nis}_${Math.random().toString(36).substr(2, 6)}`;
        currentBatch.set(doc(db, 'student_notes', noteId), cleanFirestoreData({ ...n, id: noteId }));
        opsCount++;
        restoredNotes++;
        await commitBatchIfNeeded();
      }
    }
  }

  // 8. Journals
  let restoredJournals = 0;
  if (Array.isArray(d.journals)) {
    for (const j of d.journals) {
      if (j && j.tanggal) {
        const journalId = j.id || `${j.tanggal}_${(j.kelas || 'all').replace(/[^a-zA-Z0-9]/g, '_')}_${Math.random().toString(36).substr(2, 6)}`;
        currentBatch.set(doc(db, 'journals', journalId), cleanFirestoreData({ ...j, id: journalId }));
        opsCount++;
        restoredJournals++;
        await commitBatchIfNeeded();
      }
    }
  }

  // 9. Extra TIK
  let restoredExtraTik = 0;
  const extra = d.extraTik || d;
  if (Array.isArray(extra.peserta)) {
    for (const p of extra.peserta) {
      if (p && p.nis) {
        currentBatch.set(doc(db, 'extra_tik_peserta', String(p.nis).trim()), cleanFirestoreData(p));
        opsCount++;
        restoredExtraTik++;
        await commitBatchIfNeeded();
      }
    }
  }
  if (Array.isArray(extra.absensi)) {
    for (const a of extra.absensi) {
      if (a && a.tanggal && a.nis) {
        const docId = `${a.tanggal}_${String(a.nis).trim()}`;
        currentBatch.set(doc(db, 'extra_tik_absensi', docId), cleanFirestoreData(a));
        opsCount++;
        restoredExtraTik++;
        await commitBatchIfNeeded();
      }
    }
  }
  if (Array.isArray(extra.nilai)) {
    for (const n of extra.nilai) {
      if (n && n.nis) {
        currentBatch.set(doc(db, 'extra_tik_nilai', String(n.nis).trim()), cleanFirestoreData(n));
        opsCount++;
        restoredExtraTik++;
        await commitBatchIfNeeded();
      }
    }
  }

  // Final commit
  await commitBatchIfNeeded(true);

  return {
    restoredStudents,
    restoredAttendance,
    restoredGrades,
    restoredJournals,
    restoredNotes,
    restoredExtraTik
  };
}

// ==================== ATTENDANCE DATE NOTES (LIBUR / TANPA ABSEN) ====================
export async function getAttendanceDateNotesFromFirestore(): Promise<AttendanceDateNote[]> {
  try {
    const snap = await getDocs(collection(db, 'attendance_date_notes'));
    const list: AttendanceDateNote[] = [];
    snap.forEach(d => {
      const data = d.data() as any;
      if (data.tanggal && data.alasan) {
        list.push({
          tanggal: data.tanggal,
          kelas: data.kelas || '',
          alasan: data.alasan
        });
      }
    });
    return list;
  } catch (err) {
    console.error('Error loading attendance date notes:', err);
    return [];
  }
}

export async function saveAttendanceDateNoteToFirestore(note: AttendanceDateNote): Promise<void> {
  const docId = `${note.tanggal}_${(note.kelas || 'all').replace(/\s+/g, '_')}`;
  await setDoc(doc(db, 'attendance_date_notes', docId), cleanFirestoreData(note));
}

export async function deleteAttendanceDateNoteFromFirestore(date: string, kelas: string): Promise<void> {
  const docId = `${date}_${(kelas || 'all').replace(/\s+/g, '_')}`;
  await deleteDoc(doc(db, 'attendance_date_notes', docId));
}



