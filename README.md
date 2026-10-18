# NebulousSearch Cypress Frontend Automation Test Suite

Hello and welcome to the NebulousSearch project! My name is Cayto Nova, 32yr old Sr. Technical QA Analyst with over 10 years of experience, and also the creator of this project. You can learn more about my professional profile at (https://caytonova.work). NebulousSearch is a small, browser-based test email-threat dashboard paired with a Cypress end-to-end testing suite. It is designed as a practical portfolio example of UI automation, quality assurance, basic cybersecurity concepts, and accessibility-minded development.

The application presents a Command Center, Quarantine Vault, and Threat Intel page. Its local backend supplies sample messages and deterministic rule-based matching so that tests can verify real UI state changes without connecting to an email account or external service.

## Project Origin
The concept of NebulousSearch began as an experiment with Google Apps Scripts. At the time, my personal email was receiving occasional spikes in spam – sometimes it was bad, other times it wasn’t so bad. Although Gmail has excellent spam filtering capabilities and allows you to set up custom searches, those features weren’t enough to stop the highly sophisticated phishing attacks that we see today. Spam bots use algorithms to continually change how they evade your filters; each time they send a new malicious payload and/or generate a new sender address.

Therefore, simply labeling a sender as "spam" will not prevent the next email from coming from a different, newly created bot address.

However, I noticed a trend: all of these emails used unusual subject lines and/or body text.

For instance, many of them would try to hide keywords/phrases (such as Life Insurance Quote OR Claim Your Loan) by separating them with multiple periods (e.g., Clai.m Y.ou.r L.o.a.n ). This led me to believe that I could develop a JavaScript function using Regular Expressions (Regex) to filter out emails that contain more than two consecutive periods or words separated by punctuation. This led to the creation of NebulousSearch and became a fun way pracrice JavaScript and advanced Regex heuristics while also being a great oppourtunity to showcases my test automation skills, quality assurance approach, cybersecurity mindset, and accessibilit+ui/ux testing skill. 

**Note on the Automation Suite:** The application housed in this specific repository is a front-end test designed *solely* to demonstrate my skills in Software Quality Assurance and Cypress test automation. It uses deterministic test-backend data rather than connecting to a live inbox. This decoupling is necessary due to the severe iframe and API limitations inherent to testing live Google Apps Script environments, which is detailed further below.

## Purpose and scope

This repository demonstrates how to:

- Build an interactive test interface that Cypress can exercise in a real browser.
- Model a backend contract locally and provide deterministic, repeatable fixtures.
- Test behavior from both ends: individual filter rules and complete user journeys.
- Assert visible outcomes (counts, search results, dialogs, loading states, announcements), not just that a test command ran.
- Cover positive and negative examples, idempotency, whitelist behavior, and untrusted input.
- Automate selected accessibility checks using axe, keyboard interactions, accessible names, live regions, and responsive viewport assertions.
- Expose the active Cypress test and step in the test UI while a run is in progress.

This is a demonstration and test harness, not a deployed mail security product. It does not connect to Gmail, scan real mail, provide threat intelligence, establish sender reputation, or guarantee detection of phishing or malware. Filter matches are simple heuristics over test data and should be treated as review signals, not proof of maliciousness.

## Features

- **Command Center:** Shows seeded quarantine statistics, toggles the test filters, and allows exact sender addresses to be added to a local whitelist.
- **Quarantine Vault:** Searches the fixture messages by sender or subject, filters by rule, and opens an email detail dialog.
- **Threat Intel:** Explains all nine deterministic test rules with their matching signals and representative examples.
- **Cyber News:** Displays local article fixtures and opens an article detail dialog.
- **Sample inbox scan:** Applies saved test filter settings to 11 deterministic messages, skips whitelisted senders, and reports the result in the UI.
- **Visible test progress:** The local progress endpoint lets the browser app display the active test and its current step.

## Requirements

- Node.js and npm. The GitHub Actions workflow currently exercises Node.js 18, 20, and 22; use a version supported by the installed Cypress release.
- A supported Cypress browser/runtime. Cypress installs Electron with the project dependencies; Linux headless runs may require the standard Cypress system libraries.
- For `npm test`, a graphical display (or virtual display such as Xvfb) is needed because the repository wrapper opens the headed Cypress runner.
- For the manual `test:ci` command, the test app must be running at `http://localhost:8080`.
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

This starts the test app and test-progress server on port 8081, launches Cypress in headed mode, and leaves the Cypress runner open after the run so results can be reviewed. In VS Code Remote, port 8081 is configured for automatic forwarding and browser opening. Close the Cypress runner to end the wrapper command.

### Open Cypress interactively

```sh
npm run cy:open
```

Choose `.github/workflows/nebulous.cy.js` in the Cypress window. The wrapper starts the progress-enabled server on port 8081.

### Headless/CI-style run

Start the static test app in one terminal:

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
| [`.github/workflows/Index.html`](./.github/workflows/Index.html) | Single-page test UI, styles, interaction handlers, and progress display. |
| [`scripts/test-backend.js`](./scripts/test-backend.js) | Filter registry, matcher functions, fixtures, stateful test service, and Google Apps Script-compatible callback facade. |
| [`scripts/serve.js`](./scripts/serve.js) | Local static-file server and validated `/__test-progress` endpoint. |
| [`scripts/run-cypress.js`](./scripts/run-cypress.js) | Starts the progress server and launches the headed Cypress runner. |
| [`.github/workflows/nebulous.cy.js`](./.github/workflows/nebulous.cy.js) | Filter-rule, UI, accessibility, security-input, and end-to-end tests. |
| [`cypress.config.js`](./cypress.config.js) | Cypress base URL, spec location, and runner memory configuration. |
| [`.github/workflows/node.js.yml`](./.github/workflows/node.js.yml) | CI dependency install, test server readiness check, and headless test execution. |
| [`docs/TECHNICAL-DOCUMENTATION.md`](./docs/TECHNICAL-DOCUMENTATION.md) | System architecture, data flow, quality strategy, test coverage, and known limitations. |

## Quality and accessibility notes

The suite includes axe scans tagged for WCAG 2.0 A/AA and Section 508 on selected rendered views and dialogs. It also exercises document semantics, names and text alternatives, keyboard activation, visible focus, dialog dismissal and focus restoration, live-result regions, a 320px viewport, and text-spacing overrides. These checks provide automated evidence for specific behaviors; they do not certify compliance.

Manual review with screen readers and other assistive technologies, speech input, real devices, and visual judgment is still required. See the [technical documentation](./docs/TECHNICAL-DOCUMENTATION.md) for the full scope and limitations.


