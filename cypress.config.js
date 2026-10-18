module.exports = {
  numTestsKeptInMemory: 0,
  e2e: {
    specPattern: '.github/workflows/**/*.cy.js',
    baseUrl: 'http://localhost:8080',
    supportFile: 'cypress/support/e2e.js',
  },
};