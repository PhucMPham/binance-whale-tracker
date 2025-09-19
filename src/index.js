/**
 * Binance Whale Tracker - Main Entry Point
 * Professional trading toolkit for cryptocurrency analysis and monitoring
 */

const EventEmitter = require('events');
const Config = require('./core/config');
const Logger = require('./core/logger');
const ErrorHandler = require('./core/error-handler');

// API Clients
const BinanceAPI = require('./api/binance-api');
const CryptoQuantClient = require('./api/cryptoquant-client');

// Monitors
const TechnicalAnalyzer = require('./monitors/technical-analyzer');
const ExchangeFlowMonitor = require('./monitors/exchange-flow-monitor');
const PriceMonitor = require('./monitors/price-monitor');

// Alert System
const AlertManager = require('./alerts/alert-manager');
const TelegramNotifier = require('./alerts/telegram-notifier');

// Dashboard
const DashboardManager = require('./dashboard/dashboard-manager');

/**
 * Main WhaleTracker class
 * Provides unified interface for all tracking features
 */
class WhaleTracker extends EventEmitter {
    constructor(userConfig = {}) {
        super();

        // Initialize configuration
        this.config = new Config(userConfig);
        this.logger = new Logger(this.config.get('logging'));
        this.errorHandler = new ErrorHandler(this.logger);

        // Initialize API clients
        this.binance = null;
        this.cryptoQuant = null;

        // Initialize monitors
        this.technicalAnalyzer = null;
        this.exchangeFlowMonitor = null;
        this.priceMonitor = null;

        // Initialize alert system
        this.alertManager = null;
        this.telegramNotifier = null;

        // Initialize dashboard
        this.dashboard = null;

        // Tracking state
        this.isInitialized = false;
        this.activeMonitors = new Map();
        this.activeAlerts = new Map();
    }

    /**
     * Initialize the whale tracker
     */
    async initialize() {
        try {
            this.logger.info('Initializing Whale Tracker...');

            // Initialize API clients
            const binanceConfig = this.config.get('binance');
            if (binanceConfig.apiKey) {
                this.binance = new BinanceAPI(binanceConfig);
                await this.binance.initialize();
                this.logger.info('Binance API initialized');
            }

            const cryptoQuantConfig = this.config.get('cryptoquant');
            if (cryptoQuantConfig.apiKey) {
                this.cryptoQuant = new CryptoQuantClient(cryptoQuantConfig.apiKey);
                this.logger.info('CryptoQuant API initialized');
            }

            // Initialize monitors
            this.technicalAnalyzer = new TechnicalAnalyzer({
                binance: this.binance,
                cryptoQuant: this.cryptoQuant,
                logger: this.logger
            });

            this.exchangeFlowMonitor = new ExchangeFlowMonitor({
                cryptoQuant: this.cryptoQuant,
                logger: this.logger,
                ...this.config.get('exchangeFlow')
            });

            this.priceMonitor = new PriceMonitor({
                binance: this.binance,
                logger: this.logger,
                ...this.config.get('priceMonitor')
            });

            // Initialize alert system
            this.alertManager = new AlertManager({
                logger: this.logger,
                ...this.config.get('alerts')
            });

            const telegramConfig = this.config.get('telegram');
            if (telegramConfig.enabled && telegramConfig.botToken) {
                this.telegramNotifier = new TelegramNotifier(telegramConfig);
                await this.telegramNotifier.initialize();
                this.alertManager.addNotifier(this.telegramNotifier);
                this.logger.info('Telegram notifier initialized');
            }

            // Setup event forwarding
            this._setupEventForwarding();

            this.isInitialized = true;
            this.logger.info('Whale Tracker initialized successfully');
            this.emit('initialized');

        } catch (error) {
            this.errorHandler.handleError(error);
            throw error;
        }
    }

