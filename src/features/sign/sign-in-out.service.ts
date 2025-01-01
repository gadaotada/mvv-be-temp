import { verify } from "argon2";
import { getUserByEmail } from "./core/dal";
import { AppError, CustomError } from "../../global/errors";
import type { AuthUser } from "./core/types";
import { sessionManager } from "../../app";


export class SignInOutService {
    async signIn(email: string, password: string): Promise<AppTypes.Result<AuthUser, CustomError>> {
        const result = await getUserByEmail(email);
        if (!result.success || result.data.length === 0) {
            return [null, AppError.createAuthError('User not found', "USER_NOT_FOUND")];
        }
        const currentPassword = result.data[0].password;
        const isPasswordValid = await verify(currentPassword, password);

        if (!isPasswordValid) {
            return [null, AppError.createAuthError('Invalid password', "INVALID_PASSWORD")];
        }
        console.log(result.data[0]);
        const user = {
            id: result.data[0].id as string,
            email: result.data[0].email,
            name: result.data[0].name,
            roles: result.data.map((row) => ({
                id: row.roleId,
                name: row.roleName,
            })) as Auth.Role[]
        };

        const [session, error] = await sessionManager.createSession(user.id);
        if (error !== null) {
            return [null, error];
        }
        const now = new Date().getTime();
        const expiresAt = new Date(session.accessTokenExpiresAt).getTime() - now; // we need to convert it to milliseconds

        const authUser: AuthUser = {    
            ...user,
            token: session.accessToken,
            expiresAt: expiresAt
        };

        return [authUser, null];
    }

    async signOut(token: string): Promise<AppTypes.Result<boolean, CustomError>> {
        const session = await sessionManager.validateSession(token);

        if (session === null) {
            return [null, AppError.createAuthError('Invalid token', 'INVALID_TOKEN')];
        }

        const [result, error] = await sessionManager.deleteSession(session.id);
        if (error !== null) {
            const newError = AppError.createDatabaseError('Failed to delete session', {
                type: "Database",
                code: "DB_ERROR",
                severity: "Critical",
                data: error
            });
            return [null, newError];
        }

        return [result, null];
    }
}
