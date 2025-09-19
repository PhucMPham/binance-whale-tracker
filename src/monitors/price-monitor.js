/**
 * Price Monitor Module
 */

const EventEmitter = require('events');

class PriceMonitor extends EventEmitter {
    constructor(config = {}) {
        super();
        this.binance = config.binance;
        this.logger = config.logger;
        this.config = config;
        this.activeMonitors = new Map();
        this.priceHistory = new Map();
        this.alerts = new Map();
    }

    /**
     * Start monitoring prices
     */
    async startMonitoring(symbol, options = {}) {
        const updateInterval = options.updateInterval || this.config.updateInterval || 5000;

        if (this.activeMonitors.has(symbol)) {
            return;
        }

        // Initialize price history
        if (!this.priceHistory.has(symbol)) {
            this.priceHistory.set(symbol, []);
        }

        const monitorInterval = setInterval(async () => {
            try {
                const price = await this.getCurrentPrice(symbol);
                const history = this.priceHistory.get(symbol);

                // Add to history
                history.push({
                    price,
                    timestamp: new Date()
                });

                // Keep only last 100 prices
                if (history.length > 100) {
                    history.shift();
                }

                // Emit price update
                this.emit('price_update', {
                    symbol,
                    price,
                    change: this.calculateChange(symbol),
                    timestamp: new Date()
                });

                // Check alerts
                this.checkAlerts(symbol, price);

                // Check for significant movements
                this.checkSignificantMovements(symbol, price);

            } catch (error) {
                if (this.logger) {
                    this.logger.error('Price monitoring error:', error);
                }
            }
        }, updateInterval);

        this.activeMonitors.set(symbol, monitorInterval);

        // Get initial price
        const initialPrice = await this.getCurrentPrice(symbol);
        this.emit('monitoring_started', { symbol, price: initialPrice });
    }

    /**
     * Stop monitoring
     */
    async stopMonitoring(symbol) {
        if (this.activeMonitors.has(symbol)) {
            clearInterval(this.activeMonitors.get(symbol));
            this.activeMonitors.delete(symbol);
            this.emit('monitoring_stopped', { symbol });
        }
    }

    /**
     * Get current price
     */
    async getCurrentPrice(symbol) {
        if (this.binance) {
            try {
                return await this.binance.getPrice(symbol);
            } catch (error) {
                return this.getMockPrice(symbol);
            }
        }
        return this.getMockPrice(symbol);
    }

    /**
     * Add price alert
     */
    addAlert(symbol, price, type = 'above', options = {}) {
        const alertId = `${symbol}-${price}-${type}-${Date.now()}`;

        const alert = {
            id: alertId,
            symbol,
            price,
            type,
            status: 'active',
            created: new Date(),
            ...options
        };

        if (!this.alerts.has(symbol)) {
            this.alerts.set(symbol, []);
        }

        this.alerts.get(symbol).push(alert);
        return alert;
    }

    /**
     * Remove alert
     */
    removeAlert(alertId) {
        for (const [symbol, alerts] of this.alerts.entries()) {
            const index = alerts.findIndex(a => a.id === alertId);
            if (index !== -1) {
                alerts.splice(index, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * Check alerts
     */
    checkAlerts(symbol, currentPrice) {
        const alerts = this.alerts.get(symbol);
        if (!alerts) return;

        alerts.forEach(alert => {
            if (alert.status !== 'active') return;

            const triggered = (alert.type === 'above' && currentPrice >= alert.price) ||
                           (alert.type === 'below' && currentPrice <= alert.price);

            if (triggered) {
                alert.status = 'triggered';
                alert.triggeredAt = new Date();
                alert.triggeredPrice = currentPrice;

                this.emit('price_alert', {
                    ...alert,
                    currentPrice,
                    message: `${symbol} ${alert.type} $${alert.price} (current: $${currentPrice})`
                });
            }
        });
    }

    /**
     * Check for significant price movements
     */
    checkSignificantMovements(symbol, currentPrice) {
        const history = this.priceHistory.get(symbol);
        if (!history || history.length < 2) return;

        // Check 1-minute change
        const oneMinuteAgo = history[Math.max(0, history.length - 12)];
        if (oneMinuteAgo) {
            const change = ((currentPrice - oneMinuteAgo.price) / oneMinuteAgo.price) * 100;

            if (Math.abs(change) > 2) {
                this.emit('significant_movement', {
                    symbol,
                    currentPrice,
                    previousPrice: oneMinuteAgo.price,
                    change,
                    period: '1m',
                    type: change > 0 ? 'pump' : 'dump'
                });
            }
        }

        // Check 5-minute change
        const fiveMinutesAgo = history[Math.max(0, history.length - 60)];
        if (fiveMinutesAgo) {
            const change = ((currentPrice - fiveMinutesAgo.price) / fiveMinutesAgo.price) * 100;

            if (Math.abs(change) > 5) {
                this.emit('significant_movement', {
                    symbol,
                    currentPrice,
                    previousPrice: fiveMinutesAgo.price,
                    change,
                    period: '5m',
                    type: change > 0 ? 'pump' : 'dump'
                });
            }
        }
    }

    /**
     * Calculate price change
     */
    calculateChange(symbol) {
        const history = this.priceHistory.get(symbol);
        if (!history || history.length < 2) return 0;

        const current = history[history.length - 1].price;
        const previous = history[history.length - 2].price;

        return {
            absolute: current - previous,
            percent: ((current - previous) / previous) * 100
        };
    }

    /**
     * Get price statistics
     */
    getStatistics(symbol) {
        const history = this.priceHistory.get(symbol);
        if (!history || history.length === 0) return null;

        const prices = history.map(h => h.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const current = prices[prices.length - 1];

        return {
            symbol,
            current,
            min,
            max,
            avg,
            range: max - min,
            volatility: ((max - min) / avg) * 100,
            samples: prices.length
        };
    }

    /**
     * Get mock price for testing
     */
    getMockPrice(symbol) {
        const basePrices = {
            'BTCUSDT': 50000,
            'ETHUSDT': 3000,
            'BNBUSDT': 400,
            'SOLUSDT': 150,
            'ADAUSDT': 0.5
        };

        const base = basePrices[symbol] || 100;
        const variance = base * 0.01; // 1% variance

        return base + (Math.random() - 0.5) * variance;
    }
}

module.exports = PriceMonitor;