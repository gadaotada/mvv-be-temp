/**
 * Rate Limiter class to limit the number of login attempts/verification attempts etc.
 * 
 * @class RateLimiter
 */
export class RateLimiter {
    private attempts: Map<string, {count: number, firstAttempt: number}> = new Map();
    private readonly MAX_ATTEMPTS = 100;
    private readonly TIME_WINDOW = 5 * 60 * 1000; // 5 minutes

    constructor() {
        setInterval(() => this.cleanup(), 60 * 1000);
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, value] of this.attempts.entries()) {
            if (now - value.firstAttempt > this.TIME_WINDOW) {
                this.attempts.delete(key);
            }
        }
    }

    public checkLimit(identifier: string): boolean {
        const now = Date.now();
        const attempt = this.attempts.get(identifier);

        if (!attempt) {
            this.attempts.set(identifier, { count: 1, firstAttempt: now });
            return true;
        }

        if (now - attempt.firstAttempt > this.TIME_WINDOW) {
            // Reset if time window has passed
            this.attempts.set(identifier, { count: 1, firstAttempt: now });
            return true;
        }

        if (attempt.count >= this.MAX_ATTEMPTS) {
            console.log("rate limit exceeded for ", identifier);
            return false; // Rate limit exceeded
        }

        attempt.count++;
        return true;
    }
}