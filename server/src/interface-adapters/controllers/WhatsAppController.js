class WhatsAppController {
    constructor({ whatsAppUseCases }) {
        this.whatsAppUseCases = whatsAppUseCases;
    }

    async getStatus(req, res, next) {
        try {
            const status = await this.whatsAppUseCases.getStatus();
            res.json(status);
        } catch (error) {
            next(error);
        }
    }

    async getGroups(req, res, next) {
        try {
            const groups = await this.whatsAppUseCases.getGroups();
            res.json(groups);
        } catch (error) {
            next(error);
        }
    }

    async resetSession(req, res, next) {
        try {
            await this.whatsAppUseCases.resetSession();
            res.json({ success: true, message: 'Reset initiated' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = WhatsAppController;
