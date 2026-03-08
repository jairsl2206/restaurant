class WhatsAppUseCases {
    constructor(whatsappService) {
        this.whatsappService = whatsappService;
    }

    async getStatus() {
        return this.whatsappService.getStatus();
    }

    async getGroups() {
        return await this.whatsappService.getGroups();
    }

    async resetSession() {
        return await this.whatsappService.resetSession();
    }
}

module.exports = WhatsAppUseCases;
