class GetSalesReport {
    constructor(reportRepository) {
        this.reportRepository = reportRepository;
    }

    /**
     * @param {Object} params
     * @param {string} params.startDate - YYYY-MM-DD
     * @param {string} params.endDate - YYYY-MM-DD
     */
    async execute({ startDate, endDate }) {
        return await this.reportRepository.getSalesReport(startDate, endDate);
    }
}

module.exports = GetSalesReport;
