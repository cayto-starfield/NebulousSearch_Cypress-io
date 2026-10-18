# NebulousSearch Cypress Mock Application

NebulousSearch is a small, browser-based mock email-threat dashboard paired with a Cypress end-to-end testing suite. It is designed as a practical portfolio example of UI automation, quality assurance, basic cybersecurity concepts, and accessibility-minded development.

The application presents a Command Center, Quarantine Vault, and Threat Intel page. Its local mock backend supplies sample messages and deterministic rule-based matching so that tests can verify real UI state changes without connecting to an email account or external service.

## Project Origin
The idea for NebulousSearch originally started as a Google Apps Script experiment. My personal inbox was experiencing intermittent waves of spam—rolling in and out like the weather. While Gmail’s built-in spam and custom search filters are good, they lacked the aggressive, strict criteria needed to intercept modern phishing campaigns.

Spam bots algorithmically cycle through filter evasion techniques, generating new malicious payloads and sender addresses for every single email. Simply marking a sender as "spam" is ineffective when the next email comes from a newly generated bot address. 

However, I started noticing a pattern: these emails consistently relied on anomalous subject lines and body structures. For example, they would obfuscate flag words by parsing them with multiple periods (e.g., `p.a.y.p.a.l`). That gave me the idea to create a JavaScript function using Regular Expressions (Regex) to block emails containing more than two consecutive periods or words spaced out by punctuation. 

The project spawned from there as a great way to tinker with JavaScript and advanced Regex heuristics. 

**Note on the Automation Suite:** The application housed in this specific repository is a front-end mock designed *solely* to demonstrate my skills in Software Quality Assurance and Cypress test automation. It uses deterministic mock-backend data rather than connecting to a live inbox. This decoupling is necessary due to the severe iframe and API limitations inherent to testing live Google Apps Script environments, which is detailed further below.

## Purpose and scope

This repository demonstrates how to:

- Build an interactive mock interface that Cypress can exercise in a real browser.
- Model a backend contract locally and provide deterministic, repeatable fixtures.
- Test behavior from both ends: individual filter rules and complete user journeys.
- Assert visible outcomes (counts, search results, dialogs, loading states, announcements), not just that a test command ran.
- Cover positive and negative examples, idempotency, whitelist behavior, and untrusted input.
- Automate selected accessibility checks using axe, keyboard interactions, accessible names, live regions, and responsive viewport assertions.
- Expose the active Cypress test and step in the mock UI while a run is in progress.

This is a demonstration and test harness, not a deployed mail security product. It does not connect to Gmail, scan real mail, provide threat intelligence, establish sender reputation, or guarantee detection of phishing or malware. Filter matches are simple heuristics over mock data and should be treated as review signals, not proof of maliciousness.

## Features

- **Command Center:** Shows seeded quarantine statistics, toggles the mock filters, and allows exact sender addresses to be added to a local whitelist.
- **Quarantine Vault:** Searches the fixture messages by sender or subject, filters by rule, and opens an email detail dialog.
- **Threat Intel:** Explains all nine deterministic mock rules with their matching signals and representative examples.
- **Cyber News:** Displays local article fixtures and opens an article detail dialog.
- **Sample inbox scan:** Applies saved mock filter settings to 11 deterministic messages, skips whitelisted senders, and reports the result in the UI.
- **Visible test progress:** The local progress endpoint lets the browser app display the active test and its current step.

## Requirements

- Node.js and npm. The GitHub Actions workflow currently exercises Node.js 18, 20, and 22; use a version supported by the installed Cypress release.
- A supported Cypress browser/runtime. Cypress installs Electron with the project dependencies; Linux headless runs may require the standard Cypress system libraries.
- For `npm test`, a graphical display (or virtual display such as Xvfb) is needed because the repository wrapper opens the headed Cypress runner.
- For the manual `test:ci` command, the mock app must be running at `http://localhost:8080`.
- Internet access is only needed for the remotely hosted decorative wallpaper and article imagery; the application data and test fixtures are local.

## Install

From the repository root:

```sh
npm ci
```

## Run the application and tests

### Visible Cypress run

```sh
npm test
```

This starts the mock app and test-progress server on port 8081, launches Cypress in headed mode, and leaves the Cypress runner open after the run so results can be reviewed. In VS Code Remote, port 8081 is configured for automatic forwarding and browser opening. Close the Cypress runner to end the wrapper command.

### Open Cypress interactively

```sh
npm run cy:open
```

Choose `.github/workflows/nebulous.cy.js` in the Cypress window. The wrapper starts the progress-enabled server on port 8081.

### Headless/CI-style run

Start the static mock app in one terminal:

```sh
npm run serve
```

Then run the suite in another terminal:

```sh
npm run test:ci
```

`npm run test:ci` expects the app at `http://localhost:8080`; it does not start a server itself. The GitHub Actions workflow starts the app, waits for readiness, runs Cypress under Xvfb, and stops the app when the job ends.

## Project map

| Path | Responsibility |
| --- | --- |
| [`.github/workflows/Index.html`](./.github/workflows/Index.html) | Single-page mock UI, styles, interaction handlers, and progress display. |
| [`scripts/mock-backend.js`](./scripts/mock-backend.js) | Filter registry, matcher functions, fixtures, stateful mock service, and Google Apps Script-compatible callback facade. |
| [`scripts/serve.js`](./scripts/serve.js) | Local static-file server and validated `/__test-progress` endpoint. |
| [`scripts/run-cypress.js`](./scripts/run-cypress.js) | Starts the progress server and launches the headed Cypress runner. |
| [`.github/workflows/nebulous.cy.js`](./.github/workflows/nebulous.cy.js) | Filter-rule, UI, accessibility, security-input, and end-to-end tests. |
| [`cypress.config.js`](./cypress.config.js) | Cypress base URL, spec location, and runner memory configuration. |
| [`.github/workflows/node.js.yml`](./.github/workflows/node.js.yml) | CI dependency install, mock server readiness check, and headless test execution. |
| [`docs/TECHNICAL-DOCUMENTATION.md`](./docs/TECHNICAL-DOCUMENTATION.md) | System architecture, data flow, quality strategy, test coverage, and known limitations. |

## Quality and accessibility notes

The suite includes axe scans tagged for WCAG 2.0 A/AA and Section 508 on selected rendered views and dialogs. It also exercises document semantics, names and text alternatives, keyboard activation, visible focus, dialog dismissal and focus restoration, live-result regions, a 320px viewport, and text-spacing overrides. These checks provide automated evidence for specific behaviors; they do not certify compliance.

Manual review with screen readers and other assistive technologies, speech input, real devices, and visual judgment is still required. See the [technical documentation](./docs/TECHNICAL-DOCUMENTATION.md) for the full scope and limitations.
