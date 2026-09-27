// Centralized Academic Mock & Demo Dataset for College ERP
// Single source of truth for remaining unmigrated student, faculty, and academic entities.

export interface QuizRecord {
  id: number;
  course: string;
  program: string;
  year: string;
  title: string;
  quizDate: string;
  startTime: string;
  endTime: string;
  obtainedMarks: string;
  totalMarks: number;
  score: number;
  status: 'ENDED' | 'ACTIVE' | 'UPCOMING';
  questions: {
    q: string;
    yourAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    marks: number;
  }[];
}

// ─── QUIZZES DATA ───────────────────────────────────────────
export const ACADEMIC_QUIZZES_DATA: QuizRecord[] = [
  {
    id: 1,
    course: 'PCCO404: NLP Laboratory',
    program: 'B.Tech CSE',
    year: '4th Year',
    title: 'BB1 Ass1 Quiz — Subword Tokenization',
    quizDate: '28-Jul-2026',
    startTime: '12:15 PM',
    endTime: '12:21 PM',
    obtainedMarks: '10/10',
    totalMarks: 10,
    score: 10,
    status: 'ENDED',
    questions: [
      { q: 'Which tokenization algorithm uses byte-pair encoding iterations for subwords?', yourAnswer: 'BPE / WordPiece', correctAnswer: 'BPE / WordPiece', isCorrect: true, marks: 5 },
      { q: 'What is the TF-IDF weight formula for term t in document d?', yourAnswer: 'TF(t,d) * log(N / DF(t))', correctAnswer: 'TF(t,d) * log(N / DF(t))', isCorrect: true, marks: 5 },
    ],
  },
  {
    id: 2,
    course: 'PCCO403: Natural Language Processing',
    program: 'B.Tech CSE',
    year: '4th Year',
    title: 'NLP Unit 1 Quiz — Language Modeling',
    quizDate: '03-Aug-2026',
    startTime: '10:33 AM',
    endTime: '10:47 AM',
    obtainedMarks: '28/30',
    totalMarks: 30,
    score: 28,
    status: 'ENDED',
    questions: [
      { q: 'In HMM POS tagging, what dynamic algorithm computes the best state sequence?', yourAnswer: 'Viterbi Algorithm', correctAnswer: 'Viterbi Algorithm', isCorrect: true, marks: 10 },
      { q: 'What is the objective of continuous Skip-Gram word embedding model?', yourAnswer: 'Predict context words given target word', correctAnswer: 'Predict context words given target word', isCorrect: true, marks: 10 },
      { q: 'Which metric measures how well a probability model predicts a test sample?', yourAnswer: 'Perplexity', correctAnswer: 'Perplexity', isCorrect: true, marks: 8 },
    ],
  },
  {
    id: 3,
    course: 'PCCO402: Cryptography & Security Lab',
    program: 'B.Tech CSE',
    year: '4th Year',
    title: 'Quiz 1 — Block Ciphers & Modes',
    quizDate: '10-Aug-2026',
    startTime: '08:00 PM',
    endTime: '08:05 PM',
    obtainedMarks: '9/10',
    totalMarks: 10,
    score: 9,
    status: 'ENDED',
    questions: [
      { q: 'What is the standard block size for AES algorithm?', yourAnswer: '128 bits', correctAnswer: '128 bits', isCorrect: true, marks: 5 },
      { q: 'Why is ECB mode not recommended for encrypting images/structured data?', yourAnswer: 'Preserves identical plaintext patterns', correctAnswer: 'Preserves identical plaintext patterns', isCorrect: true, marks: 4 },
    ],
  },
  {
    id: 4,
    course: 'PCCO401: Database Management Systems',
    program: 'B.Tech CSE',
    year: '4th Year',
    title: 'Quiz 2 — Query Optimization & Transactions',
    quizDate: '24-Sep-2026',
    startTime: '02:00 PM',
    endTime: '02:30 PM',
    obtainedMarks: '-',
    totalMarks: 20,
    score: 0,
    status: 'ACTIVE',
    questions: [],
  },
];

// ─── 5. STUDENT & FACULTY CLASS SCHEDULES ─────────────────────
// (Migrated to real PostgreSQL timetable database & timetableService in Phase 4.3)

// ─── 6. ATTENDANCE MANAGEMENT ─────────────────────────────────
// (Migrated to real PostgreSQL attendance database & attendanceService in Phase 4.4)

// ─── 7. ASSIGNMENTS & SUBMISSIONS ─────────────────────────────
// (Migrated to real PostgreSQL assignments database & assignmentService in Phase 4.5)

// ─── 8. CAMPUS NOTICES & BULLETINS ─────────────────────────────
// (Migrated to real backend database & NoticeService in Phase 4.2)

