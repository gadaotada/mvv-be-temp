import { createPool } from "mysql2/promise";
import { DB_HOST, DB_NAME, DB_PASS, DB_USER } from "../config";

export const pool = createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    multipleStatements: true,
    waitForConnections: true,
    queueLimit: 0,
    idleTimeout: 10000
})