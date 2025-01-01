import { Schema } from 'yup';
import type { Response } from 'express';

import { isCustomAppError } from '../errors';
import type { AppLogger } from '../logging';

export function validateSchema(schema: Schema, data: any): boolean {
    try {
        schema.validateSync(data, { abortEarly: false });
        return true;
    } catch (error) {
        return false;
    }
};

export function handleControllerError(
    error: unknown, 
    res: Response, 
    logger: AppLogger
): void {
    if (isCustomAppError(error)) {
        logger.log({...error}, 'error');
        res.status(error.httpCode).json({ 
            message: error.message,
            code: error.code 
        });
    } else {
        logger.log(error, 'error');
        res.status(500).json({ 
            message: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
}

export const setCookie = (res: Response, cookieData: {access_token: string, expires_at: number}) => {
    res.cookie('auth-at-app', cookieData.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: cookieData.expires_at
    });
}

export const clearCookie = (res: Response) => {
    res.clearCookie('auth-at-app');
}
