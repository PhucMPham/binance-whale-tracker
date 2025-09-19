/**
 * Error Handler Module
 */

/**
 * Custom error types
 */
class WhaleTrackerError extends Error {
    constructor(message, code, details) {
        super(message);
        this.name = 'WhaleTrackerError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date();
    }
}

class APIError extends WhaleTrackerError {
    constructor(message, service, statusCode, response) {
        super(message, 'API_ERROR', { service, statusCode, response });
        this.name = 'APIError';
    }
}

class ConfigurationError extends WhaleTrackerError {
    constructor(message, field) {
        super(message, 'CONFIG_ERROR', { field });
        this.name = 'ConfigurationError';
    }
}

class ValidationError extends WhaleTrackerError {
    constructor(message, field, value) {
        super(message, 'VALIDATION_ERROR', { field, value });
        this.name = 'ValidationError';
    }
}

/**
 * Error handler class
 */
class ErrorHandler {
    constructor(logger) {
        this.logger = logger;
        this.errorCounts = new Map();
        this.lastErrors = [];
        this.maxLastErrors = 10;
    }

    /**
     * Handle error with appropriate logging and recovery
     */
    handleError(error, context = {}) {
        // Track error
        this.trackError(error);

        // Log error with context
        if (this.logger) {
            this.logger.error({
                error: {
                    message: error.message,
                    code: error.code,
                    stack: error.stack,
                    details: error.details
                },
                context
            });
        }

        // Determine severity and action
        const severity = this.determineSeverity(error);

        // Handle based on severity
        switch (severity) {
            case 'critical':
                this.handleCriticalError(error);
                break;
            case 'high':
                this.handleHighError(error);
                break;
            case 'medium':
                this.handleMediumError(error);
                break;
            case 'low':
                this.handleLowError(error);
                break;
        }

        // Return recovery suggestion
        return this.suggestRecovery(error);
    }

    /**
     * Track error occurrences
     */
    trackError(error) {
        const key = `${error.name}:${error.code || 'unknown'}`;
        const count = (this.errorCounts.get(key) || 0) + 1;
        this.errorCounts.set(key, count);

        // Add to last errors
        this.lastErrors.push({
            error,
            timestamp: new Date(),
            count
        });

        // Keep only last N errors
        if (this.lastErrors.length > this.maxLastErrors) {
            this.lastErrors.shift();
        }
    }

    /**
     * Determine error severity
     */
    determineSeverity(error) {
        // Critical errors
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return 'critical';
        }
        if (error instanceof ConfigurationError) {
            return 'critical';
        }

        // High severity
        if (error instanceof APIError && error.details?.statusCode >= 500) {
            return 'high';
        }
        if (error.message?.includes('API key')) {
            return 'high';
        }

        // Medium severity
        if (error instanceof APIError && error.details?.statusCode >= 400) {
            return 'medium';
        }
        if (error instanceof ValidationError) {
            return 'medium';
        }

        // Low severity
        return 'low';
    }

    /**
     * Handle critical errors
     */
    handleCriticalError(error) {
        if (this.logger) {
            this.logger.fatal('Critical error occurred - system may be unstable', error);
        }
        // Could trigger alerts or shutdown here
    }

    /**
     * Handle high severity errors
     */
    handleHighError(error) {
        if (this.logger) {
            this.logger.error('High severity error - immediate attention needed', error);
        }
    }

    /**
     * Handle medium severity errors
     */
    handleMediumError(error) {
        if (this.logger) {
            this.logger.warn('Medium severity error - monitoring required', error);
        }
    }

    /**
     * Handle low severity errors
     */
    handleLowError(error) {
        if (this.logger) {
            this.logger.info('Low severity error - logged for tracking', error);
        }
    }

    /**
     * Suggest recovery action
     */
    suggestRecovery(error) {
        // Network errors
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return {
                action: 'retry',
                delay: 5000,
                message: 'Network error - will retry connection'
            };
        }

        // API rate limits
        if (error.message?.includes('rate limit')) {
            return {
                action: 'backoff',
                delay: 60000,
                message: 'Rate limit hit - backing off'
            };
        }

        // Configuration errors
        if (error instanceof ConfigurationError) {
            return {
                action: 'stop',
                message: 'Configuration error - please check settings'
            };
        }

        // Default
        return {
            action: 'continue',
            message: 'Error logged - continuing operation'
        };
    }

    /**
     * Get error statistics
     */
    getStatistics() {
        return {
            totalErrors: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0),
            uniqueErrors: this.errorCounts.size,
            errorCounts: Object.fromEntries(this.errorCounts),
            recentErrors: this.lastErrors.slice(-5)
        };
    }

    /**
     * Clear error history
     */
    clearHistory() {
        this.errorCounts.clear();
        this.lastErrors = [];
    }
}

module.exports = ErrorHandler;
module.exports.WhaleTrackerError = WhaleTrackerError;
module.exports.APIError = APIError;
module.exports.ConfigurationError = ConfigurationError;
module.exports.ValidationError = ValidationError;