import { Request, Response, NextFunction } from 'express';
import { RBACManager } from '..';

type RouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<any> | any;

const permissionCheck = (permission: Auth.Permission | null, handler: RouteHandler) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Skip permission check if no permission required
            if (!permission) {
                return await handler(req, res, next);
            }

            // Check user authentication
            if (!req.user?.roles) {
                res.status(401).json({message: "Unauthorized"});
                return;
            }

            // Check permissions
            const rbac = req.app.get('rbac') as RBACManager;
            const permissionChecks = req.user.roles.map(role => 
                rbac.hasPermission(role.id, permission)
            );

            const results = await Promise.all(permissionChecks);
            const hasPermission = results.some(result => result === true);
            console.log(results);
            if (!hasPermission) {
                res.status(403).json({message: "Forbidden"});
                return;
            }

            return await handler(req, res, next);
        } catch (error) {
            next(error);
        }
    };
};

const roleCheck = (role: Auth.Role[] | null, handler: RouteHandler) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!role) {
            return await handler(req, res, next);
        }

        const userRoles = req.user?.roles;
        if (!userRoles) {
            res.status(403).json({message: "Forbidden"});
            return;
        }

        if (userRoles.some(r => role.some(allowedRole => allowedRole.name === r.name))) {
            return await handler(req, res, next);
        }

        res.status(403).json({message: "Forbidden"});
        return;
    };
}

export { permissionCheck, roleCheck };