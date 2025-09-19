/**
 * Configuration Management Module
 */

const Joi = require('joi');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

/**
 * Configuration schema
 */
const configSchema = Joi.object({
    binance: Joi.object({
        apiKey: Joi.string().optional(),
        apiSecret: Joi.string().optional(),
        testnet: Joi.boolean().default(false),
        recvWindow: Joi.number().default(5000)
    }),
    cryptoquant: Joi.object({
        apiKey: Joi.string().optional()
    }),
    telegram: Joi.object({
        enabled: Joi.boolean().default(false),
        botToken: Joi.string().when('enabled', {
            is: true,
            then: Joi.required()
        }),
        chatId: Joi.string().when('enabled', {
            is: true,
            then: Joi.required()
        })
    }),
    monitoring: Joi.object({
        interval: Joi.number().default(300000),
        whaleThresholdBTC: Joi.number().default(50),
        whaleThresholdETH: Joi.number().default(1000),
        criticalInflowBTC: Joi.number().default(200),
        criticalOutflowBTC: Joi.number().default(500),
        criticalInflowETH: Joi.number().default(5000),
        criticalOutflowETH: Joi.number().default(10000)
    }),
    alerts: Joi.object({
        maxAlerts: Joi.number().default(100),
        cooldown: Joi.number().default(3600000),
        priceThreshold: Joi.number().default(5)
    }),
    dashboard: Joi.object({
        updateInterval: Joi.number().default(5000),
        maxSymbols: Joi.number().default(10),
        showWhale: Joi.boolean().default(true),
        showTechnical: Joi.boolean().default(true),
        showFlows: Joi.boolean().default(true)
    }),
    logging: Joi.object({
        level: Joi.string().valid('trace', 'debug', 'info', 'warn', 'error', 'fatal').default('info'),
        pretty: Joi.boolean().default(true),
        file: Joi.string().optional()
    }),
    exchangeFlow: Joi.object({
        checkInterval: Joi.number().default(300000),
        exchange: Joi.string().default('all_exchange')
    }),
    priceMonitor: Joi.object({
        updateInterval: Joi.number().default(5000)
    })
});

/**
 * Configuration class
 */
class Config {
    constructor(userConfig = {}) {
        // Build configuration from environment and user input
        const config = {
            binance: {
                apiKey: process.env.BINANCE_API_KEY || userConfig.binance?.apiKey,
                apiSecret: process.env.BINANCE_API_SECRET || userConfig.binance?.apiSecret,
                testnet: process.env.BINANCE_TESTNET === 'true' || userConfig.binance?.testnet || false,
                recvWindow: parseInt(process.env.BINANCE_RECV_WINDOW) || userConfig.binance?.recvWindow || 5000
            },
            cryptoquant: {
                apiKey: process.env.CRYPTOQUANT_API_KEY || userConfig.cryptoquant?.apiKey
            },
            telegram: {
                enabled: process.env.TELEGRAM_ENABLED !== 'false' && (process.env.TELEGRAM_BOT_TOKEN || userConfig.telegram?.botToken) ? true : false,
                botToken: process.env.TELEGRAM_BOT_TOKEN || userConfig.telegram?.botToken,
                chatId: process.env.TELEGRAM_CHAT_ID || userConfig.telegram?.chatId
            },
            monitoring: {
                interval: parseInt(process.env.MONITORING_INTERVAL) || userConfig.monitoring?.interval || 300000,
                whaleThresholdBTC: parseFloat(process.env.WHALE_THRESHOLD_BTC) || userConfig.monitoring?.whaleThresholdBTC || 50,
                whaleThresholdETH: parseFloat(process.env.WHALE_THRESHOLD_ETH) || userConfig.monitoring?.whaleThresholdETH || 1000,
                criticalInflowBTC: parseFloat(process.env.CRITICAL_INFLOW_BTC) || userConfig.monitoring?.criticalInflowBTC || 200,
                criticalOutflowBTC: parseFloat(process.env.CRITICAL_OUTFLOW_BTC) || userConfig.monitoring?.criticalOutflowBTC || 500,
                criticalInflowETH: parseFloat(process.env.CRITICAL_INFLOW_ETH) || userConfig.monitoring?.criticalInflowETH || 5000,
                criticalOutflowETH: parseFloat(process.env.CRITICAL_OUTFLOW_ETH) || userConfig.monitoring?.criticalOutflowETH || 10000
            },
            alerts: {
                maxAlerts: parseInt(process.env.MAX_ALERTS) || userConfig.alerts?.maxAlerts || 100,
                cooldown: parseInt(process.env.ALERT_COOLDOWN) || userConfig.alerts?.cooldown || 3600000,
                priceThreshold: parseFloat(process.env.PRICE_ALERT_THRESHOLD) || userConfig.alerts?.priceThreshold || 5
            },
            dashboard: {
                updateInterval: parseInt(process.env.DASHBOARD_UPDATE_INTERVAL) || userConfig.dashboard?.updateInterval || 5000,
                maxSymbols: parseInt(process.env.DASHBOARD_MAX_SYMBOLS) || userConfig.dashboard?.maxSymbols || 10,
                showWhale: process.env.DASHBOARD_SHOW_WHALE !== 'false' && (userConfig.dashboard?.showWhale !== false),
                showTechnical: process.env.DASHBOARD_SHOW_TECHNICAL !== 'false' && (userConfig.dashboard?.showTechnical !== false),
                showFlows: process.env.DASHBOARD_SHOW_FLOWS !== 'false' && (userConfig.dashboard?.showFlows !== false)
            },
            logging: {
                level: process.env.LOG_LEVEL || userConfig.logging?.level || 'info',
                pretty: process.env.LOG_PRETTY !== 'false' && (userConfig.logging?.pretty !== false),
                file: process.env.LOG_FILE || userConfig.logging?.file
            },
            exchangeFlow: userConfig.exchangeFlow || {},
            priceMonitor: userConfig.priceMonitor || {}
        };

        // Validate configuration
        const { error, value } = configSchema.validate(config);
        if (error) {
            throw new Error(`Configuration validation failed: ${error.message}`);
        }

        this.config = value;
    }

    /**
     * Get configuration value
     */
    get(key) {
        if (!key) return this.config;

        const keys = key.split('.');
        let value = this.config;

        for (const k of keys) {
            value = value[k];
            if (value === undefined) {
                return undefined;
            }
        }

        return value;
    }

    /**
     * Set configuration value
     */
    set(key, value) {
        const keys = key.split('.');
        let config = this.config;

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!config[k]) {
                config[k] = {};
            }
            config = config[k];
        }

        config[keys[keys.length - 1]] = value;
    }

    /**
     * Check if APIs are configured
     */
    hasApiKeys() {
        return {
            binance: !!(this.config.binance.apiKey && this.config.binance.apiSecret),
            cryptoquant: !!this.config.cryptoquant.apiKey,
            telegram: !!(this.config.telegram.enabled && this.config.telegram.botToken && this.config.telegram.chatId)
        };
    }

    /**
     * Get API endpoints
     */
    getEndpoints() {
        return {
            binance: this.config.binance.testnet
                ? 'https://testnet.binance.vision'
                : 'https://api.binance.com',
            binanceWS: this.config.binance.testnet
                ? 'wss://testnet.binance.vision/ws'
                : 'wss://stream.binance.com:9443/ws',
            cryptoquant: 'https://api.cryptoquant.com/v1'
        };
    }
}

module.exports = Config;