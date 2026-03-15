/**
 * Express middleware that rejects requests with 403 when no sale period is open.
 * Usage: router.post('/orders', verifyToken, requireActivePeriod(db), handler)
 */
function requireActivePeriod(db) {
    return function (req, res, next) {
        db.getActiveSalePeriod((err, activePeriod) => {
            if (err) {
                return res.status(500).json({ error: 'Database error checking sale period' });
            }
            if (!activePeriod) {
                return res.status(403).json({
                    error: 'No hay una jornada abierta. Abre una jornada antes de continuar.'
                });
            }
            req.activePeriod = activePeriod;
            next();
        });
    };
}

module.exports = requireActivePeriod;
