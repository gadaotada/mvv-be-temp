import { v4 as uuidv4 } from 'uuid';
import { hash } from 'argon2';

import { logger, mailSys } from '../../app';
import { activateUser, createUser, getActivationToken, getUserIdByEmail, regenerateActivationToken } from "./core/dal";
import { AppError, type CustomError } from '../../global/errors';
import type { RegisterSettings, NewUser, AppUser } from "./core/types";

export class SignUpService {
    async register(user: NewUser): Promise<AppTypes.Result<AppUser, CustomError>> {
        const hashPassword = await hash(user.password);
        const regSettings: RegisterSettings = {
            hashPassword,
            defaultRoleId: 2
        }
        // if mail system is not valid or not enabled, set user active to true since we can't send email
        user.active = !mailSys.isValid || !mailSys.enabled;

        let activationToken: string | undefined = undefined;
        // if user is not active, create activation token
        if (!user.active) {
            activationToken = uuidv4();
        }

        const result = await createUser(user, regSettings, activationToken);

        if (!result.success) {
            let newError: CustomError;
            if (result.error && typeof result.error === 'string' && result.error.includes('Duplicate entry')) {
                newError = AppError.create('User already exists', {
                    type: "Database",
                    severity: "Low",
                    httpCode: 400,
                    code: 'DUPLICATE_ENTRY',
                })
            } else {
                newError = AppError.createDatabaseError('Failed to create user', {
                    type: "Database",
                    code: "FAILED_TO_CREATE_USER",
                    severity: "High",
                    data: result.error
                });
            }
            
            return [null, newError];
        }

        // send email to user if mail system is valid and enabled
        if (mailSys.isValid && mailSys.enabled) {
            mailSys.sendMail({
                to: user.email,
                subject: 'Welcome to our app',
                text: 'Please activate your account by clicking on the link below: ' + `http://localhost:3000/sign/activate?token=${activationToken}`
            });
        }

        const newUser: AppUser = {
            id: String(result.metadata.insertId),
            name: user.name,
            email: user.email,
            active: user.active
        }

        return [newUser, null];
    }

    async activate(token: string): Promise<AppTypes.Result<boolean, CustomError>> {
        const tokenRes = await getActivationToken(token);
        if (!tokenRes.success) {
            const newError = AppError.createDatabaseError('Failed to get activation token', {
                type: "Database",
                code: "FAILED_TO_GET_ACTIVATION_TOKEN",
                severity: "High",
                data: tokenRes.error
            });
            return [null, newError];
        }

        if (tokenRes.data === undefined || tokenRes.data.length === 0 || tokenRes.data.length > 1) {
            const newError = AppError.createDatabaseError('Invalid activation token', 'INVALID_ACTIVATION_TOKEN');
            return [null, newError];
        }

        const userId = tokenRes.data[0].user_id;
        const result = await activateUser(userId);
        if (!result.success) {
            const newError = AppError.createDatabaseError('Failed to activate user', {
                type: "Database",
                code: "FAILED_TO_ACTIVATE_USER",
                severity: "High",
                data: result.error
            });
            return [null, newError];
        }

        return [true, null];
    }

    async newActivationToken(email: string): Promise<AppTypes.Result<boolean, CustomError>> {
        if (!mailSys.isValid || !mailSys.enabled) {
           return [null, AppError.create('Mail system is not valid or enabled', {
                httpCode: 400,
                code: 'MAIL_SYSTEM_NOT_VALID_OR_ENABLED',
            })]
        }

        const userIdResult = await getUserIdByEmail(email);
        if (!userIdResult.success || !userIdResult.data) {
            const newError = AppError.createDatabaseError('Failed to get user id', {
                type: "Database",
                code: "FAILED_TO_GET_USER_ID",
                severity: "High",
                data: userIdResult.error
            });
            return [null, newError];
        }

        const userId = userIdResult.data[0].id;
        const token = uuidv4();
        
        const result = await regenerateActivationToken(userId, token);
        if (!result.success) {
            const newError = AppError.createDatabaseError('Failed to regenerate activation token', {
                type: "Database",
                code: "FAILED_TO_REGENERATE_ACTIVATION_TOKEN",
                severity: "High",
                data: result.error
            });
            return [null, newError];
        }

        const updatedRoles = result.metadata?.affectedRows === 1? true : false;

        return [updatedRoles, null];
    }
}
