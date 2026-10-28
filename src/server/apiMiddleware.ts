import type { Plugin } from 'vite';
import {
  problemPilotApiPlugin as canonicalPlugin,
  createApiMiddleware,
  type ApiMiddlewareOptions,
} from '../../server/apiMiddleware.ts';

/**
 * Backward-compatibility wrapper for legacy test suite and prototype references.
 * Enables fallbackOnError: true to gracefully return structured heuristic evaluation
 * when GEMINI_API_KEY is not configured or live API service encounters an error.
 */
export function problemPilotApiPlugin(options: ApiMiddlewareOptions = {}): Plugin {
  return canonicalPlugin({
    fallbackOnError: true,
    ...options,
  });
}

export { createApiMiddleware };
export default problemPilotApiPlugin;
