const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const SESSION_DIR = path.join(__dirname, '..', '.wwebjs_auth');

let client;
let qrCodeData = null;
let isReady = false;

const initializeClient = () => {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            args: ['--no-sandbox'],
            protocolTimeout: 60000
        }
    });

    client.on('qr', (qr) => {
        logger.info('QR Code received from WhatsApp');
        qrcode.toDataURL(qr, (err, url) => {
            if (err) {
                logger.error('Error generating QR image', err);
                return;
            }
            qrCodeData = url;
            isReady = false;
        });
    });

    client.on('loading_screen', (percent, message) => {
        logger.info(`WhatsApp Loading: ${percent}% ${message}`);
    });

    client.on('ready', () => {
        logger.info('WhatsApp Client is ready');
        isReady = true;
        qrCodeData = null;
    });

    client.on('authenticated', () => {
        logger.info('WhatsApp Authenticated');
    });

    client.on('auth_failure', (msg) => logger.error('WhatsApp auth failure:', msg));

    client.on('disconnected', (reason) => {
        logger.info(`WhatsApp Disconnected: ${reason}`);
        isReady = false;
        try {
            client.initialize();
        } catch (err) {
            logger.error('Error reconnecting after disconnect:', err);
        }
    });

    try {
        client.initialize();
    } catch (err) {
        logger.error('Error initializing WhatsApp client:', err);
    }
};

const getStatus = () => {
    return {
        isReady,
        qrCode: qrCodeData
    };
};

let cachedGroups = [];
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

const getGroups = async () => {
    if (!isReady) {
        logger.info('getGroups called but client is not ready');
        return [];
    }

    if (cachedGroups.length > 0 && (Date.now() - lastFetchTime < CACHE_DURATION)) {
        logger.info('Returning cached groups');
        return cachedGroups;
    }

    try {
        logger.info('Fetching groups from WhatsApp Web...');
        const page = client.pupPage;

        await page.waitForFunction(
            () => typeof window.require === 'function',
            { timeout: 15000 }
        ).catch(() => {});

        const groups = await page.evaluate(() => {
            try {
                const ChatCollection = window.require('WAWebCollections');
                const models = ChatCollection.Chat.getModelsArray();
                return models
                    .filter(m => m && m.id && m.id._serialized && m.id._serialized.includes('@g.us'))
                    .map(m => ({
                        id: m.id._serialized,
                        name: m.name || m.formattedTitle || 'Grupo sin nombre'
                    }));
            } catch (e) {
                return [];
            }
        });

        cachedGroups = groups;
        lastFetchTime = Date.now();
        logger.info(`Found ${groups.length} groups`);
        return groups;
    } catch (err) {
        logger.error('Error fetching groups:', err.message || err);
        return cachedGroups;
    }
};

const sendMessage = async (number, message) => {
    if (!isReady) {
        logger.info('WhatsApp not ready, cannot send message');
        return false;
    }

    try {
        let formattedNumber = number;

        // If it's not a group ID AND not a private chat ID, assume it's a raw number
        if (!formattedNumber.includes('@g.us') && !formattedNumber.includes('@c.us')) {
            // Clean non-digits
            formattedNumber = formattedNumber.replace(/\D/g, '');
            // Append @c.us if it's a number
            if (formattedNumber.length >= 8) {
                formattedNumber = `${formattedNumber}@c.us`;
            }
        }

        await client.sendMessage(formattedNumber, message);
        logger.info(`WhatsApp message sent to ${formattedNumber}`);
        return true;
    } catch (err) {
        logger.error('Error sending WhatsApp message:', err);
        return false;
    }
};

const resetSession = async () => {
    logger.info('Resetting WhatsApp session...');
    try {
        if (client) {
            await client.logout();
            await client.destroy();
        }
    } catch (err) {
        logger.error('Error during logout/destroy:', err);
    }

    isReady = false;
    qrCodeData = null;

    try {
        if (fs.existsSync(SESSION_DIR)) {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            logger.info('WhatsApp session directory cleared');
        }
    } catch (err) {
        logger.error('Error clearing session directory:', err);
    }

    initializeClient();
    return true;
};

module.exports = {
    initializeClient,
    getStatus,
    getGroups,
    sendMessage,
    resetSession
};
