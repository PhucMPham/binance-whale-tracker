/**
 * CryptoQuant API Client Module
 */

const axios = require('axios');
const EventEmitter = require('events');

class CryptoQuantClient extends EventEmitter {
    constructor(apiKey) {
        super();
        this.apiKey = apiKey;
        this.baseURL = 'https://api.cryptoquant.com/v1';

        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
            headers: apiKey ? {
                'Authorization': `Bearer ${apiKey}`
            } : {}
        });

        this.cache = new Map();
        this.cacheTTL = 60000; // 1 minute cache
    }

    /**
     * Get exchange flow data
     */
    async getExchangeFlow(flowType, options = {}) {
        const { symbol = 'ETH', exchange = 'all_exchange', window = 'day' } = options;

        try {
            const endpoint = `/${symbol.toLowerCase()}/exchange-flows/${flowType}`;
            const cacheKey = `${endpoint}:${exchange}:${window}`;

            // Check cache
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTTL) {
                    return cached.data;
                }
            }

            const response = await this.client.get(endpoint, {
                params: {
                    exchange,
                    window,
                    limit: options.limit || 1
                }
            });

            const data = this.processFlowData(response.data, flowType);

            // Cache the result
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            return data;

        } catch (error) {
            // Return mock data if API fails
            return this.getMockFlowData(flowType, symbol);
        }
    }

    /**
     * Detect whale movements
     */
    async detectWhaleMovements(options = {}) {
        const { symbol = 'ETH', threshold = 1000 } = options;

        try {
            const [inflow, outflow] = await Promise.all([
                this.getExchangeFlow('inflow', options),
                this.getExchangeFlow('outflow', options)
            ]);

            const alerts = [];

            // Check for whale inflows
            if (inflow?.statistics?.whaleVolume > threshold) {
                alerts.push({
                    type: 'WHALE_INFLOW',
                    severity: 'high',
                    amount: inflow.statistics.whaleVolume,
                    symbol,
                    impact: 'BEARISH',
                    message: `Large ${symbol} deposit detected: ${inflow.statistics.whaleVolume.toFixed(2)} ${symbol}`
                });
            }

            // Check for whale outflows
            if (outflow?.statistics?.whaleVolume > threshold * 2) {
                alerts.push({
                    type: 'WHALE_OUTFLOW',
                    severity: 'medium',
                    amount: outflow.statistics.whaleVolume,
                    symbol,
                    impact: 'BULLISH',
                    message: `Large ${symbol} withdrawal detected: ${outflow.statistics.whaleVolume.toFixed(2)} ${symbol}`
                });
            }

            return { alerts, inflow, outflow };

        } catch (error) {
            return { alerts: [], error: error.message };
        }
    }

    /**
     * Process flow data
     */
    processFlowData(rawData, flowType) {
        if (!rawData || !rawData.result) {
            return this.getMockFlowData(flowType);
        }

        const data = rawData.result.data || [];
        const latest = data[0] || {};

        // Calculate statistics
        const total24h = data.reduce((sum, d) => sum + (d.value || 0), 0);
        const whaleTransactions = data.filter(d => d.value > 1000).length;
        const whaleVolume = data.filter(d => d.value > 1000)
            .reduce((sum, d) => sum + d.value, 0);

        return {
            latest,
            statistics: {
                total24h,
                whaleTransactions,
                whaleVolume,
                averageSize: total24h / (data.length || 1),
                maxTransaction: Math.max(...data.map(d => d.value || 0))
            },
            flowType,
            timestamp: new Date()
        };
    }

    /**
     * Get mock flow data for testing/fallback
     */
    getMockFlowData(flowType, symbol = 'ETH') {
        const baseValue = symbol === 'BTC' ? 100 : 5000;
        const variance = symbol === 'BTC' ? 50 : 2000;

        const value = baseValue + Math.random() * variance;
        const whaleValue = value * 0.3;

        return {
            latest: {
                value,
                timestamp: new Date()
            },
            statistics: {
                total24h: value * 24,
                whaleTransactions: Math.floor(Math.random() * 10),
                whaleVolume: whaleValue,
                averageSize: value,
                maxTransaction: value * 2,
                netBalance: flowType === 'inflow' ? value : -value
            },
            flowType,
            timestamp: new Date(),
            isMockData: true
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
}

module.exports = CryptoQuantClient;