export enum LogLevel {
    VERBOSE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    NONE = 5
}

export class Logger {
    private static instance: Logger;
    private logLevel: LogLevel = LogLevel.INFO;
    
    private constructor() {}
    
    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    setLogLevel(level: LogLevel): void {
        console.error(`Setting log level to ${level}`);
        this.logLevel = level;
    }

    verbose(message: string, ...args: unknown[]): void {
        if (this.logLevel <= LogLevel.VERBOSE) {
            console.log(`%c[VERBOSE] ${message}`, 'color: #000', ...args);
        }
    }

    debug(message: string, ...args: unknown[]): void {
        if (this.logLevel <= LogLevel.DEBUG) {
            console.log(`%c[DEBUG] ${message}`, 'color: #666', ...args);
        }
    }

    info(message: string, ...args: unknown[]): void {
        if (this.logLevel <= LogLevel.INFO) {
            console.log(`%c[INFO] ${message}`, 'color: #0066FF', ...args);
        }
    }

    warn(message: string, ...args: unknown[]): void {
        if (this.logLevel <= LogLevel.WARN) {
            console.log(`%c[WARN] ${message}`, 'color: #FF9900', ...args);
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