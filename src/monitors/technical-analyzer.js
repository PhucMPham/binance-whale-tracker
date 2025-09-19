/**
 * Technical Analyzer Module
 */

const EventEmitter = require('events');

class TechnicalAnalyzer extends EventEmitter {
    constructor(config = {}) {
        super();
        this.binance = config.binance;
        this.cryptoQuant = config.cryptoQuant;
        this.logger = config.logger;
        this.activeAnalysis = new Map();
    }

    /**
     * Start continuous analysis
     */
    async startAnalysis(symbol, options = {}) {
        const interval = options.interval || '1h';
        const updateInterval = options.updateInterval || 60000;

        if (this.activeAnalysis.has(symbol)) {
            return;
        }

        const analysisInterval = setInterval(async () => {
            try {
                const analysis = await this.analyze(symbol, options);
                this.emit('analysis', { symbol, analysis });

                // Check for signals
                if (analysis.signal !== 'NEUTRAL') {
                    this.emit('signal', {
                        symbol,
                        signal: analysis.signal,
                        strength: analysis.signalStrength,
                        analysis
                    });
                }
            } catch (error) {
                if (this.logger) {
                    this.logger.error('Analysis error:', error);
                }
            }
        }, updateInterval);

        this.activeAnalysis.set(symbol, analysisInterval);
    }

    /**
     * Stop analysis
     */
    async stopAnalysis(symbol) {
        if (this.activeAnalysis.has(symbol)) {
            clearInterval(this.activeAnalysis.get(symbol));
            this.activeAnalysis.delete(symbol);
        }
    }

    /**
     * Perform technical analysis
     */
    async analyze(symbol, options = {}) {
        const interval = options.interval || '1h';
        const period = options.period || 100;

        try {
            // Get market data
            const [price, ticker, klines] = await Promise.all([
                this.binance ? this.binance.getPrice(symbol) : this.getMockPrice(symbol),
                this.binance ? this.binance.get24hrTicker(symbol) : this.getMockTicker(symbol),
                this.binance ? this.binance.getKlines(symbol, interval, period) : this.getMockKlines(symbol)
            ]);

            // Calculate indicators
            const indicators = this.calculateIndicators(klines, options.indicators);

            // Determine signal
            const signal = this.determineSignal(indicators, price);

            return {
                symbol,
                currentPrice: price,
                change24h: parseFloat(ticker.priceChangePercent),
                volume24h: parseFloat(ticker.volume) * price,
                ...indicators,
                signal: signal.type,
                signalStrength: signal.strength,
                support: this.calculateSupport(klines),
                resistance: this.calculateResistance(klines),
                timestamp: new Date()
            };

        } catch (error) {
            if (this.logger) {
                this.logger.error('Analysis failed:', error);
            }
            return this.getMockAnalysis(symbol);
        }
    }

    /**
     * Calculate technical indicators
     */
    calculateIndicators(klines, indicatorConfig = {}) {
        const closes = klines.map(k => k.close);
        const volumes = klines.map(k => k.volume);

        const indicators = {};

        // RSI
        if (indicatorConfig.rsi !== false) {
            indicators.rsi = this.calculateRSI(closes, 14);
        }

        // MACD
        if (indicatorConfig.macd) {
            indicators.macd = this.calculateMACD(closes);
        }

        // Bollinger Bands
        if (indicatorConfig.bb) {
            indicators.bollingerBands = this.calculateBollingerBands(closes, 20, 2);
        }

        // Volume analysis
        indicators.volumeChange = this.calculateVolumeChange(volumes);

        return indicators;
    }

    /**
     * Calculate RSI
     */
    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return 50;

        let gains = 0;
        let losses = 0;

        for (let i = 1; i <= period; i++) {
            const difference = prices[i] - prices[i - 1];
            if (difference >= 0) {
                gains += difference;
            } else {
                losses -= difference;
            }
        }

        const avgGain = gains / period;
        const avgLoss = losses / period;

