import { rbacEvents } from './events';

export default class RoleCache {
    private static instance: RoleCache | null = null;
    private cache: Map<string, {
        roles: Auth.Role[];
        timestamp: number;
    }> = new Map();
    private readonly TTL = 5 * 60 * 1000; // 5 minutes

    private constructor() {
        this.initializeEventListeners();
    }

    private initializeEventListeners(): void {
        // Clear specific user's cache when roles are updated
        rbacEvents.on('role:updated', (event) => {
            this.invalidateByRoleId(event.payload.id);
        });

        // Clear all cache when roles are created/deleted
        rbacEvents.on('role:created', () => this.invalidateAll());
        rbacEvents.on('role:deleted', () => this.invalidateAll());
    }

    public static getInstance(): RoleCache {
        if (!RoleCache.instance) {
            RoleCache.instance = new RoleCache();
        }
        return RoleCache.instance;
    }

    public set(userId: string, roles: Auth.Role[]): void {
        this.cache.set(userId, {
            roles,
            timestamp: Date.now()
        });
    }

    public get(userId: string): Auth.Role[] | null {
        const cached = this.cache.get(userId);
        if (!cached) return null;

        // Check if cache is still valid
        if (Date.now() - cached.timestamp > this.TTL) {
            this.cache.delete(userId);
            return null;
        }

        return cached.roles;
    }

    private invalidateByRoleId(roleId: number): void {
        for (const [userId, cached] of this.cache.entries()) {
            if (cached.roles.some(role => role.id === roleId)) {
                this.cache.delete(userId);
            }
        }
    }

    public invalidate(userId: string): void {
        this.cache.delete(userId);
    }

    public invalidateAll(): void {
        this.cache.clear();
    }
}

export const rolesCache = RoleCache.getInstance();