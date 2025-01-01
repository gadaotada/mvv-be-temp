import { sign, verify, Algorithm } from 'jsonwebtoken';
import { AUTH_TOKEN_SECRET } from '../../config';

type EncodedPayload = {
    userId: string,
    sessionId: string
}

export const generateAccessToken = (userId: string, sessionId: string, expiry: string, algo: Algorithm): string => {
    const token = sign({ userId, sessionId }, AUTH_TOKEN_SECRET, { expiresIn: expiry, algorithm: algo });
    return token;
}

export const decodeAccessToken = (token: string): EncodedPayload | null => {
    try {
        const decoded = verify(token, AUTH_TOKEN_SECRET) as EncodedPayload;
        return decoded;
    } catch (error) {
        return null;
    }
}
