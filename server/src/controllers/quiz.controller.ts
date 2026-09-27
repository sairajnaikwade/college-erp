import { Response, NextFunction } from 'express';
import { QuizService } from '../services/quiz.service';
import { ApiResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../types/common';

const quizService = new QuizService();

export class QuizController {
  /**
   * GET /api/quizzes/student
   */
  public static async getStudentQuizzes(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = {
        subjectId: (req.query.subject_id || req.query.subjectId) as string | undefined,
        status: req.query.status as string | undefined,
        academicYear: (req.query.academic_year || req.query.academicYear) as string | undefined,
        semester: req.query.semester as string | undefined,
        search: req.query.search as string | undefined,
      };

      const quizzes = await quizService.getStudentQuizzes(req, filters);
      ApiResponse.success(res, quizzes, 'Student quizzes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/quizzes/student/:id
   */
  public static async getStudentQuizById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const quiz = await quizService.getStudentQuizById(id, req);
      ApiResponse.success(res, quiz, 'Quiz details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/quizzes/:id/start
   */
  public static async startQuiz(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await quizService.startQuiz(id, req);
      ApiResponse.created(res, result, 'Quiz attempt started successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/quizzes/attempts/:attemptId
   */
  public static async getAttempt(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const attemptId = req.params.attemptId as string;
      const attempt = await quizService.getAttempt(attemptId, req);
      ApiResponse.success(res, attempt, 'Quiz attempt retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/quizzes/attempts/:attemptId/answers
   */
  public static async saveAnswer(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const attemptId = req.params.attemptId as string;
      const answer = await quizService.saveAnswer(attemptId, req.body, req);
      ApiResponse.success(res, answer, 'Answer saved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/quizzes/attempts/:attemptId/submit
   */
  public static async submitQuiz(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const attemptId = req.params.attemptId as string;
      const result = await quizService.submitQuiz(attemptId, req);
      ApiResponse.success(res, result, 'Quiz submitted and evaluated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/quizzes/attempts/:attemptId/result
   */
  public static async getAttemptResult(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const attemptId = req.params.attemptId as string;
      const result = await quizService.getAttemptResult(attemptId, req);
      ApiResponse.success(res, result, 'Quiz attempt result retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/quizzes/staff
   */
  public static async getStaffQuizzes(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = {
        classId: (req.query.class_id || req.query.classId) as string | undefined,
        subjectId: (req.query.subject_id || req.query.subjectId) as string | undefined,
        status: req.query.status as string | undefined,
        academicYear: (req.query.academic_year || req.query.academicYear) as string | undefined,
        semester: req.query.semester ? parseInt(req.query.semester as string, 10) : undefined,
        search: req.query.search as string | undefined,
      };

      const quizzes = await quizService.getStaffQuizzes(req, filters);
      ApiResponse.success(res, quizzes, 'Faculty quizzes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/quizzes/stats
   */
  public static async getStats(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await quizService.getStats(req);
      ApiResponse.success(res, stats, 'Quiz statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/quizzes (Admin listing)
   */
  public static async getAllQuizzes(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = {
        departmentId: (req.query.department_id || req.query.departmentId) as string | undefined,
        classId: (req.query.class_id || req.query.classId) as string | undefined,
        subjectId: (req.query.subject_id || req.query.subjectId) as string | undefined,
        createdBy: (req.query.created_by || req.query.createdBy) as string | undefined,
        status: req.query.status as string | undefined,
        academicYear: (req.query.academic_year || req.query.academicYear) as string | undefined,
        semester: req.query.semester ? parseInt(req.query.semester as string, 10) : undefined,
        search: req.query.search as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };

      const result = await quizService.getAllQuizzes(req, filters);
      res.status(200).json({
        success: true,
        message: 'All institutional quizzes retrieved',
        data: result.rows,
        total: result.total,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/quizzes/:id
   */
  public static async getQuizById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const quiz = await quizService.getQuizById(id, req);
      ApiResponse.success(res, quiz, 'Quiz details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/quizzes
   */
  public static async createQuiz(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const quiz = await quizService.createQuiz(req.body, req);
      ApiResponse.created(res, quiz, 'Draft quiz created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/quizzes/:id
   */
  public static async updateQuiz(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const updated = await quizService.updateQuiz(id, req.body, req);
      ApiResponse.success(res, updated, 'Quiz updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/quizzes/:id
   */
  public static async deleteQuiz(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      await quizService.deleteQuiz(id, req);
      ApiResponse.success(res, null, 'Quiz deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/quizzes/:id/publish
   */
  public static async publishQuiz(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const published = await quizService.publishQuiz(id, req);
      ApiResponse.success(res, published, 'Quiz published successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/quizzes/:id/close
   */
  public static async closeQuiz(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const closed = await quizService.closeQuiz(id, req);
      ApiResponse.success(res, closed, 'Quiz closed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/quizzes/:id/attempts
   */
  public static async getQuizAttempts(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const attempts = await quizService.getQuizAttempts(id, req);
      ApiResponse.success(res, attempts, 'Quiz attempts retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/quizzes/:id/analytics
   */
  public static async getQuizAnalytics(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const analytics = await quizService.getQuizAnalytics(id, req);
      ApiResponse.success(res, analytics, 'Quiz analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/quizzes/:id/questions
   */
  public static async addQuestion(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const question = await quizService.addQuestion(id, req.body, req);
      ApiResponse.created(res, question, 'Question added to quiz successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/quizzes/questions/:questionId
   */
  public static async updateQuestion(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const questionId = req.params.questionId as string;
      const updated = await quizService.updateQuestion(questionId, req.body, req);
      ApiResponse.success(res, updated, 'Question updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/quizzes/questions/:questionId
   */
  public static async deleteQuestion(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const questionId = req.params.questionId as string;
      await quizService.deleteQuestion(questionId, req);
      ApiResponse.success(res, null, 'Question deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/quizzes/questions/:questionId/options
   */
  public static async addOption(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const questionId = req.params.questionId as string;
      const option = await quizService.addOption(questionId, req.body, req);
      ApiResponse.created(res, option, 'Option added successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/quizzes/options/:optionId
   */
  public static async updateOption(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const optionId = req.params.optionId as string;
      const updated = await quizService.updateOption(optionId, req.body, req);
      ApiResponse.success(res, updated, 'Option updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/quizzes/options/:optionId
   */
  public static async deleteOption(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const optionId = req.params.optionId as string;
      await quizService.deleteOption(optionId, req);
      ApiResponse.success(res, null, 'Option deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
