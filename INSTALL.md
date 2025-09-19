# 📦 Installation Guide - Binance Whale Tracker

## 🚀 Quick Installation

### Option 1: Global Install (Recommended for CLI usage)

```bash
npm install -g binance-whale-tracker
```

After installation, all CLI commands will be available globally:
```bash
whale-tracker --help
whale-analyze --help
whale-monitor --help
whale-alerts --help
whale-dashboard --help
```

### Option 2: Local Project Install

```bash
# In your project directory
npm install binance-whale-tracker

# Or with yarn
yarn add binance-whale-tracker
```

### Option 3: Install from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/binance-whale-tracker.git
cd binance-whale-tracker

# Install dependencies
npm install

# Link for global CLI usage
npm link

# Or run directly without linking
npm run start
```

## ⚙️ Configuration

### Step 1: Create Configuration File

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your favorite editor
nano .env
# or
vim .env
```

### Step 2: Add Your API Keys

Edit the `.env` file and add your keys:

```env
# Required for full functionality
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_API_SECRET=your_binance_api_secret_here

# For whale tracking (optional but recommended)
CRYPTOQUANT_API_KEY=your_cryptoquant_api_key_here

# For Telegram notifications (optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here
```

### Step 3: Get API Keys

#### Binance API Keys
1. Go to [Binance API Management](https://www.binance.com/en/my/settings/api-management)
2. Create a new API key
3. Save the API Key and Secret Key
4. Enable only "Reading" permissions for security

#### CryptoQuant API Key
1. Visit [CryptoQuant](https://cryptoquant.com/pricing)
2. Sign up for an account
3. Choose a plan (Professional recommended for whale tracking)
4. Get your API key from the dashboard

#### Telegram Bot Setup
1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow instructions
3. Save the bot token
4. Start chat with your bot
5. Get your chat ID from [@userinfobot](https://t.me/userinfobot)

## 🔍 Verify Installation

### Test CLI Installation

```bash
# Check version
whale-tracker --version

# Show available commands
whale-tracker --help

# Quick test
whale-analyze coin BTCUSDT
```

### Test Package Import

Create a test file `test.js`:

```javascript
const { WhaleTracker } = require('binance-whale-tracker');

async function test() {
    const tracker = new WhaleTracker();
    await tracker.initialize();
    console.log('✅ Package imported successfully!');
    await tracker.shutdown();
}

test().catch(console.error);
```

Run the test:
```bash
node test.js
```

## 🐳 Docker Installation (Alternative)

```dockerfile
FROM node:16-alpine
WORKDIR /app
RUN npm install -g binance-whale-tracker
CMD ["whale-tracker", "start"]
```

Build and run:
```bash
docker build -t whale-tracker .
docker run -it --env-file .env whale-tracker
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Command not found
```bash
# If global install didn't work
npx binance-whale-tracker whale-tracker --help

# Or reinstall globally
npm uninstall -g binance-whale-tracker
npm install -g binance-whale-tracker
```

#### 2. Permission errors
```bash
# On macOS/Linux, you might need sudo
sudo npm install -g binance-whale-tracker

# Or fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### 3. API connection issues
```bash
# Test with mock data first
USE_MOCK_DATA=true whale-tracker start

# Check your .env file
cat .env | grep API_KEY
```

#### 4. Module not found errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## 📱 Mobile Setup (Termux)

For Android users using Termux:

```bash
# Install Node.js
pkg install nodejs

# Install git
pkg install git

# Clone and install
git clone https://github.com/yourusername/binance-whale-tracker.git
cd binance-whale-tracker
npm install
npm link
```

## 🖥️ System Requirements

- **Node.js:** v14.0.0 or higher
- **npm:** v6.0.0 or higher
- **RAM:** Minimum 512MB, recommended 1GB
- **Storage:** 100MB for installation
- **Network:** Stable internet connection
- **OS:** Windows, macOS, Linux, or Docker

## ✅ Post-Installation

### 1. Run Quick Start
```bash
whale-tracker start --symbols BTCUSDT ETHUSDT
```

### 2. Set Up Alerts
```bash
whale-alerts add BTCUSDT 50000 --type above --telegram
```

### 3. Start Dashboard
```bash
whale-dashboard live --symbols BTCUSDT ETHUSDT
```

### 4. Monitor Whales
```bash
whale-monitor whales ETH --threshold 1000
```

## 📚 Next Steps

1. Read the [README.md](README.md) for full documentation
2. Check [examples/](examples/) directory for usage examples
3. Join our [Discord community](https://discord.gg/your-invite)
4. Report issues on [GitHub](https://github.com/yourusername/binance-whale-tracker/issues)

## 🆘 Getting Help

- **Documentation:** [Full Docs](README.md)
- **Examples:** [Example Scripts](examples/)
- **Issues:** [GitHub Issues](https://github.com/yourusername/binance-whale-tracker/issues)
- **Community:** [Discord Server](https://discord.gg/your-invite)

---

Installation successful? Start tracking whales! 🐋