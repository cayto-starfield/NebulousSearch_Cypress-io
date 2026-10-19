# Frontend UI & XSS Security Test Plan

**Project:** NebulousSearch Cypress Mock App  
**Prepared by:** Cayto Nova, Sr. Technical QA Analyst  
**Reference:** ISTQB Advanced Level Test Analyst Standards  

## 1. Test Plan Overview

### 1.1 Objective
To define the test strategy and test design techniques for the Frontend UI and Cross-Site Scripting (XSS) vulnerability checks for the NebulousSearch Mock App, adhering to ISTQB best practices. This plan covers functional UI validation and security input handling.

### 1.2 Scope
**In Scope:** 
* Frontend functionality: Command Center, Quarantine Vault, Threat Intel tabs, and dynamic modal dialogs.
* UI/UX validation: Responsive design, Apple-glass CSS rendering, and visual state transitions.
* Security testing: Client-side XSS vulnerability scanning (DOM-based, Reflected) in the search bar and whitelist input fields.

**Out of Scope:** Backend processing and actual Gmail API interactions (currently mocked).

### 1.3 Test Methodology (ISTQB-Aligned)
* **Equivalence Partitioning & Boundary Value Analysis:** Used for input field constraints.
* **Error Guessing & Fault Attack:** Injecting malicious markup (`<script>` tags, `onload` events) into text fields to test XSS sanitization.
* **State Transition Testing:** Validating tab switching, modal open/close states, and dynamic list population.

## 2. Manual Test Cases (UI & XSS)

### TC-SEC-01: Reflected XSS in Search Bar
* **Description:** Verify that the Quarantine Vault search input sanitizes HTML/JS payloads.
* **Steps:**
  1. Navigate to the Quarantine Vault tab.
  2. Enter the following payload into the search box: `<img src=x onerror=alert('XSS')>`
  3. Observe the rendering in the DOM.
* **Expected Result:** The search query is treated strictly as a string. No alert box is triggered, and the DOM escapes the characters properly.

### TC-SEC-02: DOM-Based XSS in Whitelist Addition
* **Description:** Verify that dynamically rendering user input into Whitelist tags does not execute malicious scripts.
* **Steps:**
  1. Navigate to the Command Center.
  2. Enter `<script>alert('XSS')</script>` into the Whitelist input and submit.
  3. View the newly created Whitelist tag on the page.
* **Expected Result:** The script is not executed. The tag renders the literal string `<script>alert('XSS')</script>` safely utilizing `textContent` or equivalent DOM escaping methods.

### TC-UI-01: Glassmorphism UI & Modal State Validation
* **Description:** Verify visual states and dynamic rendering of modals under standard and 320px viewports.
* **Steps:**
  1. Click the 'Inspect' button on a quarantined email.
  2. Verify the modal opens with the correct Apple-glass blur effect and traps background interaction.
  3. Resize viewport width to 320px.
* **Expected Result:** The modal remains centered without horizontal scrollbars. Close buttons remain clickable and functional.

### TC-UI-02: Filter Settings Persistence & Quarantine Rendering
* **Description:** Verify that deselecting filters properly restricts the displayed messages in the Quarantine Vault.
* **Steps:**
  1. Uncheck the 'Asteroid Belt' and 'Cosmic Vacuum' filters.
  2. Trigger a mock inbox scan.
  3. Navigate to the Quarantine Vault.
* **Expected Result:** The Quarantine Vault count strictly reflects the active filters. Emails mapped to the deactivated filters are omitted from the UI.

## 3. Existing Automated Test Cases (Cypress)
The Cypress automation suite continuously validates structural and functional requirements. Existing test cases covering UI and security inputs include:

### ATC-UI-01: Validates Glassmorphism Loading States on Dashboard Load
* **Mechanism:** Asserts visibility of the overlay (`#dashboard-overlay`), the glass-spinner, and dynamic loading text ('Scanning local airspace...').
* **Validation:** Ensures that asynchronous UI states accurately reflect the mocked data processing delays before revealing the dashboard.

### ATC-UI-02: Executes the Purge Analytics Workflow
* **Mechanism:** Expands the stats card, clicks purge, bypasses the confirm dialog, and verifies the `#purge-overlay` spinning state.
* **Validation:** Checks that the stats counter resets precisely to '0' upon successful mock backend clearance.

### ATC-SEC-01: Input-Safety Regression
* **Mechanism:** Cypress inputs markup-shaped strings (e.g., HTML tags) into the search box and whitelist components.
* **Validation:** Asserts that the dynamically injected tags in the DOM strictly contain inert text, completely mitigating DOM-based and Reflected XSS vectors.

### ATC-UI-03: Navigates Command Center Tabs & Modals
* **Mechanism:** Automates clicking between 'Quarantine Vault' and 'Threat Intel' tabs.
* **Validation:** Asserts that the respective `#quarantine-view` and `#intel-view` containers display properly while hiding inactive tabs.

### ATC-UI-04: Toggles the Asteroid Belt Filter
* **Mechanism:** Clicks the Asteroid Belt filter toggle to enable it and then disable it.
* **Validation:** Confirms the checkbox changes to checked and back to unchecked, and that the toggle's enabled visual styling appears and returns to its original disabled styling.

### ATC-UI-05: Toggles the Dark Matter Filter
* **Mechanism:** Clicks the Dark Matter filter toggle to enable it and then disable it.
* **Validation:** Confirms the checkbox changes to checked and back to unchecked, and that the toggle's enabled visual styling appears and returns to its original disabled styling.

### ATC-UI-06: Toggles the False Gravity Filter
* **Mechanism:** Clicks the False Gravity filter toggle to enable it and then disable it.
* **Validation:** Confirms the checkbox changes to checked and back to unchecked, and that the toggle's enabled visual styling appears and returns to its original disabled styling.

### ATC-UI-07: Toggles the Solar Flare Filter
* **Mechanism:** Clicks the Solar Flare filter toggle to enable it and then disable it.
* **Validation:** Confirms the checkbox changes to checked and back to unchecked, and that the toggle's enabled visual styling appears and returns to its original disabled styling.

### ATC-UI-08: Toggles the Crypto & Wallet Phishing Filter
* **Mechanism:** Clicks the Crypto & Wallet Phishing filter toggle to enable it and then disable it.
* **Validation:** Confirms the checkbox changes to checked and back to unchecked, and that the toggle's enabled visual styling appears and returns to its original disabled styling.

### ATC-UI-09: Toggles the False Payload Filter
* **Mechanism:** Clicks the False Payload filter toggle to enable it and then disable it.
* **Validation:** Confirms the checkbox changes to checked and back to unchecked, and that the toggle's enabled visual styling appears and returns to its original disabled styling.

### ATC-UI-10: Toggles the Meteor Shower Filter
* **Mechanism:** Clicks the Meteor Shower filter toggle to enable it and then disable it.
* **Validation:** Confirms the checkbox changes to checked and back to unchecked, and that the toggle's enabled visual styling appears and returns to its original disabled styling.

### ATC-UI-11: Toggles the Cosmic Vacuum Filter
* **Mechanism:** Clicks the Cosmic Vacuum filter toggle to enable it and then disable it.
* **Validation:** Confirms the checkbox changes to checked and back to unchecked, and that the toggle's enabled visual styling appears and returns to its original disabled styling.

### ATC-UI-12: Toggles the Rogue Satellite Filter
* **Mechanism:** Clicks the Rogue Satellite filter toggle to enable it and then disable it.
* **Validation:** Confirms the checkbox changes to checked and back to unchecked, and that the toggle's enabled visual styling appears and returns to its original disabled styling.
