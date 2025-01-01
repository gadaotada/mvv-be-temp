import { Router } from "express";
import type { AppLogger } from "../../global/logging";
import { permissionCheck, type SessionManager } from "../../global/auth";
import { getUserById } from "../sign/core/dal";

const auth = Router();

auth.get('/me', permissionCheck("users:read:own", async (req, res) => {
    const logger = req.app.get('logger') as AppLogger;
    const user = req.user;

    if (!user) {
        res.status(401).json({message: "Unauthorized"});
        return;
    }

    const userData = await getUserById(user.id);
    if (!userData.success || !userData.data) {
        logger.log(userData.error, "error");
        res.status(401).json({message: "Unauthorized"});
        return;
    }

    res.status(200).json({message: "User authenticated", user: userData.data[0]});
}));

export default auth;