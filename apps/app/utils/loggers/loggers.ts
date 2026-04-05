import { Logger } from 'ts-log';

export const logger: Logger = {
  trace: console.trace.bind(console),
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

// Optional helper to wrap safe logging
export function safeLog(fn: () => void) {
  try {
    fn();
  } catch (err) {
    console.error('Logging failed:', err);
  }
}