/**
 * Alert Manager Module
 */

const EventEmitter = require('events');

class AlertManager extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = config;
        this.logger = config.logger;
        this.alerts = new Map();
        this.notifiers = [];
        this.alertHistory = [];
        this.maxAlerts = config.maxAlerts || 100;
        this.cooldown = config.cooldown || 3600000; // 1 hour
        this.lastAlertTimes = new Map();
    }

    /**
     * Add a notifier
     */
    addNotifier(notifier) {
        this.notifiers.push(notifier);
    }

    /**
     * Add an alert
     */
    async addAlert(alertConfig) {
        const alertId = alertConfig.id || uuidv4();

        const alert = {
            id: alertId,
            symbol: alertConfig.symbol,
            price: alertConfig.price,
            type: alertConfig.type || 'above',
            status: 'active',
            created: new Date(),
            ...alertConfig
        };

        // Check max alerts
        if (this.alerts.size >= this.maxAlerts) {
            throw new Error(`Maximum number of alerts (${this.maxAlerts}) reached`);
        }

        this.alerts.set(alertId, alert);
        this.emit('alert_created', alert);

        return alert;
    }

    /**
     * Remove an alert
     */
    async removeAlert(alertId) {
        if (this.alerts.has(alertId)) {
            const alert = this.alerts.get(alertId);
            this.alerts.delete(alertId);
            this.emit('alert_removed', alert);
            return true;
        }
        return false;
    }

    /**
     * Get all alerts
     */
    getAlerts(filter = {}) {
        let alerts = Array.from(this.alerts.values());

        if (filter.symbol) {
            alerts = alerts.filter(a => a.symbol === filter.symbol);
        }

        if (filter.status) {
            alerts = alerts.filter(a => a.status === filter.status);
        }

        if (filter.type) {
            alerts = alerts.filter(a => a.type === filter.type);
        }

        return alerts;
    }

    /**
     * Check if alert should trigger
     */
    checkAlert(alert, currentPrice) {
        if (alert.status !== 'active') return false;

        const shouldTrigger =
            (alert.type === 'above' && currentPrice >= alert.price) ||
            (alert.type === 'below' && currentPrice <= alert.price) ||
            (alert.type === 'cross' &&
                ((alert.lastPrice < alert.price && currentPrice >= alert.price) ||
                 (alert.lastPrice > alert.price && currentPrice <= alert.price)));

        alert.lastPrice = currentPrice;

        return shouldTrigger;
    }

    /**
     * Process price update
     */
    async processPriceUpdate(symbol, price) {
        const alerts = this.getAlerts({ symbol, status: 'active' });

        for (const alert of alerts) {
            if (this.checkAlert(alert, price)) {
                // Check cooldown
                const lastAlertKey = `${alert.symbol}-${alert.type}-${alert.price}`;
                const lastAlertTime = this.lastAlertTimes.get(lastAlertKey);

                if (lastAlertTime && Date.now() - lastAlertTime < this.cooldown) {
                    continue; // Skip due to cooldown
                }

                // Trigger alert
                alert.status = 'triggered';
                alert.triggeredAt = new Date();
                alert.triggeredPrice = price;

                // Record trigger time
                this.lastAlertTimes.set(lastAlertKey, Date.now());

                // Add to history
                this.alertHistory.push({
                    ...alert,
                    triggeredAt: new Date()
                });

                // Keep only last 100 in history
                if (this.alertHistory.length > 100) {
                    this.alertHistory.shift();
                }

                // Emit event
                this.emit('alert_triggered', alert);

                // Send notifications
                await this.sendAlert(alert);

                // Reset alert if it's repeating
                if (alert.repeat) {
                    alert.status = 'active';
                }
            }
        }
    }

    /**
     * Send alert to all notifiers
     */
    async sendAlert(alert) {
        const message = this.formatAlertMessage(alert);

        for (const notifier of this.notifiers) {
            try {
                await notifier.send({
                    ...alert,
                    message
                });
            } catch (error) {
                if (this.logger) {
                    this.logger.error('Failed to send alert:', error);
                }
            }
        }
    }

    /**
     * Format alert message
     */
    formatAlertMessage(alert) {
        const emoji = alert.type === 'above' ? '📈' : '📉';
        return `${emoji} ${alert.symbol} ${alert.type} $${alert.price} (current: $${alert.triggeredPrice})`;
    }

    /**
     * Get alert statistics
     */
    getStatistics() {
        const stats = {
            total: this.alerts.size,
            active: this.getAlerts({ status: 'active' }).length,
            triggered: this.getAlerts({ status: 'triggered' }).length,
            bySymbol: {},
            recentTriggers: this.alertHistory.slice(-10)
        };

        // Count by symbol
        for (const alert of this.alerts.values()) {
            stats.bySymbol[alert.symbol] = (stats.bySymbol[alert.symbol] || 0) + 1;
        }

        return stats;
    }

    /**
     * Clear triggered alerts
     */
    clearTriggered() {
        const triggered = this.getAlerts({ status: 'triggered' });
        triggered.forEach(alert => {
            this.alerts.delete(alert.id);
        });
        return triggered.length;
    }
}

// Generate a simple UUID (simplified version)
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

module.exports = AlertManager;