/**
 * UserController — CRUD for users
 */
class UserController {
    constructor({ getUsersUseCase, createUserUseCase, updateUserUseCase, deleteUserUseCase }) {
        this.getUsersUseCase = getUsersUseCase;
        this.createUserUseCase = createUserUseCase;
        this.updateUserUseCase = updateUserUseCase;
        this.deleteUserUseCase = deleteUserUseCase;
    }

    async getUsers(req, res, next) {
        try {
            const users = await this.getUsersUseCase.execute();
            res.json(users.map(u => u.toJSON()));
        } catch (err) { next(err); }
    }

    async createUser(req, res, next) {
        try {
            const { username, password, role } = req.body;
            const user = await this.createUserUseCase.execute({ username, password, role });
            res.status(201).json(user.toJSON());
        } catch (err) { next(err); }
    }

    async updateUser(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            const user = await this.updateUserUseCase.execute({ id, ...req.body });
            res.json(user.toJSON());
        } catch (err) { next(err); }
    }

    async deleteUser(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            const result = await this.deleteUserUseCase.execute({ id });
            res.json(result);
        } catch (err) { next(err); }
    }
}

module.exports = UserController;
