import { DefaultLogger } from "./levels/default-log";
import { DatabaseLogger } from "./levels/database-log";
import { FileLogger } from "./levels/file-log";
import { ExternalLogger } from "./levels/external-log";
import { Connection, PoolConnection } from "mysql2/promise";

export default class Logger {
    private static instance: Logger
    private defaultLogger?: DefaultLogger
    private fileLogger?: FileLogger
    private dbLogger?: DatabaseLogger
    private externalLogger?: ExternalLogger

    private constructor(settings: Logging.LoggingConfigSettings) {
        if (!Logger.instance) {
            this.updateLoggers(settings);
        }
    }

    public static createInstance(settings: Logging.LoggingConfigSettings): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(settings);
        }
        return Logger.instance;
    }
    /**
    * Update the loggers based on the provided settings
    * @param settings - Partial configuration settings for loggers
    */
    public updateLoggers(settings: Partial<Logging.LoggingConfigSettings>) {
        if (!settings.enabled) {
            this.disableAllLoggers();
            return;
        }

        const loggerConfigs = {
            appLevel: settings.appLevel,
            databaseLevel: settings.databaseLevel,
            fileLevel: settings.fileLevel,
            externalLevel: settings.externalLevel
        };

        Object.entries(loggerConfigs).forEach(([key, config]) => {
            if (!config?.enabled) {
                this.disableLogger(key as keyof typeof loggerConfigs);
                return;
            }

            switch (key) {
                case "appLevel":
                    this.defaultLogger = new DefaultLogger();
                    break;
                case "databaseLevel":
                    if ('table' in config) {
                        this.dbLogger = new DatabaseLogger(config.table);
                    }
                    break;
                case "fileLevel":
                    if ('dir' in config && 'prefix' in config) {
                        this.fileLogger = new FileLogger(
                            config.dir, 
                            config.prefix,
                            config.maxFileSize,
                            config.maxFiles
                        );
                    }
                    break;
                case "externalLevel":
                    if ('endPoint' in config) {
                        this.externalLogger = new ExternalLogger(config.endPoint);
                    }
                    break;
            }
        });
    }

    /**
    * Disable a specific logger
    * @param type - The type of logger to disable
    */
    private disableLogger(type: keyof Logging.LoggingConfigSettings) {
        switch (type) {
            case 'appLevel':
                this.defaultLogger = undefined;
                break;
            case 'databaseLevel':
                this.dbLogger = undefined;
                break;
            case 'fileLevel':
                if (this.fileLogger) {
                    this.fileLogger.destroy(); // Clean up file streams
                    this.fileLogger = undefined;
                }
                break;
            case 'externalLevel':
                this.externalLogger = undefined;
                break;
        }
    }

    /**
    * Disable all loggers
    */
    private disableAllLoggers() {
        this.defaultLogger = undefined;
        this.dbLogger = undefined;
        if (this.fileLogger) {
            this.fileLogger.destroy();
            this.fileLogger = undefined;
        }
        this.externalLogger = undefined;
    }

    /**
    * Log a message to the appropriate logger
    * @param data - The data to log
    * @param type - The type of log (info, error, warning, debug)
    * @param connection - Optional connection object for database logger
    */
    public log<T = unknown>(data: T, type: Logging.LogLevel = 'info', connection?: PoolConnection | Connection): void {

        this.defaultLogger?.log(data, type);
        this.fileLogger?.log(data);
        
        // Database and external loggers can optionally use async but fire-and-forget for now :)
        if (this.dbLogger && connection) {
            this.dbLogger.log(data, connection).catch(() => {});
        }
        if (this.externalLogger) {
            this.externalLogger.log(data).catch(() => {});
        }
    }
}