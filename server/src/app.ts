import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/environment';
import { errorHandler, defaultRateLimiter } from './middleware';
import routes from './routes';
import { ApiError } from './utils';

const app = express();

// ─── Security Headers ────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────
const allowedOrigins = env.clientUrl.includes(',')
  ? env.clientUrl.split(',').map((url) => url.trim().replace(/\/$/, ''))
  : env.clientUrl.trim().replace(/\/$/, '');

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Request Logging ─────────────────────────────────────
app.use(morgan(env.isDevelopment ? 'dev' : 'combined'));

// ─── Body Parsing ────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ───────────────────────────────────────
app.use('/api/', defaultRateLimiter);

// ─── API Routes ──────────────────────────────────────────
app.use('/api', routes);

// ─── 404 Handler ─────────────────────────────────────────
app.use((_req, _res, next) => {
  next(ApiError.notFound('Route not found'));
});

// ─── Centralized Error Handler ───────────────────────────
app.use(errorHandler);

export default app;
