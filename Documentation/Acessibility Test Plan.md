# Section 508 Compliance Test Plan & Cases

**Project:** NebulousSearch Cypress Test App  
**Prepared by:** Cayto Nova, Certified DHS Trusted Tester (TT-2411-05157)  

## 1. Test Plan for Achieving 100% Section 508 Compliance

### 1.1 Objective
To achieve and verify 100% Section 508 and WCAG 2.1 AA compliance for the NebulousSearch Mock App by utilizing the DHS Trusted Tester v5.0 methodology. This strategy integrates automated continuous integration testing with comprehensive manual inspection to identify and eliminate accessibility barriers.

### 1.2 Scope
The scope of this test plan covers all user-facing interfaces of the NebulousSearch single-page test UI, including the Command Center, Quarantine Vault, Threat Intel, Cyber News cards, and all modal dialogs. Data backend logic is mocked and out of scope for accessibility.

### 1.3 Methodology & Tools
Testing will strictly adhere to the Federal CIO Council Accessibility Community of Practice (ACOP) Trusted Tester Test Process v5.0. 
*   **Automated Tools:** Cypress, cypress-axe (axe-core)
*   **Manual Tools:** ANDI (Accessible Name & Description Inspector), Colour Contrast Analyser (CCA)
*   **Assistive Tech:** JAWS, NVDA, VoiceOver, Keyboard-only navigation
*   **Standards:** Section 508, WCAG 2.0/2.1 Level A and AA

### 1.4 Testing Approach
1.  **Baseline Automated Scan:** Execute Cypress-Axe across all DOM states to catch structural errors (missing ARIA, bad semantics).
2.  **Manual Keyboard Inspection:** Traverse the DOM using only the `Tab`, `Shift+Tab`, `Enter`, `Space`, and `Esc` keys.
3.  **Screen Reader Verification:** Navigate dynamic updates (like Whitelist tags and Vault population) using JAWS/NVDA to ensure announcements occur.
4.  **Visual Inspection:** Verify Color Contrast with CCA, especially regarding the "Apple-glass" UI translucency, and confirm focus indicator visibility.

---

## 2. Manual Accessibility Test Cases (Trusted Tester v5)

### TC-01: Keyboard Navigation & Focus Indicator (TT v5 Section 4)
*   **Description:** Verify all interactive elements are reachable and actionable via keyboard with a visible focus ring.
*   **Steps:**
    1. Load NebulousSearch dashboard without using a mouse.
    2. Press `Tab` to navigate through the interface.
    3. Verify focus moves logically (left-to-right, top-to-bottom).
    4. Verify focus indicator is clearly visible on `.stats-header`, filter checkboxes, and tabs.
*   **Expected Result:** All interactive elements receive focus, the focus ring is high-contrast, and elements can be activated with Enter/Space.

### TC-02: Modal Dialog Focus Management & Exit (TT v5 Section 4 & 10)
*   **Description:** Verify accessible interaction with the Email Inspector and Cyber News modals.
*   **Steps:**
    1. Use keyboard to navigate to an 'Inspect' button in the Quarantine Vault and press `Enter`.
    2. Verify keyboard focus shifts immediately inside the modal.
    3. Press `Tab` to ensure focus is trapped within the modal (cannot interact with background).
    4. Press the `Escape` key.
*   **Expected Result:** The modal closes via the Escape key, and focus returns precisely to the 'Inspect' button that originally triggered it.

### TC-03: Accessible Names and Form Labels (TT v5 Section 5)
*   **Description:** Verify screen readers can identify form inputs beyond visual placeholders.
*   **Steps:**
    1. Launch ANDI or a screen reader.
    2. Inspect the `#q-search` box and `#whitelist-input`.
    3. Verify an `aria-label` or associated `<label>` exists.
*   **Expected Result:** ANDI confirms Accessible Names exist (e.g., "Search quarantine vault", "Email address to whitelist"). Visual placeholders are not solely relied upon.

### TC-04: Color Contrast on Glassmorphism UI (TT v5 Section 13)
*   **Description:** Verify text against dynamic translucent backgrounds meets minimum contrast.
*   **Steps:**
    1. Open CCA (Colour Contrast Analyser).
    2. Sample the white text (`#ffffff`) on the primary purple button (`#9d4edd`).
    3. Sample text resting over the translucent glass panels against the night sky background image.
*   **Expected Result:** Regular text maintains a minimum 4.5:1 ratio, and large text maintains 3:1 regardless of background bleed-through.

### TC-05: Dynamic DOM Updates and Live Regions (TT v5 Section 10/15)
*   **Description:** Verify that adding to the Whitelist or executing a Purge is announced to screen readers.
*   **Steps:**
    1. Activate NVDA/JAWS.
    2. Add a new email to the Whitelist.
    3. Trigger the "Purge Analytics" workflow.
*   **Expected Result:** Screen reader announces "Airspace Secured" or vault status updates. Dynamic tag creation is accessible.

---

## 3. Existing Automated Test Cases (Cypress-Axe)

The Cypress framework acts as the first line of defense, automatically running rules-based scans during CI/CD. These tests decouple the frontend to bypass Google Apps Script iframe restrictions, ensuring 100% test reliability.

### ATC-01: Section 508 & WCAG 2.1 AA checks on Dashboard Load
*   **Mechanism:** Waits for the glass spinner overlay to reach "Airspace Secured" to ensure DOM is settled, then executes `cy.checkA11y()` scoped to `wcag2a`, `wcag2aa`, and `section508`.
*   **Validation:** Checks document semantics, headings, landmarks, missing alt text, and basic contrast.

### ATC-02: Quarantine Vault Dynamic DOM Scan
*   **Mechanism:** Navigates to the Quarantine tab, waits for mock data to populate `#quarantine-list`, and strictly scopes the accessibility scan to `#quarantine-view`.
*   **Validation:** Reduces noise by isolating the scan to dynamically generated vault items. Scans for structural compliance of the newly rendered components.

### ATC-03: Responsive Reflow & Text-Spacing
*   **Mechanism:** Cypress adjusts the viewport to 320px width and applies text-spacing overrides.
*   **Validation:** Asserts that no critical content is truncated or requires horizontal scrolling, ensuring compliance for low-vision users.

### ATC-04: Keyboard & Focus Behavior Automations
*   **Mechanism:** Cypress triggers `.focus().type('{enter}')` on elements like the `.stats-header`.
*   **Validation:** Asserts that elements expand and that `.should('have.focus')` correctly validates focus ring visibility and programmatic focus management.
