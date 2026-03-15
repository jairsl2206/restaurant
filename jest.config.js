module.exports = {
    verbose: true,
    projects: [
        {
            displayName: 'server',
            testEnvironment: 'node',
            roots: ['<rootDir>/server/__tests__'],
            moduleFileExtensions: ['js'],
            testMatch: ['**/__tests__/**/*.test.js'],
            collectCoverageFrom: ['server/src/**/*.js'],
            coveragePathIgnorePatterns: ['/node_modules/']
        },
        {
            displayName: 'client',
            testEnvironment: 'jsdom',
            roots: ['<rootDir>/client/__tests__'],
            moduleFileExtensions: ['js', 'jsx'],
            testMatch: ['**/__tests__/**/*.test.js'],
            collectCoverageFrom: ['client/src/**/*.js'],
            coveragePathIgnorePatterns: ['/node_modules/'],
            // Transform ES module source files to CommonJS for Jest compatibility
            transform: {
                '^.+\\.jsx?$': '<rootDir>/jest-esm-transform.js'
            }
        }
    ],
    coverageDirectory: 'coverage',
    collectCoverage: false
};