    /**
     * Start monitoring a symbol
     */
    async startMonitoring(symbol, options = {}) {
        this._checkInitialized();

        try {
            this.logger.info(`Starting monitoring for ${symbol}`, options);

            const monitorConfig = {
                symbol,
                interval: options.interval || '1h',
                ...options
            };

            // Start technical analysis
            if (options.technical !== false) {
                await this.technicalAnalyzer.startAnalysis(symbol, monitorConfig);
            }

            // Start exchange flow monitoring
            if (options.exchangeFlow !== false && this.cryptoQuant) {
                await this.exchangeFlowMonitor.startMonitoring(symbol, monitorConfig);
            }

            // Start price monitoring
            if (options.price !== false) {
                await this.priceMonitor.startMonitoring(symbol, monitorConfig);
            }

            this.activeMonitors.set(symbol, monitorConfig);
            this.emit('monitoring_started', { symbol, config: monitorConfig });

            return {
                symbol,
                status: 'monitoring',
                config: monitorConfig
            };

        } catch (error) {
            this.errorHandler.handleError(error);
            throw error;
        }
    }

    /**
     * Stop monitoring a symbol
     */
    async stopMonitoring(symbol) {
        this._checkInitialized();

        try {
            this.logger.info(`Stopping monitoring for ${symbol}`);

            // Stop all monitors for this symbol
            await this.technicalAnalyzer.stopAnalysis(symbol);
            await this.exchangeFlowMonitor.stopMonitoring(symbol);
            await this.priceMonitor.stopMonitoring(symbol);

            this.activeMonitors.delete(symbol);
            this.emit('monitoring_stopped', { symbol });

            return {
                symbol,
                status: 'stopped'
            };

        } catch (error) {
            this.errorHandler.handleError(error);
            throw error;
        }
    }

    /**
     * Analyze a coin
     */
    async analyzeCoin(symbol, options = {}) {
        this._checkInitialized();

        try {
            this.logger.info(`Analyzing ${symbol}`, options);

            const analysis = await this.technicalAnalyzer.analyze(symbol, options);

            this.emit('analysis_complete', {
                symbol,
                analysis,
                timestamp: new Date()
            });

            return analysis;

        } catch (error) {
            this.errorHandler.handleError(error);
            throw error;
        }
    }

    /**
     * Get exchange flows for a symbol
     */
    async getExchangeFlows(symbol = 'ETH', options = {}) {
        this._checkInitialized();

        if (!this.cryptoQuant) {
            throw new Error('CryptoQuant API not configured');
        }

        try {
            this.logger.info(`Getting exchange flows for ${symbol}`, options);

            const flows = await this.exchangeFlowMonitor.getFlows(symbol, options);

            this.emit('flows_retrieved', {
                symbol,
                flows,
                timestamp: new Date()
            });

            return flows;

        } catch (error) {
            this.errorHandler.handleError(error);
            throw error;
        }
    }

    /**
     * Add a price alert
     */
    async addAlert(symbol, price, type = 'above', options = {}) {
        this._checkInitialized();

        try {
            this.logger.info(`Adding alert for ${symbol} at ${price} (${type})`, options);

            const alert = await this.alertManager.addAlert({
                symbol,
                price,
                type,
                ...options
            });

            this.activeAlerts.set(alert.id, alert);
            this.emit('alert_added', alert);

            return alert;

        } catch (error) {
            this.errorHandler.handleError(error);
            throw error;
        }
    }

    /**
     * Remove an alert
     */
    async removeAlert(alertId) {
        this._checkInitialized();

        try {
            this.logger.info(`Removing alert ${alertId}`);

            await this.alertManager.removeAlert(alertId);

            this.activeAlerts.delete(alertId);
            this.emit('alert_removed', { alertId });

            return {
                alertId,
                status: 'removed'
            };

        } catch (error) {
            this.errorHandler.handleError(error);
            throw error;
        }
    }

