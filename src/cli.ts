import { Command } from 'commander';
import { pool } from './global/database';
import { MigrationManager } from './global/database';
import { AppLogger } from './global/logging';

const program = new Command();
const logger = AppLogger.createInstance({
    enabled: true,
    appLevel: {
        enabled: true
    }
});

program
    .command('migrate')
    .description('Run database migrations')
    .option('-f, --file <name>', 'Run specific migration file(s)')
    .option('-p, --path <path>', 'Run migrations from specific path')
    .option('-l, --list', 'List all available migrations')
    .action(async (options) => {
        try {
            const migrationManager = new MigrationManager(pool, logger);

            if (options.list) {
                const migrations = await migrationManager.listMigrations();
                logger.log('Available migrations:', 'info');
                migrations.forEach(m => {
                    logger.log(`${m.name} - ${m.executed ? 'Executed' : 'Pending'}`, 'info');
                });
                process.exit(0);
            }

            if (options.file) {
                await migrationManager.migrate({
                    specificFile: options.file,
                    specificPath: options.path
                });
            } else if (options.path) {
                await migrationManager.migrate({
                    specificPath: options.path
                });
            } else {
                await migrationManager.migrate();
            }

            logger.log('Migration completed successfully', 'info');
            process.exit(0);
        } catch (error) {
            logger.log(`Migration failed: ${error}`, 'error');
            process.exit(1);
        }
    });

program.parse(process.argv); 

//npm run migrate -- -f 001_rbac_default_roles.sql
//npm run migrate -- -f 001_auth_default_users.sql