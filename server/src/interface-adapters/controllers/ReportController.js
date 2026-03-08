class ReportController {
    constructor({ getSalesReport }) {
        this.getSalesReportUseCase = getSalesReport;
    }

    async getSalesReport(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            const report = await this.getSalesReportUseCase.execute({ startDate, endDate });
            res.json(report);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = ReportController;
