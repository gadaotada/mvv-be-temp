import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { LocalStorageStrategy } from './global/libs/upload';
import { ConfigManager } from "./global/config/ConfigManager"
import { AppLogger } from "./global/logging";
import { JobsManager } from "./global/libs/jobs";
import { EmailManager } from "./global/libs/mails";
import { RBACManager } from "./global/auth/";
import { APP_DEFAUTLT_ROLES } from "./global/config/constants";
import { pool } from "./global/database";
import { SessionManager } from "./global/auth";
import signInOut from "./features/sign/sign-in-out.controller";
import signUp from "./features/sign/sign-up.controller";
import auth from "./features/auth/auth.controller";
import { sessionMiddleware } from "./global/auth/sessions/middleware";

const appSettingsPath = process.cwd() + "/src/settings.yml"
const app = express();

const config = ConfigManager.getInstance(appSettingsPath);

// Initialize Auth and RBAC systems
export const sessionManager = SessionManager.getInstance(config.get("auth"));
export const rbac = RBACManager.getInstance(APP_DEFAUTLT_ROLES, pool);

export const logger = AppLogger.createInstance(config.get("logging"));
export const storage = new LocalStorageStrategy(config.get("upload"), logger);
export const cronJobs = JobsManager.getInstance(logger, config.get("cron"));

EmailManager.initialize(config.get("mail"));
export const mailSys = EmailManager.getInstance();

app.set('sessionManager', sessionManager);
app.set('rbac', rbac);
app.set('storage', storage);
app.set('logger', logger);
app.set('mail', mailSys);

app.use(cors({
    origin: "http://localhost:4000",
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    // Prevents MIME-type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevents your site from being embedded in iframes
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Modern XSS protection using CSP
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'");
    
    // Prevents browsers from caching sensitive information
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    
    // Strict Transport Security (forces HTTPS)
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
});

app.use('/auth', sessionMiddleware, auth);
app.use('/sign', signInOut, signUp);

app.listen(3000, async () => {
    await cronJobs.loadTasks();
    console.log('Server is running on port 3000');
});