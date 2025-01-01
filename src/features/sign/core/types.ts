
export interface NewUser {
    id?: string;
    email: string;
    password: string;
    name: string;
    active?: boolean;
}

export interface RegisterSettings {
    defaultRoleId: number;
    hashPassword: string;
}

export interface AppUser {
    id: string;
    name: string;
    email: string;
    active: boolean;
}

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    roles: Auth.Role[];
    token: string;
    expiresAt: number;
}

