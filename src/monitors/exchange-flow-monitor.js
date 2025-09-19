/**
 * Exchange Flow Monitor Module
 */

const EventEmitter = require('events');

class ExchangeFlowMonitor extends EventEmitter {
    constructor(config = {}) {
        super();
        this.cryptoQuant = config.cryptoQuant;
        this.logger = config.logger;
        this.config = config;
        this.activeMonitors = new Map();
    }

    /**
     * Start monitoring exchange flows
     */
    async startMonitoring(symbol, options = {}) {
        const updateInterval = options.interval || 300000; // 5 minutes default

        if (this.activeMonitors.has(symbol)) {
            return;
        }

        const monitorInterval = setInterval(async () => {
            try {
                const flows = await this.getFlows(symbol, options);

                // Emit flow update
                this.emit('flow_update', { symbol, flows });

                // Check for whale movements
                if (this.cryptoQuant) {
                    const whaleData = await this.cryptoQuant.detectWhaleMovements({
                        symbol: symbol.replace('USDT', ''),
                        threshold: options.whaleThreshold || (symbol.includes('BTC') ? 50 : 1000)
                    });

                    if (whaleData.alerts && whaleData.alerts.length > 0) {
                        whaleData.alerts.forEach(alert => {
                            this.emit('whale_detected', {
                                ...alert,
                                symbol
                            });
                        });
                    }
                }

                // Check for critical flows
                this.checkCriticalFlows(symbol, flows);

            } catch (error) {
                if (this.logger) {
                    this.logger.error('Flow monitoring error:', error);
                }
            }
        }, updateInterval);

        this.activeMonitors.set(symbol, monitorInterval);
    }

    /**
     * Stop monitoring
     */
    async stopMonitoring(symbol) {
        if (this.activeMonitors.has(symbol)) {
            clearInterval(this.activeMonitors.get(symbol));
            this.activeMonitors.delete(symbol);
        }
    }

    /**
     * Get exchange flows
     */
    async getFlows(symbol, options = {}) {
        const cryptoSymbol = symbol.replace('USDT', '');

        if (!this.cryptoQuant) {
            return this.getMockFlows(cryptoSymbol);
        }

        try {
            const [inflow, outflow] = await Promise.all([
                this.cryptoQuant.getExchangeFlow('inflow', {
                    symbol: cryptoSymbol,
                    exchange: options.exchange || 'all_exchange'
                }),
                this.cryptoQuant.getExchangeFlow('outflow', {
                    symbol: cryptoSymbol,
                    exchange: options.exchange || 'all_exchange'
                })
            ]);

            // Calculate netflow
            const netflow = {
                netBalance: (outflow?.statistics?.total24h || 0) - (inflow?.statistics?.total24h || 0),
                statistics: {
                    netBalance: (outflow?.statistics?.total24h || 0) - (inflow?.statistics?.total24h || 0)
                }
            };

            // Determine market impact
            const marketImpact = this.determineMarketImpact(inflow, outflow, netflow);

            return {
                inflow,
                outflow,
                netflow,
                marketImpact,
                timestamp: new Date()
            };

        } catch (error) {
            if (this.logger) {
                this.logger.error('Failed to get flows:', error);
            }
            return this.getMockFlows(cryptoSymbol);
        }
    }

    /**
     * Check for critical flow conditions
     */
    checkCriticalFlows(symbol, flows) {
        const isBTC = symbol.includes('BTC');
        const criticalInflow = isBTC ? 200 : 5000;
        const criticalOutflow = isBTC ? 500 : 10000;

        if (flows.inflow?.statistics?.total24h > criticalInflow) {
            this.emit('flow_alert', {
                type: 'CRITICAL_INFLOW',
                severity: 'high',
                symbol,
                amount: flows.inflow.statistics.total24h,
                message: `High inflow detected: ${flows.inflow.statistics.total24h.toFixed(2)} ${isBTC ? 'BTC' : 'ETH'}`
            });
        }

        if (flows.outflow?.statistics?.total24h > criticalOutflow) {
            this.emit('flow_alert', {
                type: 'CRITICAL_OUTFLOW',
                severity: 'medium',
                symbol,
                amount: flows.outflow.statistics.total24h,
                message: `High outflow detected: ${flows.outflow.statistics.total24h.toFixed(2)} ${isBTC ? 'BTC' : 'ETH'}`
            });
        }
    }

    /**
     * Determine market impact
     */
    determineMarketImpact(inflow, outflow, netflow) {
        const netBalance = netflow?.statistics?.netBalance || 0;
        const inflowTotal = inflow?.statistics?.total24h || 0;
        const outflowTotal = outflow?.statistics?.total24h || 0;

        if (netBalance < -1000) {
            return 'BEARISH';
        } else if (netBalance > 1000) {
            return 'BULLISH';
        } else {
            return 'NEUTRAL';
        }
    }

    /**
     * Get mock flows for testing
     */
    getMockFlows(symbol) {
        const isBTC = symbol === 'BTC';
        const base = isBTC ? 100 : 1000;

        return {
            inflow: {
                statistics: {
                    total24h: base + Math.random() * base,
                    whaleVolume: base * 0.3,
                    whaleTransactions: Math.floor(Math.random() * 10)
                }
            },
            outflow: {
                statistics: {
                    total24h: base + Math.random() * base * 1.2,
                    whaleVolume: base * 0.4,
                    whaleTransactions: Math.floor(Math.random() * 12)
                }
            },
            netflow: {
                statistics: {
                    netBalance: (Math.random() - 0.5) * base * 2
                }
            },
            marketImpact: Math.random() > 0.5 ? 'BULLISH' : 'BEARISH',
            timestamp: new Date(),
            isMockData: true
        };
    }
}

module.exports = ExchangeFlowMonitor;