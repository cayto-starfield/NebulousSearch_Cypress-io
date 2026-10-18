# NebulousSearch Technical Documentation

## 1. Product intent

NebulousSearch is a browser-based test email-threat dashboard and a Cypress end-to-end testing example. It demonstrates practical testing and quality-assurance techniques against a functioning interface, with particular attention to deterministic test data, observable user outcomes, input handling, keyboard operation, and automated accessibility checks.

The test is intentionally bounded. It does not access a mailbox, send or receive email, call a threat-intelligence service, verify identities or domains, or claim that a message is safe or malicious. Its rules inspect small sample strings using regular expressions and simple conditions. Results are suitable for test demonstrations only.

## 2. Requirements and supported execution

### Development requirements

- Node.js and npm.
- Dependencies installed with `npm ci` from the repository root.
- Cypress 16 and the project’s installed Electron browser, supplied through npm dependencies.
- A display server for the headed `npm test` runner. On Linux/CI, use a supported virtual display such as Xvfb.
- Port 8081 for the headed wrapper’s progress-enabled app, or port 8080 for the plain static server and direct headless Cypress run. The ports must be available.
- Internet access is optional and is only used to load the remotely hosted wallpaper and article imagery; test data and application behavior are local.

The checked-in GitHub Actions workflow uses Node.js 18, 20, and 22. The project should be run with a Node.js version supported by the installed Cypress release and its native/runtime dependencies.

### Commands

| Command | Behavior |
| --- | --- |
| `npm ci` | Installs the exact dependency versions represented by the lockfile. |
| `npm test` | Starts the progress-enabled local server and opens headed Cypress with the runner UI. It is configured not to exit when the test run finishes, so close the runner to end the process. |
| `npm run cy:open` | Starts the progress-enabled server and opens Cypress for manually selecting specs. |
| `npm run serve` | Serves the test app on port 8080; intended for manual use or a separately launched headless run. |
| `npm run test:ci` | Runs Cypress headlessly against `http://localhost:8080`; start `npm run serve` separately first. |

The GitHub Actions workflow starts the port-8080 server, checks its readiness, runs `npm run test:ci` under Xvfb, and cleans up its server process.

## 3. System architecture

```text
                         +---------------------------+
                         | Cypress spec              |
                         | nebulous.cy.js            |
                         +-------------+-------------+
                                       |
                     visitApp() injects|google test
                                       v
+------------------------+   callback facade     +-------------------------+
| Index.html             |<--------------------->| test-backend.js          |
| UI, inline CSS/JS      |                        | filters, fixtures, state |
+------------+-----------+                        +-------------------------+
             |
             | HTTP document/static assets
             v
+-------------------------+
| serve.js                |
| static server +         |
| /__test-progress API    |
+------------+------------+
             ^
             | Cypress progress POSTs / app polls (headed mode)
             |
+------------+------------+       starts/manages
| run-cypress.js          |--------------------------> Cypress + server
| headed runner wrapper   |
+-------------------------+
```

### Components

#### test user interface — `.github/workflows/Index.html`

The single-page interface contains the Command Center, Quarantine Vault, Threat Intel content, cyber-news cards, and email/article dialogs. Its inline browser code loads dashboard/news data, switches tabs, updates the filter settings and whitelist, searches and filters quarantine results, and renders test scan and purge outcomes. Article text and app state come from local fixtures; the wallpaper and article images use remote image URLs.

The page loads `scripts/test-backend.js`. If no `google` object has been provided, it creates a local test automatically so the page can be opened without a Cypress test harness. The `?e2e=1` query parameter disables progress polling during Cypress runs; the tests inject their own test service before the page’s scripts execute.

#### test domain/service layer — `scripts/test-backend.js`

This module is usable in both Node.js and the browser. It exports:

- A canonical registry of nine filter IDs, display names, and descriptions.
- The matcher functions used by both unit-level assertions and sample inbox scanning.
- Seeded quarantine messages (one per filter), a sample inbox of 11 messages, and two article fixtures.
- A stateful service for reading dashboard/quarantine data, saving active filters and whitelist entries, scanning fixtures, and clearing stats/quarantine.
- `createGoogletest(window)`, which supplies a `google.script.run`-shaped chain of success/failure handlers to fit the interface’s callback style.

test calls are scheduled using the supplied window’s `setTimeout` and use controlled delays for loading and scan flows. This creates visible loading states without external services. Individual tests can create a fresh service to avoid sharing filter and quarantine state.

