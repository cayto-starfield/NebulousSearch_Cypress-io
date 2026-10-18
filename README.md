# NebulousSearch_Cypress-io
Front end ui + accessibility test automation framework

## Run the tests

Run the tests with `npm test`. The test-progress server starts on port 8081, and VS Code automatically forwards that port and opens the mock interface. The interface replays the current test, step, tab, and purge activity in its status panel while Cypress runs. The Cypress runner stays open when the suite finishes so you can review its results. Close the runner window to end the command.

To open the Cypress runner and choose tests manually:

```sh
npm run cy:open
```

Select `nebulous.cy.js` in the Cypress window. This command starts the test-progress server automatically; VS Code opens the mock interface when the port is forwarded.

For headless runs (as used in CI):

```sh
npm run test:ci
```

The GitHub Actions workflow starts and stops the server automatically.

## Accessibility coverage

The Cypress suite runs axe Section 508/WCAG checks on the dashboard, quarantine results, expanded analytics, and both modal types. It also checks document semantics, accessible names and states, keyboard operation and focus visibility, live search-result announcements, and reflow at a 320px viewport. Screen-reader usability, speech input, physical-device behavior, and visual judgment still require manual assistive-technology testing.
