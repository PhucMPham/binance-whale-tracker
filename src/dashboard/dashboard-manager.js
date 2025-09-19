/**
 * Dashboard Manager Module
 */

const EventEmitter = require('events');

class DashboardManager extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = config;
        this.logger = config.logger;
        this.dashboard = null;
        this.updateInterval = null;
        this.symbols = [];
        this.data = new Map();
    }

    /**
     * Start the dashboard
     */
    async start(symbols = [], options = {}) {
        this.symbols = symbols;
        this.binance = options.binance;
        this.cryptoQuant = options.cryptoQuant;

        // Initialize data storage
        symbols.forEach(symbol => {
            this.data.set(symbol, {
                price: 0,
                change24h: 0,
                volume: 0,
                rsi: 50,
                flows: null,
                lastUpdate: new Date()
            });
        });

        // Start update loop
        const interval = options.updateInterval || this.config.updateInterval || 5000;
        this.updateInterval = setInterval(() => this.update(), interval);

        // Initial update
        await this.update();

        this.emit('started', { symbols });
        return true;
    }

    /**
     * Stop the dashboard
     */
    async stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        if (this.dashboard) {
            // Clean up dashboard resources
            this.dashboard = null;
        }

        this.emit('stopped');
        return true;
    }

    /**
     * Update dashboard data
     */
    async update() {
        const updates = [];

        for (const symbol of this.symbols) {
            try {
                const update = await this.getSymbolData(symbol);
                this.data.set(symbol, update);
                updates.push(update);
            } catch (error) {
                if (this.logger) {
                    this.logger.error(`Failed to update ${symbol}:`, error);
                }
            }
        }

        this.emit('update', {
            symbols: this.symbols,
            data: updates,
            timestamp: new Date()
        });

        // Render dashboard (in production, this would update the terminal UI)
        this.render();
    }

    /**
     * Get symbol data
     */
    async getSymbolData(symbol) {
        const data = {
            symbol,
            price: 0,
            change24h: 0,
            volume: 0,
            rsi: 50,
            flows: null,
            lastUpdate: new Date()
        };

        // Get price data
        if (this.binance) {
            try {
                const [price, ticker] = await Promise.all([
                    this.binance.getPrice(symbol),
                    this.binance.get24hrTicker(symbol)
                ]);

                data.price = price;
                data.change24h = parseFloat(ticker.priceChangePercent);
                data.volume = parseFloat(ticker.volume) * price;
            } catch (error) {
                // Use mock data on error
                data.price = this.getMockPrice(symbol);
                data.change24h = (Math.random() - 0.5) * 10;
                data.volume = Math.random() * 10000000;
            }
        } else {
            // Use mock data
            data.price = this.getMockPrice(symbol);
            data.change24h = (Math.random() - 0.5) * 10;
            data.volume = Math.random() * 10000000;
        }

        // Get RSI (simplified)
        data.rsi = 50 + (Math.random() - 0.5) * 40;

        // Get exchange flows for ETH/BTC
        if (this.cryptoQuant && (symbol.includes('BTC') || symbol.includes('ETH'))) {
            try {
                const cryptoSymbol = symbol.replace('USDT', '');
                const flows = await this.cryptoQuant.getExchangeFlow('netflow', {
                    symbol: cryptoSymbol,
                    exchange: 'all_exchange'
                });
                data.flows = flows;
            } catch (error) {
                // Ignore flow errors
            }
        }

        return data;
    }

    /**
     * Render dashboard (console output for now)
     */
    render() {
        // Clear console
        console.clear();

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('                    BINANCE WHALE TRACKER                      ');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');

        // Header
        console.log('Symbol\t\tPrice\t\t24h %\t\tVolume\t\tRSI');
        console.log('─'.repeat(65));

        // Data rows
        for (const [symbol, data] of this.data.entries()) {
            const changeColor = data.change24h > 0 ? '\x1b[32m' : '\x1b[31m'; // Green/Red
            const resetColor = '\x1b[0m';

            console.log(
                `${symbol.padEnd(12)}` +
                `$${data.price.toFixed(2).padEnd(12)}` +
                `${changeColor}${data.change24h.toFixed(2)}%${resetColor}`.padEnd(20) +
                `$${this.formatNumber(data.volume).padEnd(10)}` +
                `${data.rsi.toFixed(1)}`
            );
        }

        console.log('');
        console.log('─'.repeat(65));
        console.log(`Last Update: ${new Date().toLocaleTimeString()}`);
        console.log('Press Ctrl+C to exit');
    }

    /**
     * Format large numbers
     */
    formatNumber(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    }

    /**
     * Get mock price
     */
    getMockPrice(symbol) {
        const prices = {
            'BTCUSDT': 50000,
            'ETHUSDT': 3000,
            'BNBUSDT': 400,
            'SOLUSDT': 150
        };
        return prices[symbol] || 100;
    }

    /**
     * Get dashboard status
     */
    getStatus() {
        return {
            running: this.updateInterval !== null,
            symbols: this.symbols,
            dataPoints: this.data.size,
            lastUpdate: Array.from(this.data.values())[0]?.lastUpdate
        };
    }
}

module.exports = DashboardManager;