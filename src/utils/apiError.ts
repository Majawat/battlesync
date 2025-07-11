export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super(400, message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict') {
    super(409, message);
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(500, message);
  }
}