### Filter registry

All filters operate on the test email data; only the fake-invoice matcher inspects subject and body, while the suspicious-sender matcher inspects sender structure. Remaining matchers operate on the subject line.

| ID | Display name | Current test detection behavior |
| --- | --- | --- |
| `excessive_spaces` | Asteroid Belt | Matches subjects with two whitespace gaps of at least five characters, or a six-or-more-letter word whose letters are separated by one or two spaces. |
| `zero_width_chars` | Dark Matter | Matches alphanumeric text interrupted by repeated U+200B–U+200D or U+FEFF characters. |
| `urgent_phishing` | False Gravity | Case-insensitive match for a fixed set: “account suspended,” “action required,” “final warning,” “immediate action required,” or “password expired.” |
| `all_caps_subject` | Solar Flare | Matches a subject with at least six alphabetic characters, all uppercase; an initial `Re:`, `Fwd:`, or `Fw:` prefix is ignored. |
| `crypto_phishing` | Crypto & Wallet Phishing | Case-insensitive match for “bitcoin,” “crypto wallet,” “seed phrase,” or “usdt giveaway.” |
| `fake_invoice` | False Payload | Matches a subject or body containing Geek Squad, McAfee, Norton, or LifeLock followed later by “invoice,” “renewal,” “receipt,” “billed,” or “auto-charge.” |
| `period_obfuscation` | Meteor Shower | Removes whitespace, then matches a sequence of letters separated by periods. |
| `no_alphabetical` | Cosmic Vacuum | Matches an empty/whitespace-only subject or any subject with no Unicode alphabetic character. |
| `suspicious_sender` | Rogue Satellite | Matches a missing sender only as false; otherwise flags addresses over 50 characters, addresses with at least four unusual special characters, a profanity term, or a local part resembling a long hex string, a long vowelless string, or repeated letter/number runs. |

These are deliberately small examples rather than robust detection algorithms. For instance, the sender rule does not query DNS, authenticate a sender, check domain age, or calculate reputation. The Threat Intel page describes implemented behavior as heuristics and warns that a match is not proof.

#### Local HTTP server — `scripts/serve.js`

The server serves repository files and maps `/` to the test interface. It also hosts `/__test-progress`:

- `GET` returns the current progress state and any retained updates after the requested sequence number.
- `POST` accepts a JSON progress update after validating its status, view, action, string fields, and field lengths.
- `OPTIONS` supports browser preflight requests.
- The update history is bounded to 200 entries; sequence numbers let the client replay missed updates after opening or refreshing the app.

The static-file handler resolves requested paths beneath the repository root and rejects traversal outside that root.

#### Test runner wrapper — `scripts/run-cypress.js`

The wrapper supports only `open` and `run`. It checks whether the progress API is already available on port 8081, starts the server if needed, waits for readiness, and launches Cypress with the appropriate command. The headed run includes the runner UI and `--no-exit`, preserving the visible test results until the runner is closed. It handles process signals and child-process errors/exits.

#### Cypress configuration and CI

`cypress.config.js` sets the spec glob, base URL, support file, and `numTestsKeptInMemory: 0` to limit runner snapshot memory for this suite. `cypress/support/e2e.js` loads the Cypress/axe commands. The Node.js GitHub Actions workflow installs dependencies, starts and probes the static app, then invokes the headless suite inside Xvfb across its Node.js matrix.

## 4. Data and control flow

### Browser test setup

The UI spec’s `visitApp()` visits the actual served HTML document and installs `createService().createGoogletest(win)` in `onBeforeLoad`. The real page event handlers then call the test’s familiar `google.script.run.withSuccessHandler(...).method(...)` interface. Cypress checks rendered DOM, keyboard behavior, and visible state changes produced by those calls.

### Fixture lifecycle

1. A new test service begins with nine quarantined messages, one per registered rule.
2. Tests save the selected filter IDs and normalized whitelist values.
3. A sample inbox scan examines 11 deterministic messages, skips messages already quarantined, skips whitelisted senders, and applies active matchers.
4. Newly matched items are appended to quarantine with the matching filter ID and display name.
5. A repeated scan reports zero new quarantines; clearing stats resets the service state so another scan can process the fixtures again.

The service is in-memory only. Reloading the page or creating a new service starts with fixture defaults; there is no persistent database.

### Visible test progress

