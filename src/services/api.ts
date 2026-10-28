import type {
  AnalysisResult,
  AnalyzeRequest,
  ApiResponse,
  DecisionBrief,
  ReviewRequest,
  TestDesignRequest,
  ValidationExperiment,
} from '../types/index.ts';

interface RawApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  code?: ApiResponse<T>['code'];
  isLive?: boolean;
  isDemo?: boolean;
}

/**
 * Generic helper for executing POST requests with comprehensive error trapping.
 * Guarantees that promises resolve to an ApiResponse<T> and never produce unhandled rejections.
 */
async function postJson<TReq, TRes>(endpoint: string, payload: TReq): Promise<ApiResponse<TRes>> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let json: RawApiResponse<TRes> | null = null;
    try {
      json = (await res.json()) as RawApiResponse<TRes>;
    } catch {
      return {
        success: false,
        error: `Server returned non-JSON response (HTTP ${res.status}).`,
        code: 'AI_SERVICE_ERROR',
      };
    }

    if (!res.ok || json?.success === false) {
      return {
        success: false,
        error: json?.error || `Request failed with HTTP ${res.status}.`,
        code:
          json?.code ||
          (res.status === 401
            ? 'MISSING_API_KEY'
            : res.status === 400
              ? 'INVALID_INPUT'
              : 'AI_SERVICE_ERROR'),
        isLive: json?.isLive,
        isDemo: json?.isDemo,
      };
    }

    return {
      success: true,
      data: json.data as TRes,
      isLive: json.isLive,
      isDemo: json.isDemo,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to connect to validation server. Please check your network.';
    return {
      success: false,
      error: message,
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * Stage 1 -> 2: Analyzes problem proposal for clarity, target-user ambiguity, and assumptions.
 */
export async function analyzeProblem(request: AnalyzeRequest): Promise<ApiResponse<AnalysisResult>> {
  return postJson<AnalyzeRequest, AnalysisResult>('/api/analyze', request);
}

/**
 * Stage 2 -> 3: Designs a small, actionable validation experiment with non-leading questions.
 */
export async function generateTest(
  request: TestDesignRequest
): Promise<ApiResponse<ValidationExperiment>> {
  return postJson<TestDesignRequest, ValidationExperiment>('/api/test', request);
}

/**
 * Stage 4 -> 5: Evaluates submitted empirical findings and synthesizes a grounded decision brief.
 */
export async function reviewEvidence(request: ReviewRequest): Promise<ApiResponse<DecisionBrief>> {
  return postJson<ReviewRequest, DecisionBrief>('/api/review', request);
}

export const api = {
  analyzeProblem,
  generateTest,
  reviewEvidence,
};

export default api;
