# 🐋 Binance Whale Tracker

[![GitHub repo](https://img.shields.io/badge/GitHub-PhucMPham%2Fbinance--whale--tracker-blue)](https://github.com/PhucMPham/binance-whale-tracker)
[![npm version](https://img.shields.io/npm/v/binance-whale-tracker.svg)](https://www.npmjs.com/package/binance-whale-tracker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org)
[![GitHub stars](https://img.shields.io/github/stars/PhucMPham/binance-whale-tracker)](https://github.com/PhucMPham/binance-whale-tracker/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/PhucMPham/binance-whale-tracker)](https://github.com/PhucMPham/binance-whale-tracker/issues)

Professional cryptocurrency trading toolkit with whale monitoring, technical analysis, and automated alerts for Binance.

## 🚀 Features

- **🐋 Whale Monitoring** - Track large cryptocurrency movements and exchange flows
- **📊 Technical Analysis** - Real-time technical indicators (RSI, MACD, Bollinger Bands)
- **🔔 Smart Alerts** - Price alerts with Telegram notifications
- **📈 Live Dashboard** - Terminal-based real-time monitoring interface
- **🔄 Exchange Flow Tracking** - Monitor inflow/outflow from major exchanges
- **🤖 API Integration** - Binance and CryptoQuant API support
- **⚡ CLI Tools** - Comprehensive command-line interface

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g binance-whale-tracker
```

### Local Installation

```bash
npm install binance-whale-tracker
```

### From Source

```bash
git clone https://github.com/yourusername/binance-whale-tracker.git
cd binance-whale-tracker
npm install
npm link  # For CLI commands
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
# Binance API (Optional - for authenticated endpoints)
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret

# CryptoQuant API (For exchange flow data)
CRYPTOQUANT_API_KEY=your_cryptoquant_api_key

# Telegram Notifications (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Optional Settings
LOG_LEVEL=info
ALERT_COOLDOWN=3600000
DASHBOARD_UPDATE_INTERVAL=5000
```

### Configuration File

Create a `config.json` for advanced settings:

```json
{
  "binance": {
    "testnet": false,
    "recvWindow": 5000
  },
  "alerts": {
    "maxAlerts": 100,
    "defaultCooldown": 3600000
  },
  "monitoring": {
    "defaultInterval": "1h",
    "maxSymbols": 20
  }
}
```

## 💻 CLI Usage

### Main Commands

```bash
# Start monitoring
whale-tracker start --symbols BTCUSDT ETHUSDT

# Quick analysis
whale-analyze coin BTCUSDT --interval 1h

# Monitor whale movements
whale-monitor whales ETH --threshold 1000

# Set up alerts
whale-alerts add BTCUSDT 50000 --type above

# Launch dashboard
whale-dashboard live --symbols BTCUSDT ETHUSDT
```

### Detailed Command Examples

#### 📊 Technical Analysis

```bash
# Analyze single coin
whale-analyze coin BTCUSDT --interval 4h --all

# Compare multiple coins
whale-analyze compare BTCUSDT ETHUSDT BNBUSDT --interval 1h

# Scan market for opportunities
whale-analyze scan --bullish --volume
```

#### 🐋 Whale Monitoring

```bash
# Monitor ETH whales
whale-monitor whales ETH --threshold 1000 --exchange binance

# Track exchange flows
whale-monitor flows ETH --critical-inflow 5000

# Real-time alerts
whale-monitor alerts --symbols BTCUSDT ETHUSDT
```

#### 🔔 Alert Management

```bash
# Add price alert
whale-alerts add BTCUSDT 55000 --type above --telegram

# List all alerts
whale-alerts list --symbol BTCUSDT

# Remove alert
whale-alerts remove alert_id_here

# Test notifications
whale-alerts test --telegram
```

#### 📈 Dashboard

```bash
# Live monitoring dashboard
whale-dashboard live --symbols BTCUSDT ETHUSDT SOLUSDT

# Simple price monitor
whale-dashboard simple BTCUSDT --interval 2

# Market statistics
whale-dashboard stats --top 20

# Matrix view (fun!)
whale-dashboard matrix --symbols BTCUSDT ETHUSDT
```

## 🔌 Programmatic API

### Basic Usage

```javascript
const { WhaleTracker } = require('binance-whale-tracker');

async function main() {
  // Initialize tracker
  const tracker = new WhaleTracker({
    binance: {
      apiKey: 'your_api_key',
      apiSecret: 'your_secret'
    },
    telegram: {
      enabled: true,
      botToken: 'your_bot_token',
      chatId: 'your_chat_id'
    }
  });

  await tracker.initialize();

  // Start monitoring
  await tracker.startMonitoring('BTCUSDT', {
    interval: '1h',
    technical: true,
    exchangeFlow: true
  });

  // Add alert
  await tracker.addAlert('BTCUSDT', 50000, 'above');

  // Listen to events
  tracker.on('whale_detected', (whale) => {
    console.log(`🐋 Whale detected: ${whale.amount} ${whale.symbol}`);
  });

  tracker.on('price_alert', (alert) => {
    console.log(`🔔 Price alert: ${alert.symbol} reached ${alert.price}`);
  });
}

main().catch(console.error);
```

### Advanced Examples

#### Technical Analysis

```javascript
const analysis = await tracker.analyzeCoin('BTCUSDT', {
  interval: '4h',
  period: 100,
  indicators: {
    rsi: true,
    macd: true,
    bb: true
  }
});

console.log('RSI:', analysis.rsi);
console.log('Signal:', analysis.signal);
console.log('Support:', analysis.support);
console.log('Resistance:', analysis.resistance);
```

#### Exchange Flow Monitoring

```javascript
const flows = await tracker.getExchangeFlows('ETH', {
  exchange: 'all_exchange',
  window: 'day'
});

console.log('Inflow:', flows.inflow.total24h);
console.log('Outflow:', flows.outflow.total24h);
console.log('Net Flow:', flows.netflow.netBalance);
console.log('Market Impact:', flows.marketImpact);
```

#### Custom Event Handling

```javascript
// Whale detection
tracker.on('whale_detected', (whale) => {
  if (whale.amount > 100000) {
    // Large whale detected
    sendUrgentNotification(whale);
  }
});

// Technical signals
tracker.on('trading_signal', (signal) => {
  if (signal.strength > 0.8) {
    executeTrade(signal);
  }
});

// Flow alerts
tracker.on('flow_alert', (alert) => {
  if (alert.severity === 'high') {
    adjustPositions(alert);
  }
});
```

## 📚 API Reference

### WhaleTracker Class

#### Constructor

```javascript
new WhaleTracker(config)
```

#### Methods

- `initialize()` - Initialize the tracker
- `startMonitoring(symbol, options)` - Start monitoring a symbol
- `stopMonitoring(symbol)` - Stop monitoring a symbol
- `analyzeCoin(symbol, options)` - Perform technical analysis
- `getExchangeFlows(symbol, options)` - Get exchange flow data
- `addAlert(symbol, price, type, options)` - Add price alert
- `removeAlert(alertId)` - Remove an alert
- `startDashboard(symbols, options)` - Start live dashboard
- `getStatus()` - Get current status
- `shutdown()` - Clean shutdown

#### Events

- `initialized` - Tracker initialized
- `whale_detected` - Whale movement detected
- `price_update` - Price updated
- `price_alert` - Price alert triggered
- `trading_signal` - Trading signal generated
- `flow_alert` - Exchange flow alert
- `error` - Error occurred

## 🏗️ Project Structure

```
binance-whale-tracker/
├── src/
│   ├── index.js              # Main entry point
│   ├── core/                 # Core modules
│   │   ├── config.js        # Configuration management
│   │   ├── logger.js        # Logging system
│   │   └── error-handler.js # Error handling
│   ├── api/                 # API clients
│   │   ├── binance-api.js  # Binance integration
│   │   └── cryptoquant.js  # CryptoQuant integration
│   ├── monitors/            # Monitoring services
│   │   ├── technical-analyzer.js
│   │   ├── exchange-flow-monitor.js
│   │   └── price-monitor.js
│   ├── alerts/              # Alert system
│   │   ├── alert-manager.js
│   │   └── telegram-notifier.js
│   └── dashboard/           # Dashboard components
├── bin/                     # CLI executables
├── examples/               # Usage examples
├── test/                   # Test files
└── package.json
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for educational and informational purposes only. Cryptocurrency trading carries substantial risk. Always do your own research and never invest more than you can afford to lose.

## 🙏 Acknowledgments

- Binance API for market data
- CryptoQuant for on-chain analytics
- The open-source community

## 📞 Support

- **Documentation:** [Full Docs](https://github.com/yourusername/binance-whale-tracker/wiki)
- **Issues:** [GitHub Issues](https://github.com/yourusername/binance-whale-tracker/issues)
- **Discord:** [Join our community](https://discord.gg/your-invite)

---

Built with ❤️ by the crypto community