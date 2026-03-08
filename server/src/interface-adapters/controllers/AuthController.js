/**
 * AuthController — handles login
 */
class AuthController {
    constructor({ loginUserUseCase }) {
        this.loginUserUseCase = loginUserUseCase;
    }

    async login(req, res, next) {
        try {
            const { username, password } = req.body;
            const result = await this.loginUserUseCase.execute({ username, password });
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    async verifySession(req, res, next) {
        try {
            // User is already attached by AuthMiddleware
            res.json({
                success: true,
                user: req.user
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = AuthController;
