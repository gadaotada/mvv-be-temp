import { rbacEvents } from './events';
import {RBACManager} from './RBACManager';

export class RoleService {
    constructor(private readonly rbac: RBACManager) {}

    async updateRole(role: Auth.Role): Promise<boolean> {
        const result = await this.rbac.updateRole(role);
        if (result) {
            rbacEvents.emit('role:updated', role.id);
            return true;
        }
        return false;
    }

    async createRole(role: Auth.Role): Promise<number> {
        const [result, error] = await this.rbac.createRole(role);
        if (error !== null) {
            throw error;
        }
        rbacEvents.emit('role:created', result);
        return result;
    }
} 