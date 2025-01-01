import { Router } from "express";

import { handleControllerError, validateSchema } from "../../global/libs/global-helpers";
import { activationTokenSchema, registerSchema, resendActivationTokenSchema } from "./core/validations";
import { AppError } from "../../global/errors";
import type { AppLogger } from "../../global/logging";
import { SignUpService } from "./sign-up.service";

const signUp = Router();

signUp.post('/up', async (req, res) => {
    const { email, password, name } = req.body;
    const logger = req.app.get('logger') as AppLogger;

    try {
        if (!validateSchema(registerSchema, req.body)) {
            throw AppError.createValidationError('Invalid request body', 'INVALID_REQ_BODY');
        }

        const [__, error] = await new SignUpService().register({email, password, name});
        if (error !== null) {
            logger.log(error, "error");
            if (error.code === 'DUPLICATE_ENTRY') {
                res.status(400).json({message: "User already exists"});
            } else {
                res.status(400).json({message: "Something went wrong, please try again later."});
            }
            return;
        }

        res.status(200).json({ message: 'User created successfully' });
    } catch (error) {
        handleControllerError(error, res, logger);
    }
});

signUp.get('/activate', async (req, res) => {
    const { token } = req.query;
    const logger = req.app.get('logger') as AppLogger;

    try {
        if (!validateSchema(activationTokenSchema, token)) {
            throw AppError.createValidationError('Invalid token', 'INVALID_TOKEN');
        }

        const [result, error] = await new SignUpService().activate(token as string);
        if (error !== null) {
            logger.log(error, "error");
            res.status(400).json({message: "Something went wrong, please try again later."});
            return;
        }

        res.status(200).json({ message: 'User activated successfully' });
    } catch (error) {
        handleControllerError(error, res, logger);
    }
});

signUp.post('/rst', async (req, res) => {
    const { email } = req.body;
    const logger = req.app.get('logger') as AppLogger;

    try {       
        if (!validateSchema(resendActivationTokenSchema, email)) {
            throw AppError.createValidationError('Invalid request body', 'INVALID_REQ_BODY');
        }

        const [result, error] = await new SignUpService().newActivationToken(email);
        if (error !== null) {
            logger.log(error, "error");
            res.status(400).json({message: "Something went wrong, please try again later."})
            return;
        }

        res.status(200).json({ message: 'Activation token sent successfully' });
    } catch (error) {
        handleControllerError(error, res, logger);
    }
});


export default signUp;
