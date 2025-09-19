/**
 * Telegram Notifier Module
 */

const EventEmitter = require('events');

class TelegramNotifier extends EventEmitter {
    constructor(config = {}) {
        super();
        this.botToken = config.botToken;
        this.chatId = config.chatId;
        this.enabled = config.enabled !== false;
        this.bot = null;

        // Rate limiting
        this.lastSendTime = 0;
        this.minInterval = 1000; // 1 second between messages
        this.messageQueue = [];
        this.processing = false;
    }

    /**
     * Initialize the Telegram bot
     */
    async initialize() {
        if (!this.enabled || !this.botToken) {
            console.log('Telegram notifier disabled or no token provided');
            return false;
        }

        try {
            // For now, we'll just mark as initialized
            // In production, you'd use node-telegram-bot-api here
            this.bot = true; // Placeholder
            this.emit('initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize Telegram bot:', error);
            this.enabled = false;
            return false;
        }
    }

    /**
     * Send notification
     */
    async send(notification) {
        if (!this.enabled || !this.bot) {
            return false;
        }

        // Add to queue
        this.messageQueue.push(notification);

        // Process queue if not already processing
        if (!this.processing) {
            await this.processQueue();
        }

        return true;
    }

    /**
     * Process message queue
     */
    async processQueue() {
        if (this.processing || this.messageQueue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.messageQueue.length > 0) {
            const notification = this.messageQueue.shift();

            // Rate limiting
            const now = Date.now();
            const timeSinceLastSend = now - this.lastSendTime;
            if (timeSinceLastSend < this.minInterval) {
                await this.sleep(this.minInterval - timeSinceLastSend);
            }

            try {
                await this.sendMessage(notification);
                this.lastSendTime = Date.now();
            } catch (error) {
                console.error('Failed to send Telegram message:', error);
                this.emit('send_error', { notification, error });
            }
        }

        this.processing = false;
    }

    /**
     * Send a single message
     */
    async sendMessage(notification) {
        const message = this.formatMessage(notification);

        // In production, you'd use the Telegram bot API here
        console.log(`[Telegram] Would send: ${message}`);

        // Simulate sending
        this.emit('message_sent', {
            chatId: this.chatId,
            message,
            notification
        });

        return true;
    }

    /**
     * Format message
     */
    formatMessage(notification) {
        let message = '';

        // Add emoji based on type
        if (notification.type === 'WHALE_DETECTED') {
            message += '🐋 ';
        } else if (notification.type === 'PRICE_ALERT') {
            message += notification.direction === 'above' ? '📈 ' : '📉 ';
        } else if (notification.type === 'FLOW_ALERT') {
            message += '🔄 ';
        } else {
            message += '📢 ';
        }

        // Add title
        if (notification.symbol) {
            message += `${notification.symbol}\n`;
        }

        // Add main message
        if (notification.message) {
            message += `${notification.message}\n`;
        }

        // Add details
        if (notification.price) {
            message += `Price: $${notification.price}\n`;
        }

        if (notification.amount) {
            message += `Amount: ${notification.amount}\n`;
        }

        if (notification.impact) {
            message += `Impact: ${notification.impact}\n`;
        }

        // Add timestamp
        message += `\n⏰ ${new Date().toLocaleTimeString()}`;

        return message;
    }

    /**
     * Send test message
     */
    async sendTest() {
        return this.send({
            type: 'TEST',
            message: 'Test notification from Binance Whale Tracker',
            timestamp: new Date()
        });
    }

    /**
     * Cleanup
     */
    async cleanup() {
        // Process remaining messages
        if (this.messageQueue.length > 0) {
            await this.processQueue();
        }

        // Close bot connection
        if (this.bot) {
            // In production, you'd close the bot connection here
            this.bot = null;
        }

        this.emit('cleanup');
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if notifier is ready
     */
    isReady() {
        return this.enabled && this.bot !== null;
    }

    /**
     * Get queue status
     */
    getQueueStatus() {
        return {
            queued: this.messageQueue.length,
            processing: this.processing,
            enabled: this.enabled,
            ready: this.isReady()
        };
    }
}

module.exports = TelegramNotifier;