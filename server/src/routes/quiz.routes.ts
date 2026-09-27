import { Router } from 'express';
import { QuizController } from '../controllers/quiz.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All quiz endpoints require valid session authentication
router.use(authenticate);

// ─── Student Endpoints ─────────────────────────────────────────
router.get('/student', authorize('STUDENT'), QuizController.getStudentQuizzes);
router.get('/student/:id', authorize('STUDENT'), QuizController.getStudentQuizById);
router.post('/:id/start', authorize('STUDENT'), QuizController.startQuiz);
router.get('/attempts/:attemptId', QuizController.getAttempt);
router.post('/attempts/:attemptId/answers', authorize('STUDENT'), QuizController.saveAnswer);
router.post('/attempts/:attemptId/submit', authorize('STUDENT'), QuizController.submitQuiz);
router.get('/attempts/:attemptId/result', QuizController.getAttemptResult);

// ─── Staff & Admin Endpoints ───────────────────────────────────
router.get('/staff', authorize('STAFF', 'ADMIN'), QuizController.getStaffQuizzes);
router.get('/stats', authorize('ADMIN'), QuizController.getStats);

// ─── Question & Option CRUD ───────────────────────────────────
router.post('/:id/questions', authorize('STAFF', 'ADMIN'), QuizController.addQuestion);
router.put('/questions/:questionId', authorize('STAFF', 'ADMIN'), QuizController.updateQuestion);
router.delete('/questions/:questionId', authorize('STAFF', 'ADMIN'), QuizController.deleteQuestion);

router.post('/questions/:questionId/options', authorize('STAFF', 'ADMIN'), QuizController.addOption);
router.put('/options/:optionId', authorize('STAFF', 'ADMIN'), QuizController.updateOption);
router.delete('/options/:optionId', authorize('STAFF', 'ADMIN'), QuizController.deleteOption);

// ─── Lifecycle & Analytics ────────────────────────────────────
router.post('/:id/publish', authorize('STAFF', 'ADMIN'), QuizController.publishQuiz);
router.post('/:id/close', authorize('STAFF', 'ADMIN'), QuizController.closeQuiz);
router.get('/:id/attempts', authorize('STAFF', 'ADMIN'), QuizController.getQuizAttempts);
router.get('/:id/analytics', authorize('STAFF', 'ADMIN'), QuizController.getQuizAnalytics);

// ─── General Quiz CRUD ─────────────────────────────────────────
router.get('/', authorize('ADMIN'), QuizController.getAllQuizzes);
router.get('/:id', QuizController.getQuizById);
router.post('/', authorize('STAFF', 'ADMIN'), QuizController.createQuiz);
router.put('/:id', authorize('STAFF', 'ADMIN'), QuizController.updateQuiz);
router.delete('/:id', authorize('STAFF', 'ADMIN'), QuizController.deleteQuiz);

export default router;
