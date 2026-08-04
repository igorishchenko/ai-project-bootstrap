/** Machine-readable error codes, so the CLI can render tailored guidance. */
export type GeneratorErrorCode =
  | 'INVALID_MANIFEST'
  | 'DUPLICATE_MODULE'
  | 'UNKNOWN_MODULE'
  | 'MISSING_REQUIRED_CATEGORY'
  | 'MISSING_REQUIRED_MODULE'
  | 'INCOMPATIBLE_MODULES'
  | 'CIRCULAR_DEPENDENCY'
  | 'INVALID_ENV_TABLE'
  | 'TEMPLATE_ERROR'
  | 'TARGET_NOT_EMPTY'
  | 'PATH_COLLISION'
  | 'INVALID_CONFIG';

/**
 * Every failure the generator raises on purpose. The `hint` is the actionable
 * half — the spec asks for "useful error messages", which means telling the
 * user what to do next, not just what went wrong.
 */
export class GeneratorError extends Error {
  readonly code: GeneratorErrorCode;
  readonly hint?: string;

  constructor(code: GeneratorErrorCode, message: string, hint?: string) {
    super(message);
    this.name = 'GeneratorError';
    this.code = code;
    this.hint = hint;
  }
}

export function isGeneratorError(error: unknown): error is GeneratorError {
  return error instanceof GeneratorError;
}
