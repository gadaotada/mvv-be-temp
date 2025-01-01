import { Router } from "express";
import { clearCookie, handleControllerError, setCookie, validateSchema } from "../../global/libs/global-helpers";
import { signInSchema } from "./core/validations";
import { AppError } from "../../global/errors";
import type { AppLogger } from "../../global/logging";
import { SignInOutService } from "./sign-in-out.service";
import type { SessionManager } from "../../global/auth";
import { isUserAuthenticated } from "./core/helper";

const signInOut = Router();

signInOut.post('/in', async (req, res) => {
    const logger = req.app.get('logger') as AppLogger;
    const sessionManager = req.app.get('sessionManager') as SessionManager;
    const token = req.cookies['auth-at-app'];
    try {
        const check = await isUserAuthenticated(token, sessionManager);
        if (check) {
            res.status(200).json({message: "User already authenticated"});
            return;
        }
        const { email, password } = req.body;
        if (!validateSchema(signInSchema, req.body)) {
            throw AppError.createValidationError('Invalid request body', 'INVALID_REQ_BODY');
        }

        const [user, error] = await new SignInOutService().signIn(email, password);
        if (error !== null) {
            logger.log(error, "error");
            res.status(400).json({message: "Wrong credentials"});
            return;
        }

        setCookie(res, {access_token: user.token, expires_at: user.expiresAt});
        res.status(200).json({message: "User signed in successfully"});
    } catch (error) {
        handleControllerError(error, res, logger);
    }
});

signInOut.post('/out', async (req, res) => {
    const logger = req.app.get('logger') as AppLogger;
    try {
        const token = req.cookies['auth-at-app'];
        if (!token) {
            throw AppError.createAuthError('No token provided', 'NO_TOKEN_PROVIDED');
        }

        const [__, error] = await new SignInOutService().signOut(token);
        if (error !== null) {
            logger.log(error, "error");
            res.status(400).json({message: "Something went wrong, please try again later."});
            return;
        }

        clearCookie(res);
        res.status(200).json({message: "User signed out successfully"});
    } catch(error) {
        handleControllerError(error, res, logger);
    }
});

export default signInOut;
