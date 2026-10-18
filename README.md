# NebulousSearch_Cypress-io
Front end ui + accessibility test automation framework

## Run the tests

Run the tests in a visible browser with the Cypress runner and command log shown. The tests start automatically, and the runner stays open when they finish so you can review the results. Close the Cypress window to end the command. The local mock server starts automatically if needed:

```sh
npm test
```

The mock interface is loaded in the Cypress browser for each test, so the runner displays the test interactions and results alongside the app.

To open the Cypress runner and choose tests manually:

```sh
npm run cy:open
```

Select `nebulous.cy.js` in the Cypress window. This command starts the local server automatically.

For headless runs (as used in CI):

```sh
npm run test:ci
```

The GitHub Actions workflow starts and stops the server automatically.
