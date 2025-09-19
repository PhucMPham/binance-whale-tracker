#!/usr/bin/env node

/**
 * Quick Start Example
 * This example shows how to get started with the Binance Whale Tracker
 */

const { WhaleTracker } = require('../src');
const chalk = require('chalk');

async function quickStart() {
    console.log(chalk.cyan('\n🐋 Binance Whale Tracker - Quick Start\n'));
    console.log(chalk.gray('='). repeat(50));

    try {
        // Step 1: Initialize the tracker
        console.log(chalk.yellow('\n1. Initializing tracker...'));
        const tracker = new WhaleTracker({
            // Uses environment variables by default
            // You can also pass config directly here
        });

        // Note: This will use mock data if no API keys are configured
        await tracker.initialize();
        console.log(chalk.green('✅ Tracker initialized'));

        // Step 2: Analyze a coin
        console.log(chalk.yellow('\n2. Analyzing BTCUSDT...'));
        const analysis = await tracker.analyzeCoin('BTCUSDT', {
            interval: '1h',
            simple: true  // Simple mode for quick results
        });

        console.log(chalk.white('\n📊 Analysis Results:'));
        console.log(`  Current Price: $${analysis.currentPrice || 'N/A'}`);
        console.log(`  24h Change: ${analysis.change24h || 'N/A'}%`);
        console.log(`  Signal: ${analysis.signal || 'NEUTRAL'}`);

        // Step 3: Check tracker status
        console.log(chalk.yellow('\n3. Checking status...'));
        const status = tracker.getStatus();
        console.log(chalk.white('\n📈 Tracker Status:'));
        console.log(`  Initialized: ${status.initialized ? '✅' : '❌'}`);
        console.log(`  Binance API: ${status.apis.binance ? '✅' : '❌'}`);
        console.log(`  CryptoQuant API: ${status.apis.cryptoQuant ? '✅' : '❌'}`);
        console.log(`  Telegram: ${status.apis.telegram ? '✅' : '❌'}`);

        // Step 4: Event listeners example
        console.log(chalk.yellow('\n4. Setting up event listeners...'));

        tracker.on('price_update', (update) => {
            console.log(chalk.cyan(`  💰 Price Update: ${update.symbol} - $${update.price}`));
        });

        tracker.on('whale_detected', (whale) => {
            console.log(chalk.magenta(`  🐋 Whale Alert: ${whale.amount} ${whale.symbol}`));
        });

        console.log(chalk.green('✅ Event listeners configured'));

        // Step 5: Clean shutdown
        console.log(chalk.yellow('\n5. Shutting down...'));
        await tracker.shutdown();
        console.log(chalk.green('✅ Tracker shut down cleanly'));

        // Success!
        console.log(chalk.green('\n✨ Quick start completed successfully!'));
        console.log(chalk.cyan('\n📚 Next Steps:'));
        console.log('  1. Configure your API keys in .env file');
        console.log('  2. Try the CLI commands: whale-tracker --help');
        console.log('  3. Check out more examples in the examples/ directory');
        console.log('  4. Read the full documentation in README.md');

        console.log(chalk.gray('\n' + '='.repeat(50)));

    } catch (error) {
        console.error(chalk.red('\n❌ Error:'), error.message);
        console.log(chalk.yellow('\n💡 Tip: Make sure you have:'));
        console.log('  1. Installed all dependencies: npm install');
        console.log('  2. Created .env file with your API keys (optional)');
        console.log('  3. Have internet connection for API calls');
        process.exit(1);
    }
}

// Run the quick start
if (require.main === module) {
    quickStart();
}

module.exports = { quickStart };