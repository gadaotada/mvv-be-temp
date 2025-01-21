import { randomBytes } from 'crypto';

import { generateAccessToken, decodeAccessToken } from './helper';
import { RateLimiter } from './RateLimiter';
import { DTO, pool } from '../../database';
import { AppError } from '../../errors';
import type { CustomError } from '../../errors/';

export class SessionManager {
    private static instance: SessionManager | null = null;
    private config: Auth.AuthConfig;
    private sessionCache: Map<string, Auth.Session> = new Map();
    public rateLimiter: RateLimiter;

    constructor(config: Auth.AuthConfig) {
        this.config = config;
        this.rateLimiter = new RateLimiter();
        setInterval(() => this.cleanupCache(), this.config.cacheCleanupInterval * 60 * 60 * 1000);
    }

    public static getInstance(config: Auth.AuthConfig): SessionManager {
        if (!SessionManager.instance) {
            SessionManager.instance = new SessionManager(config);
        }
        return SessionManager.instance;
    }

    private cleanupCache(): void {
        for (const [sessionId, session] of this.sessionCache.entries()) {
            if (session.accessTokenExpiresAt < new Date()) {
                this.sessionCache.delete(sessionId);
            }
        }
    }

    public async createSession(userId: string): Promise<AppTypes.Result<Auth.Session, CustomError>> {
        if (!this.rateLimiter.checkLimit(`login:${userId}`)) {
            return [null, AppError.create('Too many login attempts', {
                type: "Auth",
                code: "RATE_LIMIT_EXCEEDED",
                severity: "Low"
            })];
        }

        const sessionId = randomBytes(32).toString('hex');
        const accessToken = generateAccessToken(userId, sessionId, (this.config.tokenExpiration + "m"), this.config.tokenAlgorithm);

        const session: Auth.Session = {
            id: sessionId,
            userId: userId,
            accessToken: accessToken,
            accessTokenExpiresAt: new Date(Date.now() + this.config.tokenExpiration * 60 * 1000)
        }

        this.sessionCache.set(sessionId, session);
        const result = await this.saveSessionToDb(session);

        if (typeof result !== 'boolean') {
            const newError = AppError.create('Failed to save session to database', {
                type: "Database",
                code: "DB_ERROR",
                severity: "Critical",
                data: result
            });
            return [null, newError];
        }

        return [session, null];
    }

    private async saveSessionToDb(session: Auth.Session): Promise<boolean | unknown> {
        const connection = await pool.getConnection();
        try {
            const query = `INSERT INTO sessions (id, access_token, user_id, access_token_expires_at) VALUES (?, ?, ?, ?)`;
            const values = [session.id, session.accessToken, session.userId, session.accessTokenExpiresAt];
            
            const result = await new DTO({query, values, connection}).query();
            if (!result.success) {
                return result.error;
            }

            return true;
        } finally {
            connection.release();
        }
    }

    public async getSession(sessionId: string): Promise<AppTypes.Result<Auth.Session, CustomError | unknown>> {
        let session = this.sessionCache.get(sessionId);
        if (!session) {
            // check if session is in db
            const connection = await pool.getConnection();
            const query = `SELECT * FROM sessions WHERE id = ? AND access_token_expires_at > NOW() LIMIT 1`;
            const values = [sessionId];
            const result = await new DTO({query, values, connection}).query();
            connection.release();
            if (!result.success || result.data.length === 0) {
                return [null, result.error];
            }
            session = {
                id: result.data[0].id,
                userId: result.data[0].user_id,
                accessToken: result.data[0].access_token,
                accessTokenExpiresAt: result.data[0].access_token_expires_at
            }
            this.sessionCache.set(session.id, session);
        }
        return [session, null];
    }
    // add custom errors in order to preform different actions based on the validation result specially for rate limit exceeded
    public async validateSession(token: string): Promise<Auth.Session | null> {
        if (!this.rateLimiter.checkLimit(`validate:${token}`)) {
            return null;
        }

        const session = decodeAccessToken(token);
        if (!session) {
            return null;
        }
        
        // check cache
        const cachedSession = this.sessionCache.get(session.sessionId);
        if (cachedSession) {
            const isChecked = cachedSession.userId === session.userId && cachedSession.accessToken === token;
            return isChecked ? cachedSession : null;
        }
        // check db
        const [res, error] = await this.getSession(session.sessionId);
        if (error !== null) {
            return null;
        }

        const isChecked = res?.userId === session.userId && res?.accessToken === token;
        return isChecked ? res : null;
    }

    public async deleteSession(sessionId: string): Promise<AppTypes.Result<boolean, CustomError>> {
        this.sessionCache.delete(sessionId);
        const connection = await pool.getConnection();
        const query = `DELETE FROM sessions WHERE id = ?`;
        const values = [sessionId];
        const result = await new DTO({query, values, connection}).query();
        connection.release();
        if (!result.success) {
            const newError = AppError.createDatabaseError('Failed to delete session', {
                type: "Database",
                code: "DB_ERROR",
                severity: "Critical",
                data: result.error
            });
            return [null, newError];
        }
        return [true, null];
    }

    public async deleteAllUserSessions(userId: string): Promise<AppTypes.Result<boolean, CustomError>> {
        // remove from cache
        for (const [sessionId, session] of this.sessionCache.entries()) {
            if (session.userId === userId) {
                this.sessionCache.delete(sessionId);
            }
        }

        // remove from db
        const connection = await pool.getConnection();
        const query = `DELETE FROM sessions WHERE user_id = ?`;
        const values = [userId];
        const result = await new DTO({query, values, connection}).query();
        connection.release();
        if (!result.success) {
            const newError = AppError.createDatabaseError('Failed to delete session', {
                type: "Database",
                code: "DB_ERROR",
                severity: "Critical",
                data: result.error
            });
            return [null, newError];
        }
        return [true, null];
    }
}
