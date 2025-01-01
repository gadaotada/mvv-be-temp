import { Pool } from 'mysql2/promise';
import { readFile } from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { DTO } from '../database';
import type { AppLogger } from '../logging';

interface MigrationOptions {
    specificFile?: string;
    specificPath?: string;
}

interface MigrationInfo {
    name: string;
    path: string;
    executed: boolean;
}

export default class MigrationManager {
    constructor(
        private readonly pool: Pool,
        private readonly logger: AppLogger
    ) {}

    private async ensureMigrationTable(): Promise<void> {
        const connection = await this.pool.getConnection();
        try {
            const query = `
                CREATE TABLE IF NOT EXISTS migrations (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;
            await new DTO({ query, connection }).query();
        } finally {
            connection.release();
        }
    }

    private async getExecutedMigrations(): Promise<string[]> {
        const connection = await this.pool.getConnection();
        try {
            const query = 'SELECT name FROM migrations ORDER BY id ASC';
            const result = await new DTO({ query, connection }).query();
            if (!result.success) {
                return [];
            }
            return result.data?.map(row => row.name) || [];
        } finally {
            connection.release();
        }
    }

    public async listMigrations(): Promise<MigrationInfo[]> {
        await this.ensureMigrationTable();
        const executedMigrations = await this.getExecutedMigrations();
        
        const migrationFiles = await glob('src/**/migrations/*.sql', {
            ignore: 'node_modules/**'
        });

        return migrationFiles.map(filePath => ({
            name: path.basename(filePath),
            path: filePath,
            executed: executedMigrations.includes(path.basename(filePath))
        }));
    }

    private async markMigrationAsExecuted(name: string): Promise<void> {
        const connection = await this.pool.getConnection();
        try {
            const query = 'INSERT INTO migrations (name) VALUES (?)';
            await new DTO({ query, values: [name], connection }).query();
        } finally {
            connection.release();
        }
    }

    public async migrate(options: MigrationOptions = {}): Promise<void> {
        await this.ensureMigrationTable();
        const executedMigrations = await this.getExecutedMigrations();

        let migrationFiles = await glob('src/**/migrations/*.sql', {
            ignore: 'node_modules/**'
        });

        // Filter by specific path if provided
        if (options.specificPath) {
            migrationFiles = migrationFiles.filter(file => 
                file.includes(options.specificPath!)
            );
        }

        // Filter by specific file if provided
        if (options.specificFile) {
            migrationFiles = migrationFiles.filter(file => 
                path.basename(file).includes(options.specificFile!)
            );
        }

        if (migrationFiles.length === 0) {
            this.logger.log('No migration files found matching criteria', 'warn');
            return;
        }

        // Sort files to ensure consistent order
        migrationFiles.sort();

        for (const filePath of migrationFiles) {
            const migrationName = path.basename(filePath);
            
            if (executedMigrations.includes(migrationName)) {
                this.logger.log(`Migration ${migrationName} already executed, skipping...`, 'info');
                continue;
            }

            this.logger.log(`Executing migration ${migrationName}...`, 'info');
            
            const connection = await this.pool.getConnection();
            try {
                await connection.beginTransaction();

                const sql = await readFile(filePath, 'utf-8');
                const statements = sql.split(';').filter(stmt => stmt.trim());

                for (const statement of statements) {
                    if (statement.trim()) {
                        await connection.query(statement);
                    }
                }

                await this.markMigrationAsExecuted(migrationName);
                await connection.commit();
                
                this.logger.log(`Successfully executed migration ${migrationName}`, 'info');
            } catch (error) {
                await connection.rollback();
                this.logger.log(`Failed to execute migration ${migrationName}: ${error}`, 'error');
                throw error;
            } finally {
                connection.release();
            }
        }
    }
}
