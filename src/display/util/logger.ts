export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

export class Logger {
    private static instance: Logger;
    private logLevel: LogLevel = LogLevel.WARN;
    
    private constructor() {}
    
    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    setLogLevel(level: LogLevel): void {
        console.log(`Setting log level to ${level}`);
        this.logLevel = level;
    }

    debug(message: string, ...args: unknown[]): void {
        if (this.logLevel <= LogLevel.DEBUG) {
            console.debug(`%c[DEBUG] ${message}`, 'color: #666', ...args);
        }
    }

    info(message: string, ...args: unknown[]): void {
        if (this.logLevel <= LogLevel.INFO) {
            console.info(`%c[INFO] ${message}`, 'color: #0066FF', ...args);
        }
    }

    warn(message: string, ...args: unknown[]): void {
        if (this.logLevel <= LogLevel.WARN) {
            console.warn(`%c[WARN] ${message}`, 'color: #FF9900', ...args);
        }
    }

    error(message: string, ...args: unknown[]): void {
        if (this.logLevel <= LogLevel.ERROR) {
            console.error(`%c[ERROR] ${message}`, 'color: #FF0000', ...args);
        }
    }

    // Useful for performance critical sections
    isDebugEnabled(): boolean {
        return this.logLevel <= LogLevel.DEBUG;
    }
}

// Export a singleton instance
export const logger = Logger.getInstance(); 