import { Pool } from 'mysql2/promise';
import { rbacEvents } from './events';
import { DTO } from '../../database';
import { AppError } from '../../errors';
import type { CustomError } from '../../errors/ErrorManager';

export class RBACManager {
    private static instance: RBACManager | null = null;
    private roles: Map<number, Auth.Role>;
    private permissionCache: Map<number, Set<Auth.Permission>>;
    private readonly dbConnection: Pool;

    private constructor(initialRoles: Auth.Role[], dbConnection: Pool) {
        this.roles = new Map(initialRoles.map(role => [role.id, role]));
        this.permissionCache = new Map();
        this.dbConnection = dbConnection;
        this.initializeEventListeners();
    }

    public static getInstance(roles: Auth.Role[], dbConnection: Pool): RBACManager {
        if (!this.instance) {
            this.instance = new RBACManager(roles, dbConnection);
        }
        return this.instance;
    }

    private initializeEventListeners(): void {
        rbacEvents.on('role:updated', () => this.clearPermissionCache());
        rbacEvents.on('role:created', () => this.clearPermissionCache());
        rbacEvents.on('role:deleted', () => this.clearPermissionCache());
        rbacEvents.on('permissions:updated', () => this.clearPermissionCache());
    }

    private clearPermissionCache(): void {
        this.permissionCache.clear();
        rbacEvents.emit('cache:cleared', null);
    }

    private async calculateRolePermissions(roleId: number): Promise<Set<Auth.Permission>> {
        const role = this.roles.get(roleId);
        if (!role) {
            return new Set();
        }

        const permissions = new Set(role.permissions);

        // Handle inheritance recursively
        for (const inheritedRoleName of role.inherits) {
            const inheritedRole = Array.from(this.roles.values())
                .find(r => r.name === inheritedRoleName);
            
            if (inheritedRole) {
                const inheritedPermissions = await this.calculateRolePermissions(inheritedRole.id);
                inheritedPermissions.forEach(p => permissions.add(p));
            }
        }

        return permissions;
    }

    public async hasPermission(roleId: number, permission: Auth.Permission): Promise<boolean> {
        if (!this.permissionCache.has(roleId)) {
            const permissions = await this.calculateRolePermissions(roleId);
            this.permissionCache.set(roleId, permissions);
        }

        const permissions = this.permissionCache.get(roleId)!;
        return permissions.has('*') || permissions.has(permission);
    }

    public async createRole(roleData: Auth.RoleCreateDTO): Promise<AppTypes.Result<number, CustomError>> {
        const connection = await this.dbConnection.getConnection();
        try {
            const query = `
                INSERT INTO roles (name, permissions, inherits, description) 
                VALUES (?, ?, ?, ?)
            `;
            const values = [
                roleData.name,
                JSON.stringify(roleData.permissions),
                JSON.stringify(roleData.inherits),
                roleData.description
            ];

            const result = await new DTO({
                query,
                values,
                connection
            }).query();

            if (!result.success || !result.metadata?.insertId) {
                return [null, AppError.create('Failed to create role', {
                    type: "Auth",
                    code: "FAILED_TO_CREATE_ROLE",
                    severity: "Medium",
                    data: result.error
                })];
            }

            const newRole: Auth.Role = {
                id: result.metadata.insertId,
                ...roleData
            };

            this.roles.set(newRole.id, newRole);
            rbacEvents.emit('role:created', newRole);

            return [newRole.id, null];
        } finally {
            connection.release();
        }
    }

    public async updateRole(roleData: Auth.RoleUpdateDTO): Promise<AppTypes.Result<boolean, CustomError>> {
        const connection = await this.dbConnection.getConnection();
        try {
            const query = `
                UPDATE roles 
                SET 
                    name = COALESCE(?, name),
                    permissions = COALESCE(?, permissions),
                    inherits = COALESCE(?, inherits),
                    description = COALESCE(?, description)
                WHERE id = ?
            `;
            const values = [
                roleData.name,
                roleData.permissions ? JSON.stringify(roleData.permissions) : null,
                roleData.inherits ? JSON.stringify(roleData.inherits) : null,
                roleData.description,
                roleData.id
            ];

            const result = await new DTO({
                query,
                values,
                connection
            }).query();

            if (!result.success) {
                return [null, AppError.create('Failed to update role', {
                    type: "Auth",
                    code: "FAILED_TO_UPDATE_ROLE",
                    severity: "Medium",
                    data: result.error
                })];
            }

            const existingRole = this.roles.get(roleData.id);
            if (existingRole) {
                const updatedRole = {
                    ...existingRole,
                    ...roleData
                };
                this.roles.set(roleData.id, updatedRole);
                rbacEvents.emit('role:updated', updatedRole);
            }

            return [true, null];
        } finally {
            connection.release();
        }
    }

    public async deleteRole(roleId: number): Promise<AppTypes.Result<boolean, CustomError>> {
        const connection = await this.dbConnection.getConnection();
        try {
            const query = 'DELETE FROM roles WHERE id = ?';
            const result = await new DTO({
                query,
                values: [roleId],
                connection
            }).query();

            if (!result.success) {
                return [null, AppError.create('Failed to delete role', {
                    type: "Auth",
                    code: "FAILED_TO_DELETE_ROLE",
                    severity: "Medium",
                    data: result.error
                })];
            }

            this.roles.delete(roleId);
            rbacEvents.emit('role:deleted', roleId);

            return [true, null];
        } finally {
            connection.release();
        }
    }
} 