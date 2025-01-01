declare namespace Auth {
    interface Session {
        id: string;
        userId: string;
        accessToken: string;
        accessTokenExpiresAt: Date;
    }

    type Algorithm =
    | "HS256"
    | "HS384"
    | "HS512"
    | "RS256"
    | "RS384"
    | "RS512"
    | "ES256"
    | "ES384"
    | "ES512"
    | "PS256"
    | "PS384"
    | "PS512"
    | "none";

    interface AuthConfig {
        tokenExpiration: number // in minutes example 15 / 30 / 120
        tokenLength: number
        tokenAlgorithm: Algorithm
        cacheCleanupInterval: number;
    }

    // RBAC
    type Resource = string | '*';
    type Action = 'create' | 'read' | 'update' | 'delete' | '*';
    type Scope = 'own' | 'any' | '*';

    type Permission = `${Resource}:${Action}:${Scope}` | '*';
    
    interface Role {
        id: number;
        name: string;
        permissions: Permission[];
        inherits: string[];
        description: string;
    }

    interface RoleCreateDTO extends Omit<Role, 'id'> {}
    
    interface RoleUpdateDTO extends Partial<Role> {
        id: number;
    }

    type RBACEventType = 
        | 'role:created' 
        | 'role:updated'
        | 'role:deleted'
        | 'permissions:updated'
        | 'cache:cleared';

    interface RBACEvent {
        type: RBACEventType;
        payload: any;
        timestamp: number;
    }
}