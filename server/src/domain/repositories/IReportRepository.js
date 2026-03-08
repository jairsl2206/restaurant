/**
 * IReportRepository
 * Interface for generating business reports
 */
class IReportRepository {
    /**
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate - YYYY-MM-DD
     */
    async getSalesReport(startDate, endDate) {
        throw new Error('Method not implemented');
    }
}

module.exports = IReportRepository;
