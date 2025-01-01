import { DTO, pool } from "../../../global/database";
import { RegisterSettings, NewUser } from "./types";

export async function createUser(user: NewUser, regSettings: RegisterSettings, activationToken?: string) {
    const connection = await pool.getConnection();
    try {
        /* let baseQuery = `
            INSERT INTO users (email, password, name, active) VALUES (?, ?, ?, ?, ?);
            INSERT INTO user_roles (user_id, role_id) VALUES (?, ?);
            `;
        let baseValues = [regSettings.newUserId, user.email, regSettings.hashPassword, user.name, user.active, regSettings.newUserId, regSettings.defaultRoleId];

        if (!user.active && activationToken) {
            baseQuery += `
                INSERT INTO activation_tokens (user_id, token, expires_at) VALUES (?, ?, ?);
            `;
            // should expire in 1h
            const expirationDate = (new Date(Date.now() + 1000 * 60 * 60)).toISOString();
            baseValues.push(regSettings.newUserId, activationToken, expirationDate);
        }
        const result = await new DTO({query: baseQuery, values: baseValues, connection}).query();
        return result; */

        const usersQuery = `INSERT INTO users (email, password, name, active) VALUES (?, ?, ?, ?);`;
        const userValues = [user.email, regSettings.hashPassword, user.name, user.active];
        const result = await new DTO({query: usersQuery, values: userValues, connection}).query();
        if (!result.success || !result.metadata) {
            return result;
        }

        const userRolesQuery = `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?);`;
        const userRolesValues = [result.metadata.insertId, regSettings.defaultRoleId];
        const userRolesResult = await new DTO({query: userRolesQuery, values: userRolesValues, connection}).query();
        if (!userRolesResult.success) {
            return userRolesResult
        }

        if (!user.active && activationToken) {
            const activationTokenQuery = `INSERT INTO activation_tokens (user_id, token, expires_at) VALUES (?, ?, ?);`;
            const activationTokenValues = [result.metadata.insertId, activationToken, (new Date(Date.now() + 1000 * 60 * 60)).toISOString()];
            const activationTokenResult = await new DTO({query: activationTokenQuery, values: activationTokenValues, connection}).query();
            if (!activationTokenResult.success) {
                return activationTokenResult
            }
        }

        return result;
    } finally {
        connection.release();
    }
}

export async function getUserIdByEmail(email: string) {
    const connection = await pool.getConnection();
    try {
        const query = 'SELECT id FROM users WHERE email = ?';
        const values = [email];
        const result = await new DTO({query, values, connection}).query();
        return result;
    } finally {
        connection.release();
    }
}

export async function getUserByEmail(email: string) {
    const connection = await pool.getConnection();
    try {
        const query = 'SELECT u.id, u.email, u.name, u.password, r.id as roleId, r.name as roleName FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id LEFT JOIN roles r ON ur.role_id = r.id WHERE u.email = ? AND u.active = 1';
        const values = [email];
        const result = await new DTO({query, values, connection}).query();
        return result;
    } finally {
        connection.release();
    }
}

export async function getActivationToken(token: string) {
    const connection = await pool.getConnection();
    try {
        const query = 'SELECT id FROM activation_token WHERE token = ? AND expires_at > NOW()';
        const values = [token];
        const result = await new DTO({query, values, connection}).query();
        return result;
    } finally {
        connection.release();
    }
}

export async function activateUser(userId: string) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const query = 'UPDATE users SET active = true WHERE id = ?; DELETE FROM activation_tokens WHERE user_id = ?;';
        const values = [userId, userId];
        const result = await new DTO({query, values, connection}).query();
        await connection.commit();

        if (!result.success) {
            await connection.rollback();
            return result;
        }

        return result;
    } finally {
        connection.release();
    }
}

export async function regenerateActivationToken(userId: string, token: string) {
    const connection = await pool.getConnection();
    try {
        const expirationDate = (new Date(Date.now() + 1000 * 60 * 60)).toISOString();
        const query = 'UPDATE activation_tokens SET token = ?, expires_at = ? WHERE user_id = ?;';
        const values = [token, expirationDate, userId];

        const result = await new DTO({query, values, connection}).query();

        return result;
    } finally {
        connection.release();
    }
}

export async function cleanUnusedActivationTokens() {
    const connection = await pool.getConnection();
    try {
        const query = 'DELETE FROM activation_tokens WHERE expires_at < NOW();';
        const result = await new DTO({query, connection}).query();
        return result;
    } finally {
        connection.release();
    }
}

export async function getUserById(userId: string) {
    const connection = await pool.getConnection();
    try {
        const query = 'SELECT id, email, name, active FROM users WHERE id = ?';
        const values = [userId];
        const result = await new DTO({query, values, connection}).query();
        return result;
    } finally {
        connection.release();
    }
}