    /**
     * Start dashboard
     */
    async startDashboard(symbols = [], options = {}) {
        this._checkInitialized();

        try {
            this.logger.info('Starting dashboard', { symbols, options });

            if (!this.dashboard) {
                this.dashboard = new DashboardManager({
                    logger: this.logger,
                    ...this.config.get('dashboard')
                });
            }

            await this.dashboard.start(symbols, {
                binance: this.binance,
                cryptoQuant: this.cryptoQuant,
                ...options
            });

            this.emit('dashboard_started', { symbols });

            return {
                status: 'running',
                symbols
            };

        } catch (error) {
            this.errorHandler.handleError(error);
            throw error;
        }
    }

    /**
     * Stop dashboard
     */
    async stopDashboard() {
        this._checkInitialized();

        try {
            if (this.dashboard) {
                await this.dashboard.stop();
                this.emit('dashboard_stopped');
            }

            return {
                status: 'stopped'
            };

        } catch (error) {
            this.errorHandler.handleError(error);
            throw error;
        }
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            activeMonitors: Array.from(this.activeMonitors.keys()),
            activeAlerts: this.activeAlerts.size,
            apis: {
                binance: !!this.binance,
                cryptoQuant: !!this.cryptoQuant,
                telegram: !!this.telegramNotifier
            },
            dashboard: this.dashboard ? 'running' : 'stopped'
        };
    }

    /**
     * Shutdown the tracker
     */
    async shutdown() {
        try {
            this.logger.info('Shutting down Whale Tracker...');

            // Stop all monitors
            for (const symbol of this.activeMonitors.keys()) {
                await this.stopMonitoring(symbol);
            }

            // Stop dashboard
            if (this.dashboard) {
                await this.dashboard.stop();
            }

            // Cleanup
            if (this.binance) await this.binance.cleanup();
            if (this.telegramNotifier) await this.telegramNotifier.cleanup();

            this.emit('shutdown');
            this.logger.info('Whale Tracker shut down successfully');

        } catch (error) {
            this.errorHandler.handleError(error);
            throw error;
        }
    }

    /**
     * Setup event forwarding from sub-components
     */
    _setupEventForwarding() {
        // Forward technical analysis events
        if (this.technicalAnalyzer) {
            this.technicalAnalyzer.on('analysis', (data) => {
                this.emit('technical_analysis', data);
            });

            this.technicalAnalyzer.on('signal', (signal) => {
                this.emit('trading_signal', signal);
            });
        }

        // Forward exchange flow events
        if (this.exchangeFlowMonitor) {
            this.exchangeFlowMonitor.on('whale_detected', (whale) => {
                this.emit('whale_detected', whale);
            });

            this.exchangeFlowMonitor.on('flow_alert', (alert) => {
                this.emit('flow_alert', alert);
            });
        }

        // Forward price monitor events
        if (this.priceMonitor) {
            this.priceMonitor.on('price_update', (update) => {
                this.emit('price_update', update);
            });

            this.priceMonitor.on('price_alert', (alert) => {
                this.emit('price_alert', alert);
            });
        }

        // Forward alert manager events
        if (this.alertManager) {
            this.alertManager.on('alert_triggered', (alert) => {
                this.emit('alert_triggered', alert);
            });
        }
    }

    /**
     * Check if initialized
     */
    _checkInitialized() {
        if (!this.isInitialized) {
            throw new Error('WhaleTracker not initialized. Call initialize() first.');
        }
    }
}

// Export main class and utilities
module.exports = {
    WhaleTracker,
    Config,
    Logger,
    ErrorHandler,

    // Export individual components for advanced usage
    api: {
        BinanceAPI,
        CryptoQuantClient
    },
    monitors: {
        TechnicalAnalyzer,
        ExchangeFlowMonitor,
        PriceMonitor
    },
    alerts: {
        AlertManager,
        TelegramNotifier
    },
    dashboard: {
        DashboardManager
    }
};

// Export default
module.exports.default = WhaleTracker;