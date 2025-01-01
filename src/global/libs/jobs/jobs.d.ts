declare namespace Jobs {
    interface JobsConfigSettings {
        enabled: boolean;
    }

    interface JobMetadata {
        name: string;
        cronExpression: string;
        description?: string;
    }

    interface JobStatus {
        lastRun: Date | null;
        lastError: Error | null;
        isRunning: boolean;
        successCount: number;
        errorCount: number;
    }

    interface ManagedJob {
        task: import('node-cron').ScheduledTask;
        status: JobStatus;
        metadata: {
            name: string;
            cronExpression: string;
        };
    }
}
