/**
 * Logger Module
 */

const pino = require('pino');
const path = require('path');

/**
 * Logger class wrapper for pino
 */
class Logger {
    constructor(config = {}) {
        const options = {
            level: config.level || 'info',
            transport: config.pretty !== false ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname'
                }
            } : undefined
        };

        this.logger = pino(options);

        // Add file transport if configured
        if (config.file) {
            // File logging would be added here if needed
        }
    }

    // Delegate methods to pino logger
    trace(...args) { return this.logger.trace(...args); }
    debug(...args) { return this.logger.debug(...args); }
    info(...args) { return this.logger.info(...args); }
    warn(...args) { return this.logger.warn(...args); }
    error(...args) { return this.logger.error(...args); }
    fatal(...args) { return this.logger.fatal(...args); }

    /**
     * Create child logger with context
     */
    child(bindings) {
        return new Logger({
            logger: this.logger.child(bindings)
        });
    }
}

module.exports = Logger;