# NebulousSearch_Cypress-io
Front end ui + accessibility test automation framework

## Run the tests

Run the tests with `npm test`. Cypress executes the tests in its own browser, and the open mock interface mirrors the current test, step, tab, and purge activity in a live status panel. The test runner stays open when the suite finishes so you can review its results. Close the runner window to end the command.

Keep the mock interface open at `http://localhost:8080` while the tests run. The test-progress server starts automatically on port 8081 if it is not already available.

To open the Cypress runner and choose tests manually:

```sh
npm run cy:open
```

Select `nebulous.cy.js` in the Cypress window. This command starts the test-progress server automatically.

For headless runs (as used in CI):

```sh
npm run test:ci
```

The GitHub Actions workflow starts and stops the server automatically.
