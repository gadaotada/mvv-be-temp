export class CustomError extends Error {
    public readonly type: AppError.Type;
    public readonly severity: AppError.Severity;
    public readonly code: string;
    public readonly data?: any;
    public readonly httpCode: number;
    public readonly timestamp: Date;

    constructor(message: string, options: AppError.Options = {}) {
        super(message);
        this.name = 'CustomError';
        this.type = options.type || 'System';
        this.severity = options.severity || 'Medium';
        this.code = options.code || 'UNKNOWN_ERROR';
        this.data = options.data;
        this.httpCode = options.httpCode || 500;
        this.timestamp = new Date();
    }
}

export default class ErrorManager {
    static create(message: string, options: AppError.Options = {}): CustomError {
        return new CustomError(message, options);
    }

    static createAuthError(message: string, code = 'AUTH_ERROR'): CustomError {
        return new CustomError(message, {
            type: 'Auth',
            severity: 'Medium',
            code,
            httpCode: 401
        });
    }

    static createValidationError(message: string, data?: any): CustomError {
        return new CustomError(message, {
            type: 'Validation',
            severity: 'Low',
            code: 'VALIDATION_ERROR',
            data,
            httpCode: 400
        });
    }

    static createDatabaseError(message: string, data?: any): CustomError {
        return new CustomError(message, {
            type: 'Database',
            severity: 'High',
            code: 'DB_ERROR',
            data,
            httpCode: 500
        });
    }
} 

export function isCustomAppError(value: any): value is CustomError {
    return value instanceof CustomError;
}