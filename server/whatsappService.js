const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const logger = require('./logger');

let client;
let qrCodeData = null;
let isReady = false;

const initializeClient = () => {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            args: ['--no-sandbox'],
            protocolTimeout: 60000 // Increase to 60 seconds
        }
    });

    client.on('qr', (qr) => {
        logger.info('QR Code received from WhatsApp');
        // Convert QR text to Data URL for frontend
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
        qrCodeData = null; // Clear QR code once connected
    });

    client.on('authenticated', () => {
        logger.info('WhatsApp Authenticated');
    });

    client.on('auth_failure', (msg) => logger.error('WhatsApp auth failure:', msg));

    client.on('disconnected', (reason) => {
        logger.info(`WhatsApp Disconnected: ${reason}`);
        isReady = false;
        client.initialize(); // Auto reconnect
    });

    client.initialize();
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

    // Return cache if it's still valid
    if (cachedGroups.length > 0 && (Date.now() - lastFetchTime < CACHE_DURATION)) {
        logger.info('Returning cached groups');
        return cachedGroups;
    }
    try {
        logger.info('Fetching chats to find groups...');
        const chats = await client.getChats();
        logger.info(`Found ${chats.length} total chats`);
        const groups = chats
            .filter(chat => chat.isGroup)
            .map(chat => ({
                id: chat.id._serialized,
                name: chat.name || chat.id.user || 'Grupo sin nombre'
            }));
        cachedGroups = groups;
        lastFetchTime = Date.now();
        logger.info(`Found ${groups.length} groups`);
        return groups;
    } catch (err) {
        logger.error('Error fetching groups:', err);
        return cachedGroups; // Return last known good state on error
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

    // The session folder .wwebjs_auth should be manually cleared if we want a fresh start
    // but Logout usually handles it. For now, let's just re-init.
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