        if (avgLoss === 0) return 100;

        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));

        return Math.round(rsi * 100) / 100;
    }

    /**
     * Calculate MACD
     */
    calculateMACD(prices) {
        // Simplified MACD calculation
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        const macdLine = ema12 - ema26;
        const signal = this.calculateEMA([macdLine], 9);
        const histogram = macdLine - signal;

        return {
            macd: macdLine,
            signal,
            histogram
        };
    }

    /**
     * Calculate EMA
     */
    calculateEMA(prices, period) {
        if (prices.length < period) return prices[prices.length - 1];

        const k = 2 / (period + 1);
        let ema = prices[0];

        for (let i = 1; i < prices.length; i++) {
            ema = prices[i] * k + ema * (1 - k);
        }

        return ema;
    }

    /**
     * Calculate Bollinger Bands
     */
    calculateBollingerBands(prices, period = 20, stdDev = 2) {
        const sma = prices.slice(-period).reduce((a, b) => a + b, 0) / period;
        const variance = prices.slice(-period)
            .reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
        const std = Math.sqrt(variance);

        return {
            upper: sma + (std * stdDev),
            middle: sma,
            lower: sma - (std * stdDev)
        };
    }

    /**
     * Calculate volume change
     */
    calculateVolumeChange(volumes) {
        if (volumes.length < 2) return 0;
        const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
        const previous = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
        return ((recent - previous) / previous) * 100;
    }

    /**
     * Calculate support level
     */
    calculateSupport(klines) {
        const lows = klines.map(k => k.low);
        return Math.min(...lows.slice(-20));
    }

    /**
     * Calculate resistance level
     */
    calculateResistance(klines) {
        const highs = klines.map(k => k.high);
        return Math.max(...highs.slice(-20));
    }

    /**
     * Determine trading signal
     */
    determineSignal(indicators, currentPrice) {
        let bullishPoints = 0;
        let bearishPoints = 0;

        // RSI signals
        if (indicators.rsi) {
            if (indicators.rsi < 30) bullishPoints += 2;
            else if (indicators.rsi < 40) bullishPoints += 1;
            else if (indicators.rsi > 70) bearishPoints += 2;
            else if (indicators.rsi > 60) bearishPoints += 1;
        }

        // MACD signals
        if (indicators.macd) {
            if (indicators.macd.histogram > 0) bullishPoints += 1;
            else bearishPoints += 1;
        }

        // Volume signals
        if (indicators.volumeChange > 50) {
            if (indicators.rsi < 50) bullishPoints += 1;
            else bearishPoints += 1;
        }

        // Determine signal type and strength
        const netScore = bullishPoints - bearishPoints;
        const strength = Math.min(Math.abs(netScore) / 4, 1);

        if (netScore > 1) {
            return { type: 'BULLISH', strength };
        } else if (netScore < -1) {
            return { type: 'BEARISH', strength };
        } else {
            return { type: 'NEUTRAL', strength: 0 };
        }
    }

    // Mock methods for testing
    getMockPrice(symbol) {
        const prices = {
            'BTCUSDT': 50000,
            'ETHUSDT': 3000,
            'BNBUSDT': 400
        };
        return prices[symbol] || 100;
    }

    getMockTicker(symbol) {
        return {
            symbol,
            priceChangePercent: (Math.random() - 0.5) * 10,
            volume: Math.random() * 1000000
        };
    }

    getMockKlines(symbol) {
        const price = this.getMockPrice(symbol);
        return Array(100).fill(0).map(() => ({
            open: price,
            high: price * 1.01,
            low: price * 0.99,
            close: price * (1 + (Math.random() - 0.5) * 0.02),
            volume: Math.random() * 1000
        }));
    }

    getMockAnalysis(symbol) {
        return {
            symbol,
            currentPrice: this.getMockPrice(symbol),
            change24h: (Math.random() - 0.5) * 10,
            volume24h: Math.random() * 50000000,
            rsi: 50 + (Math.random() - 0.5) * 40,
            signal: 'NEUTRAL',
            signalStrength: 0.5,
            support: this.getMockPrice(symbol) * 0.95,
            resistance: this.getMockPrice(symbol) * 1.05,
            timestamp: new Date()
        };
    }
}

module.exports = TechnicalAnalyzer;