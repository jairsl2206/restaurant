const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ValidationError, UnauthorizedError } = require('../../shared/errors/errorTypes');

/**
 * LoginUser Use Case
 * Authenticates a user and returns a JWT token.
 */
class LoginUser {
    constructor(userRepository, jwtSecret, jwtExpiresIn = '6h') {
        this.userRepository = userRepository;
        this.jwtSecret = jwtSecret;
        this.jwtExpiresIn = jwtExpiresIn;
    }

    async execute({ username, password }) {
        if (!username || !password) {
            throw new ValidationError('Username and password are required');
        }

        const user = await this.userRepository.findByUsername(username);
        if (!user) {
            throw new UnauthorizedError('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid credentials');
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role.value },
            this.jwtSecret,
            { expiresIn: this.jwtExpiresIn }
        );

        return { token, user: user.toJSON() };
    }
}

module.exports = LoginUser;
