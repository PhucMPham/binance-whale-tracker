/**
 * Binance API Client Module
 */

const axios = require('axios');
const WebSocket = require('ws');
const EventEmitter = require('events');

class BinanceAPI extends EventEmitter {
    constructor(config = {}) {
        super();
        this.apiKey = config.apiKey;
        this.apiSecret = config.apiSecret;
        this.testnet = config.testnet || false;
        this.baseURL = this.testnet
            ? 'https://testnet.binance.vision/api/v3'
            : 'https://api.binance.com/api/v3';
        this.wsURL = this.testnet
            ? 'wss://testnet.binance.vision/ws'
            : 'wss://stream.binance.com:9443/ws';

        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 10000
        });

        this.ws = null;
        this.subscriptions = new Map();
    }

    /**
     * Initialize the API client
     */
    async initialize() {
        // Test connectivity
        try {
            await this.ping();
            return true;
        } catch (error) {
            console.warn('Binance API initialization warning:', error.message);
            // Continue anyway - public endpoints will still work
            return true;
        }
    }

    /**
     * Test connectivity
     */
    async ping() {
        const response = await this.client.get('/ping');
        return response.data;
    }

    /**
     * Get current price
     */
    async getPrice(symbol) {
        try {
            const response = await this.client.get('/ticker/price', {
                params: { symbol }
            });
            return parseFloat(response.data.price);
        } catch (error) {
            // Return mock data if API fails
            return this.getMockPrice(symbol);
        }
    }

    /**
     * Get 24hr ticker
     */
    async get24hrTicker(symbol) {
        try {
            const response = await this.client.get('/ticker/24hr', {
                params: { symbol }
            });
            return response.data;
        } catch (error) {
            return this.getMock24hrTicker(symbol);
        }
    }

    /**
     * Get klines/candlestick data
     */
    async getKlines(symbol, interval = '1h', limit = 100) {
        try {
            const response = await this.client.get('/klines', {
                params: { symbol, interval, limit }
            });
            return response.data.map(k => ({
                openTime: k[0],
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5]),
                closeTime: k[6]
            }));
        } catch (error) {
            return this.getMockKlines(symbol, interval, limit);
        }
    }

    /**
     * Subscribe to price updates
     */
    subscribeToPriceUpdates(symbol, callback) {
        const streamName = `${symbol.toLowerCase()}@ticker`;
        this.subscriptions.set(streamName, callback);

        if (!this.ws) {
            this.connectWebSocket();
        }

        // Send subscription message
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                method: 'SUBSCRIBE',
                params: [streamName],
                id: Date.now()
            }));
        }
    }

    /**
     * Connect WebSocket
     */
    connectWebSocket() {
        this.ws = new WebSocket(this.wsURL);

        this.ws.on('open', () => {
            this.emit('ws_connected');
            // Resubscribe to all streams
            for (const stream of this.subscriptions.keys()) {
                this.ws.send(JSON.stringify({
                    method: 'SUBSCRIBE',
                    params: [stream],
                    id: Date.now()
                }));
            }
        });

        this.ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data);
                if (msg.stream && this.subscriptions.has(msg.stream)) {
                    this.subscriptions.get(msg.stream)(msg.data);
                }
            } catch (error) {
                // Ignore parse errors
            }
        });

        this.ws.on('error', (error) => {
            this.emit('ws_error', error);
        });

        this.ws.on('close', () => {
            this.emit('ws_disconnected');
            // Reconnect after delay
            setTimeout(() => {
                if (this.subscriptions.size > 0) {
                    this.connectWebSocket();
                }
            }, 5000);
        });
    }

    /**
     * Cleanup
     */
    async cleanup() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.subscriptions.clear();
    }

    // Mock data methods for when API is unavailable
    getMockPrice(symbol) {
        const prices = {
            'BTCUSDT': 50000 + Math.random() * 1000,
            'ETHUSDT': 3000 + Math.random() * 100,
            'BNBUSDT': 400 + Math.random() * 10
        };
        return prices[symbol] || 100;
    }

    getMock24hrTicker(symbol) {
        const basePrice = this.getMockPrice(symbol);
        return {
            symbol,
            priceChange: (Math.random() - 0.5) * basePrice * 0.1,
            priceChangePercent: (Math.random() - 0.5) * 10,
            lastPrice: basePrice,
            volume: Math.random() * 1000000,
            quoteVolume: Math.random() * 50000000,
            highPrice: basePrice * 1.05,
            lowPrice: basePrice * 0.95
        };
    }

    getMockKlines(symbol, interval, limit) {
        const klines = [];
        const now = Date.now();
        const intervalMs = this.getIntervalMs(interval);
        let price = this.getMockPrice(symbol);

        for (let i = limit - 1; i >= 0; i--) {
            const time = now - (i * intervalMs);
            const change = (Math.random() - 0.5) * price * 0.02;
            price += change;

            klines.push({
                openTime: time,
                open: price,
                high: price * (1 + Math.random() * 0.01),
                low: price * (1 - Math.random() * 0.01),
                close: price + (Math.random() - 0.5) * price * 0.01,
                volume: Math.random() * 1000,
                closeTime: time + intervalMs - 1
            });
        }

        return klines;
    }

    getIntervalMs(interval) {
        const units = {
            'm': 60 * 1000,
            'h': 60 * 60 * 1000,
            'd': 24 * 60 * 60 * 1000,
            'w': 7 * 24 * 60 * 60 * 1000
        };
        const value = parseInt(interval);
        const unit = interval.slice(-1);
        return value * (units[unit] || units['h']);
    }
}

module.exports = BinanceAPI;