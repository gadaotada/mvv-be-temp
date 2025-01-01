import { NextFunction, Request, Response } from "express";
import type { SessionManager } from "./SessionManager";
import { DTO, pool } from "../../database";
import { rolesCache } from "../rbac/RolesCache";

async function getUserRoles(userId: number | string) {
    // check cache
    const cachedRoles = rolesCache.get(String(userId));
    if (cachedRoles) {
        return {
            success: true,
            data: cachedRoles,
            cacheMiss: false
        }
    }
    // cache miss
    const connection = await pool.getConnection();
    const query = `
        SELECT r.id, r.name, r.permissions, r.inherits, r.description
        FROM roles r 
        JOIN user_roles ur ON r.id = ur.role_id 
        WHERE ur.user_id = ?
    `
    const result = await new DTO({query, values: [userId], connection}).query();
    connection.release();
    return {...result, cacheMiss: true}
}

export async function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies['auth-at-app'];
    if (!token) {
        res.status(401).json({message: "Unauthorized"});
        return;
    }
    const sessionManager = req.app.get('sessionManager') as SessionManager;

    const session = await sessionManager.validateSession(token);

    if (session === null) {
        res.status(401).json({message: "Unauthorized"});
        return;
    }
    // roles
    let userRoles = await getUserRoles(session.userId);
    if (!userRoles.success) {
        res.status(401).json({message: "Unauthorized"});
        return;
    }
    
    if (userRoles.data && userRoles.data.length > 0) {
        let roles = userRoles?.data.map((role) => ({ id: role.id, name: role.name, permissions: role.permissions, inherits: role.inherits, description: role.description })) as Auth.Role[];
       
        req.user = {
            id: session.userId,
            roles: roles
        };

        if (userRoles.cacheMiss) {
            rolesCache.set(session.userId, roles);
        }

    } else {
        req.user = {
            id: session.userId,
            roles: []
        };
    }

    next();
}
