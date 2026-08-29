import { isAxiosError } from 'axios';

/**
 * Extract a human-readable message from an unknown thrown value.
 * Prefers the server's `{ error }` body (axios errors), then the Error
 * message, then a caller-supplied fallback.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const serverError = (err.response?.data as { error?: string } | undefined)?.error;
    if (serverError) return serverError;
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
