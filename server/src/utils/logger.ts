/**
 * Simple logger utility.
 * Can be replaced with a more sophisticated logging library (e.g., Winston, Pino)
 * in future phases.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
  const prefix = `[${formatTimestamp()}] [${level.toUpperCase()}]`;
  const extra = args.length > 0 ? ' ' + args.map(a => {
    if (typeof a === 'string') return a;
    try { return JSON.stringify(a); } catch { return String(a); }
  }).join(' ') : '';
  return `${prefix} ${message}${extra}`;
}

export const logger = {
  info(message: string, ...args: unknown[]): void {
    console.log(formatMessage('info', message, ...args));
  },

  warn(message: string, ...args: unknown[]): void {
    console.warn(formatMessage('warn', message, ...args));
  },

  error(message: string, ...args: unknown[]): void {
    console.error(formatMessage('error', message, ...args));
  },

  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', message, ...args));
    }
  },
};