The Cypress spec posts status, test title, step, current view, and action to the progress endpoint. In headed mode, the app polls progress and renders it in a polite live status panel. The sequence/history mechanism prevents brief test steps from disappearing between polls. In the `?e2e=1` test visit, polling is disabled to keep Cypress tests deterministic and avoid the status panel obscuring assertions.

## 5. Quality strategy and automated test inventory

The spec contains three kinds of coverage:

1. **Rule/service checks:** Test the test domain logic and fixture invariants without browser timing.
2. **Browser behavior checks:** Exercise interactions through Cypress and assert the app’s rendered result.
3. **Cross-cutting quality checks:** Run axe, validate keyboard and reflow behavior, and probe hostile-looking text in user inputs.

Each `it()` case in `.github/workflows/nebulous.cy.js` has an adjacent comment describing its objective and important assertions.

| Test area | Coverage |
| --- | --- |
| test rule/service behavior | Fixture-to-rule consistency; positive and negative examples for all nine matchers; repeated scan idempotency and scan-after-clear behavior. |
| Document and page accessibility | Dashboard, Quarantine Vault, Threat Intel, expanded analytics, email dialog, and news dialog axe scans with `wcag2a`, `wcag2aa`, and `section508` tags; document title/language/headings/landmarks; control names, image alternatives, and future video caption checks. |
| Keyboard and responsive interaction | Keyboard navigation and activation of tabs, filter chips, checkboxes, analytics expander, and article cards; focus visibility; Escape dialog exit and focus return; vault announcements; 320px reflow and text-spacing overrides at a narrow viewport. |
| test product workflows | All filter cards; every seeded email’s detail dialog; all subject/sender searches, no-match and reset cases; every cyber-news article dialog; saved settings, scan counts, whitelist exclusion, loading, purge, and tab navigation. |
| Input-safety regression | Markup-shaped input in the whitelist and search remains inert text and does not execute its event handler. |

### QA principles demonstrated

- **Deterministic setup:** Each browser test gets an isolated in-memory test service with known fixture state.
- **Positive and negative assertions:** Matcher cases include values expected to match and safe/nonmatching examples.
- **Behavioral assertions:** Tests verify text, counts, open/closed dialogs, selected states, and result lists rather than merely checking that a click did not throw.
- **Boundary and state-transition coverage:** Tests include no-result search, repeated scans, whitelist skipping, purge/reset behavior, dynamic list creation, and small viewport transitions.
- **Traceability:** The filter IDs in the UI cards are checked against the registry; the registry also drives fixture counts and filter labels.
- **Accessible operation:** Where applicable, tests exercise keyboard access and inspect ARIA state and focus behavior alongside automated scanning.

## 6. Accessibility coverage and limits

The suite uses `cypress-axe`/axe-core. Automated scans are run for the currently visible, selected UI regions with the axe tags `wcag2a`, `wcag2aa`, and `section508`. Additional Cypress assertions exercise semantics, names, states, focus, keyboard activation, announcements, and responsive layout.

These tests cannot determine whether screen-reader output is understandable, whether all assistive technologies work correctly, whether speech input is usable, whether a physical device is operable, or whether the design is visually clear. Axe scans also cover only the rendered states and rules they can analyze; they do not certify Section 508 or WCAG conformance. Perform manual testing with representative assistive technologies and human review before making compliance claims.

## 7. Security scope and limitations

Security-related tests here are safe input-rendering regression tests. They submit inert, markup-shaped strings and verify that the UI displays text instead of executing the included event handler. This protects those tested rendering paths against the particular regression represented by those payloads; it is not a complete XSS assessment.

The filters are not security controls. They are deterministic examples built around known test strings and can produce false positives or false negatives. This application does not inspect attachments, parse real email headers, evaluate URLs, authenticate senders, or provide incident response. Do not enter real personal data or connect real accounts to this demonstration.

## 8. Extending the project safely

When adding a filter:

1. Add its stable ID, display name, and short description to the registry in `scripts/test-backend.js`.
2. Implement its matcher and include it in the appropriate matching/negative unit examples.
3. Add a representative initial quarantine item and sample inbox message when appropriate.
4. Add an informative Threat Intel card with the same `data-filter-id`, describing the actual matcher without promising efficacy.
5. Keep tests data-driven from the registry where practical, and assert actual UI results for end-to-end behavior.
6. Re-run accessibility checks on any newly introduced view or dialog state and test keyboard use.
7. Update this document if the test architecture, endpoint, runtime requirements, or coverage changes.

Do not describe a rule as comprehensive, production-ready, or a substitute for layered email security.


