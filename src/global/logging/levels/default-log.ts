/**
* Logger for application-level messages
* @class DefaultLog
*/
export class DefaultLogger {
    /**
    * Log a message to the console/stdout/stderr
    * @param data - The data to log
    * @param type - The type of log (error, warning, info)
    */
    log<T = unknown>(data: T, type: Logging.LogLevel): void {
        const prefix = `[AppLogger]:`;
        const logData = JSON.stringify(data, (key, value) => {
            if (value instanceof Error) {
                return {
                    ...value,
                    message: value.message,
                    stack: value.stack,
                };
            }
            return value;
        }, 2);

        switch (type) {
            case "error":
                console.error(`${prefix}`, logData);
                break;
            case "warn":
                console.warn(`${prefix}`, logData);
                break;
            case "info":
                console.info(`${prefix}`, logData);
                break;
            case "debug":
                console.debug(`${prefix}`, logData);
                break;
            default:
                console.log(`${prefix}`, logData);
        }
    }
}