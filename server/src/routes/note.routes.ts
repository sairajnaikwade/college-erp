import { Router } from 'express';
import { NoteController } from '../controllers/note.controller';
import { authenticate, authorize } from '../middleware/auth';
import { noteUploadMiddleware } from '../middleware/upload';

const router = Router();

// All notes endpoints require valid session authentication
router.use(authenticate);

// Role-aware and stats endpoints
router.get('/my', NoteController.getMyNotes);
router.get('/stats', authorize('ADMIN'), NoteController.getStats);

// Student endpoints
router.get('/student', authorize('STUDENT'), NoteController.getStudentNotes);

// Staff / Faculty endpoints
router.get('/staff', authorize('STAFF', 'ADMIN'), NoteController.getStaffNotes);
router.get('/class/:classId', authorize('STAFF', 'ADMIN'), NoteController.getClassNotes);

// Admin global listing
router.get('/', authorize('ADMIN'), NoteController.getAllNotes);

// Download / View authenticated PDF file
router.get('/:id/file', NoteController.downloadNoteFile);

// Single note details (Authorized roles)
router.get('/:id', NoteController.getNoteById);

// Create, update, delete study materials (Staff / Admin)
router.post('/', authorize('STAFF', 'ADMIN'), noteUploadMiddleware, NoteController.createNote);
router.put('/:id', authorize('STAFF', 'ADMIN'), NoteController.updateNote);
router.delete('/:id', authorize('STAFF', 'ADMIN'), NoteController.deleteNote);

export default router;

