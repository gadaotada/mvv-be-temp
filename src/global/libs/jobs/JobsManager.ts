import { validate, ScheduledTask, schedule } from 'node-cron';
import { parseExpression } from 'cron-parser';
import { glob } from 'glob';
import { AppLogger } from '../../logging';
import { jobRegistry } from './decorators';

/**
 * System for managing jobs
 * @class JobsManager
 */
export default class JobsManager {
    /**
     * @private instance - The singleton instance of JobsManager
     * @private jobs - The map of managed jobs
     * @private logger - The logger for the job system
     * @private enabled - Whether the job system is enabled
     */
    private static instance: JobsManager;
    private jobs: Map<string, Jobs.ManagedJob>;
    private logger: AppLogger;
    private enabled: boolean;

    private constructor(logger: AppLogger, config: Jobs.JobsConfigSettings) {
        this.jobs = new Map();
        this.logger = logger;
        this.enabled = config.enabled;
    }

    /**
     * Get the singleton instance of JobsManager
     * @param logger - The logger for the job system
     * @returns {JobsManager} The singleton instance
     */
    public static getInstance(logger: AppLogger, config: Jobs.JobsConfigSettings): JobsManager {
        if (!JobsManager.instance) {
            JobsManager.instance = new JobsManager(logger, config);
        }
        return JobsManager.instance;
    }
    
    /**
     * Wraps a job execution in a try-catch block and updates job status
     * @param jobName - The name of the job
     * @param task - The task to execute
     * @returns {() => Promise<void>} The wrapped job execution function
     */
    private wrapJobExecution(
        jobName: string, 
        task: () => Promise<void> | void
    ): () => Promise<void> {
        return async () => {
            const job = this.jobs.get(jobName);
            if (!job) {
                return;
            }

            job.status.isRunning = true;
            job.status.lastRun = new Date();

            try {
                await Promise.resolve(task());
                job.status.successCount++;
                job.status.lastError = null;
            } catch (error) {
                job.status.errorCount++;
                job.status.lastError = error as Error;
                this.logger.log({
                    message: `Job ${jobName} failed`,
                    jobStatus: job.status
                }, 'error');
            } finally {
                job.status.isRunning = false;
            }
        };
    }

    /**
     * Loads jobs from task files
     * @returns {Promise<void>} - A promise that resolves when jobs are loaded
     */
    public async loadTasks(): Promise<void> {
        if (!this.enabled) {
            this.logger.log('Cron jobs are disabled in config', 'warn');
            return;
        }
        try {
            const taskFiles = await glob('src/**/core/tasks.ts', {
                ignore: ['node_modules/**'],
            });
            this.logger.log(`Current time: ${new Date().toLocaleString()} Found ${taskFiles.length} task files`, 'info');
            for (const file of taskFiles) {
                try {
                    this.logger.log(`Loading tasks from: ${file}`, 'info');
                    await import(`${process.cwd()}/${file}`);
                } catch (error) {
                    this.logger.log(`Error loading tasks from ${file}: ${error}`, 'error');
                }
            }

            jobRegistry.forEach(({ target, metadata }, key) => {
                this.logger.log(`Registering job: ${metadata.name}`, 'info');
                this.scheduleJob(
                    metadata.name,
                    metadata.cronExpression,
                    target[key].bind(target)
                );
            });
        } catch (error) {
            this.logger.log(`Error loading task files: ${error}`, 'error');
        }
    }

    /**
     * Schedules a job with the given cron expression and task
     * @param jobName - The name of the job
     * @param cronExpression - The cron expression for the job
     * @param task - The task to execute
     * @returns {boolean} - True if the job is scheduled successfully, false otherwise
     */
    public scheduleJob(
        jobName: string, 
        cronExpression: string, 
        task: () => Promise<void> | void
    ): boolean {
        try {
            if (this.jobs.has(jobName)) {
                this.logger.log(`Job ${jobName} already exists. Skipping.`, 'warn');
                return false;
            }

            if (!validate(cronExpression)) {
                this.logger.log(`Invalid cron expression: ${cronExpression}`, 'error');
                return false;
            }

            const wrappedTask = this.wrapJobExecution(jobName, task);
            const cronTask = schedule(cronExpression, wrappedTask);
            const nextRun = parseExpression(cronExpression).next().toDate();
            this.logger.log({
                message: `Job ${jobName} scheduled successfully`,
                nextRun: nextRun.toLocaleString(),
                cronExpression
            }, 'info');

            this.jobs.set(jobName, {
                task: cronTask,
                status: {
                    lastRun: null,
                    lastError: null,
                    isRunning: false,
                    successCount: 0,
                    errorCount: 0
                },
                metadata: {
                    name: jobName,
                    cronExpression
                }
            });

            this.logger.log(`Job ${jobName} scheduled successfully`, 'info');
            return true;
        } catch (error) {
            this.logger.log(`Error scheduling job ${jobName}: ${error}`, 'error');
            return false;
        }
    }

    /**
     * Stops a job by its name
     * @param jobName - The name of the job to stop
     * @returns {boolean} - True if the job is stopped successfully, false otherwise
     */
    public stopJob(jobName: string): boolean {
        const job = this.jobs.get(jobName);
        if (!job) {
            this.logger.log(`Job ${jobName} not found`, 'warn');
            return false;
        }

        if (job.status.isRunning) {
            this.logger.log(`Job ${jobName} is currently running, marking for stop`, 'warn');
        }

        job.task.stop();
        this.jobs.delete(jobName);
        this.logger.log(`Job ${jobName} stopped successfully`, 'info');

        return true;
    }

    /**
     * Retrieves the status of a job by its name
     * @param jobName - The name of the job
     * @returns {Jobs.JobStatus | null} - The status of the job or null if not found
     */
    public getJobStatus(jobName: string): Jobs.JobStatus | null {
        return this.jobs.get(jobName)?.status || null;
    }

    /**
     * Retrieves the status of all jobs
     * @returns {Record<string, Jobs.JobStatus>} - A map of job names to their statuses
     */
    public getAllJobsStatus(): Record<string, Jobs.JobStatus> {
        const statuses: Record<string, Jobs.JobStatus> = {};
        this.jobs.forEach((job, name) => {
            statuses[name] = job.status;
        });
        return statuses;
    }

    /**
     * Lists all jobs with their metadata and status
     * @returns {Array<{ name: string; cronExpression: string; status: Jobs.JobStatus }>} - An array of job details
     */
    public listJobs(): Array<{ name: string; cronExpression: string; status: Jobs.JobStatus }> {
        return Array.from(this.jobs.entries()).map(([_, job]) => ({
            name: job.metadata.name,
            cronExpression: job.metadata.cronExpression,
            status: job.status
        }));
    }

    /**
     * Stops all jobs
     * @returns {void}
     */
    public stopAllJobs(): void {
        this.jobs.forEach((job, jobName) => {
            job.task.stop();
            this.logger.log(`Job ${jobName} stopped`, 'info');
        });
        this.jobs.clear();
    }
}
