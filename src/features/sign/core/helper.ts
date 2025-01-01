import type { SessionManager } from "../../../global/auth";

export const isUserAuthenticated = async (token: Auth.Session["accessToken"], currSessionManager: SessionManager) => {
    if (!token) {
        return false;
    }
    
    const isValid = await currSessionManager.validateSession(token);
    return isValid;
}