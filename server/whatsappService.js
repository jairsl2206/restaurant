const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

let client;
let qrCodeData = null;
let isReady = false;

const initializeClient = () => {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            args: ['--no-sandbox']
        }
    });

    client.on('qr', (qr) => {
        console.log('QR Code received from WhatsApp');
        // Convert QR text to Data URL for frontend
        qrcode.toDataURL(qr, (err, url) => {
            if (err) {
                console.error('Error generating QR image', err);
                return;
            }
            qrCodeData = url;
            isReady = false;
        });
    });

    client.on('ready', () => {
        console.log('WhatsApp Client is ready!');
        isReady = true;
        qrCodeData = null; // Clear QR code once connected
    });

    client.on('authenticated', () => {
        console.log('WhatsApp Authenticated');
    });

    client.on('auth_failure', (msg) => {
        console.error('WhatsApp Auth Failure', msg);
    });

    client.on('disconnected', (reason) => {
        console.log('WhatsApp Disconnected', reason);
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

const sendMessage = async (number, message) => {
    if (!isReady) {
        console.log('WhatsApp not ready, cannot send message');
        return false;
    }

    try {
        // Format number: remove symbols, ensure country code. 
        // Assuming user puts local number, we might need a default country code setting, 
        // but for now let's assume they put the full number or simple cleaning.
        // WhatsApp Web JS expects '1234567890@c.us'

        let formattedNumber = number.replace(/\D/g, '');

        // Basic check, if no country code (length 10 for Mexico etc), might need to add it.
        // For safe implementation, ask user to provide full number with country code.

        if (!formattedNumber.includes('@c.us')) {
            formattedNumber = `${formattedNumber}@c.us`;
        }

        await client.sendMessage(formattedNumber, message);
        console.log(`WhatsApp message sent to ${number}`);
        return true;
    } catch (err) {
        console.error('Error sending WhatsApp message:', err);
        return false;
    }
};

module.exports = {
    initializeClient,
    getStatus,
    sendMessage
};
