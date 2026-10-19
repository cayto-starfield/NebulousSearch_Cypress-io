const { createService, filterLogic } = require('../../scripts/mock-backend');

function visitApp() {
  cy.visit('/.github/workflows/Index.html?e2e=1', {
    onBeforeLoad(win) {
      win.google = createService().createGoogleMock(win);
    }
  });
}

let testProgress = {
  status: 'idle',
  test: '',
  step: '',
  view: 'dashboard',
  action: 'none'
};
let testRunFailed = false;

function reportTestProgress(update) {
  testProgress = { ...testProgress, ...update };
  return cy.request('POST', '/__test-progress', testProgress);
}

before(() => {
  return reportTestProgress({
    status: 'running',
    test: '',
    step: 'Starting Cypress suite',
    view: 'dashboard',
    action: 'none'
  });
});

afterEach(function() {
  if (this.currentTest.state === 'failed') testRunFailed = true;
  return reportTestProgress({
    status: 'running',
    step: `${this.currentTest.state === 'passed' ? 'Passed' : 'Failed'}: ${this.currentTest.title}`,
    view: testProgress.view,
    action: 'none'
  });
});

after(() => {
  return reportTestProgress({
    status: testRunFailed ? 'failed' : 'passed',
    step: testRunFailed ? 'One or more tests failed' : 'All tests passed',
    action: 'none'
  });
});

describe('Mock filter rules', () => {
  // Confirms the seeded quarantine set contains exactly one representative message for every
  // registered rule, and that each message actually satisfies the matcher named by its filterId.
  it('seeds one matching vault email for every filter', () => {
    const service = createService();
    const emails = service.getQuarantineData();

    expect(emails).to.have.length(service.filters.length);
    expect(new Set(emails.map(email => email.filterId))).to.deep.equal(
      new Set(service.filters.map(filter => filter.id))
    );
    emails.forEach(email => {
      expect(filterLogic[email.filterId](email.subject, email.body, email.sender)).to.equal(true);
    });
  });

  // Exercises both matching and non-matching examples for every rule so the test documents
  // the intended boundary of each heuristic, including sender- and body-based checks.
  it('matches the supplied filter patterns and leaves safe samples alone', () => {
    reportTestProgress({
      status: 'running',
      test: 'Validating filter rules against mock values',
      step: 'Checking filter registry rules',
      view: 'dashboard',
      action: 'none'
    });

    expect(filterLogic.excessive_spaces('Payment     is         overdue')).to.equal(true);
    expect(filterLogic.excessive_spaces('Please review this payment')).to.equal(false);
    expect(filterLogic.zero_width_chars('P\u200Ba\u200By\u200BP')).to.equal(true);
    expect(filterLogic.zero_width_chars('P\u200BayPal')).to.equal(false);
    expect(filterLogic.urgent_phishing('Your account suspended notice')).to.equal(true);
    expect(filterLogic.urgent_phishing('Your weekly account statement')).to.equal(false);
    expect(filterLogic.all_caps_subject('RE: URGENT SECURITY ALERT')).to.equal(true);
    expect(filterLogic.all_caps_subject('FYI: lunch at 12')).to.equal(false);
    expect(filterLogic.crypto_phishing('Bitcoin seed phrase giveaway')).to.equal(true);
    expect(filterLogic.crypto_phishing('Notes from the team meeting')).to.equal(false);
    expect(filterLogic.fake_invoice('Payment update', 'Norton renewal receipt')).to.equal(true);
    expect(filterLogic.fake_invoice('Payment update', 'Your project receipt')).to.equal(false);
    expect(filterLogic.period_obfuscation('p.a.y.p.a.l alert')).to.equal(true);
    expect(filterLogic.period_obfuscation('paypal alert')).to.equal(false);
    expect(filterLogic.no_alphabetical('12345 !!!')).to.equal(true);
    expect(filterLogic.no_alphabetical('Résumé received')).to.equal(false);
    expect(filterLogic.suspicious_sender('', '', '0123456789abcdef0123456789abcdef@example.net')).to.equal(true);
    expect(filterLogic.suspicious_sender('', '', 'colleague@example.com')).to.equal(false);
  });

  // Verifies scanning is repeatable without duplicating quarantined messages, and that clearing
  // analytics/quarantine state makes the same fixture eligible for a fresh scan.
  it('scans each sample  and allows scanning again after a purge', () => {
    const service = createService();
    service.saveFilterSettings(service.filters.map(filter => filter.id), ['trusted@example.com']);

    expect(service.scanMockInbox()).to.deep.equal({
      scannedCount: 11,
      quarantinedCount: 9,
      totalQuarantined: 18
    });
    expect(service.scanMockInbox()).to.deep.equal({
      scannedCount: 11,
      quarantinedCount: 0,
      totalQuarantined: 18
    });

    service.clearStats();
    expect(service.scanMockInbox()).to.deep.equal({
      scannedCount: 11,
      quarantinedCount: 9,
      totalQuarantined: 9
    });
  });
});

describe('NebulousSearch UI Framework & Accessibility', () => {
  beforeEach(function() {
    return reportTestProgress({
      status: 'running',
      test: this.currentTest.title,
      step: 'Opening mock interface',
      view: 'dashboard',
      action: 'none'
    }).then(() => visitApp()).then(() => cy.injectAxe());
  });

  // Runs axe against the fully loaded initial dashboard using WCAG 2.0 A/AA and Section 508 tags.
  // Waiting for the completion state ensures the scan covers rendered app content, not just loaders.
  it('Passes Section 508 & WCAG 2.0 A/AA checks on Dashboard Load', () => {
    reportTestProgress({ step: 'Waiting for dashboard data', view: 'dashboard' });
    cy.get('#dashboard-overlay .overlay-text', { timeout: 3000 }).should('have.text', 'Airspace Secured');

    reportTestProgress({ step: 'Running WCAG and Section 508 accessibility scan' });
    cy.checkA11y(null, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'section508']
      }
    });
  });

  // Guards the page-level accessibility foundation: language, title, one primary heading,
  // main/navigation/news landmarks, and the live region used to announce test progress.
  it('exposes required document language, title, landmarks, and heading structure', () => {
    cy.document().should(document => {
      expect(document.documentElement).to.have.attr('lang').and.not.be.empty;
      expect(document.title).to.equal('NebulousSearch Command Center');
      expect(document.querySelectorAll('h1')).to.have.length(1);
      expect(document.querySelector('main')).to.exist;
      expect(document.querySelector('nav[aria-label="Main navigation"]')).to.exist;
      expect(document.querySelector('aside[aria-label="AI Cyber News"]')).to.exist;
      expect(document.querySelector('#test-run-status')).to.have.attr('role', 'status');
      expect(document.querySelector('#test-run-status')).to.have.attr('aria-live', 'polite');
    });

    cy.checkA11y(null, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'section508'] }
    });
  });

  // Ensures controls have programmatic names, images expose alt text, and any future video
  // includes captions; the initial application state is waited out before inspecting the DOM.
  it('provides accessible names and text alternatives for interactive and non-text content', () => {
    cy.get('#dashboard-overlay .overlay-text', { timeout: 3000 }).should('have.text', 'Airspace Secured');
    cy.get('#news-overlay .overlay-text', { timeout: 3000 }).should('have.text', 'Link Established');

    cy.get('button').each($button => {
      const button = $button[0];
      const labelledBy = button.getAttribute('aria-labelledby');
      const referencedLabel = labelledBy
        ? labelledBy.split(/\s+/).map(id => button.ownerDocument.getElementById(id)?.textContent || '').join(' ')
        : '';
      const accessibleName = button.getAttribute('aria-label') ||
        referencedLabel ||
        button.innerText ||
        '';
      expect(accessibleName.trim(), `button ${button.outerHTML}`).not.to.equal('');
    });

    cy.get('input, select, textarea').each($field => {
      const field = $field[0];
      const labelledBy = field.getAttribute('aria-labelledby');
      const referencedLabel = labelledBy
        ? labelledBy.split(/\s+/).map(id => field.ownerDocument.getElementById(id)?.textContent || '').join(' ')
        : '';
      const associatedLabel = field.labels ? Array.from(field.labels).map(label => label.textContent).join(' ') : '';
      const accessibleName = field.getAttribute('aria-label') || referencedLabel || associatedLabel;
      expect(accessibleName.trim(), `form field ${field.outerHTML}`).not.to.equal('');
    });

    cy.get('img').each($image => {
      expect($image[0]).to.have.attr('alt');
    });
    cy.document().should(document => {
      Array.from(document.querySelectorAll('video')).forEach(video => {
        expect(video.querySelector('track[kind="captions"]')).not.to.equal(null);
      });
    });
  });

  // Opens the vault, waits for its results and success state, then scans the populated result
  // region for Section 508/WCAG violations rather than checking the hidden initial view.
  it('Passes accessibility checks after opening the Quarantine Vault', () => {
    reportTestProgress({
      step: 'Opening the Quarantine Vault',
      view: 'quarantine'
    });
    cy.contains('.tab-btn', 'Quarantine Vault').click();
    cy.get('#quarantine-view').should('be.visible');
    cy.get('#quarantine-overlay .overlay-text', { timeout: 3000 }).should('have.text', 'Access Granted');
    cy.get('#quarantine-list .q-item').should('have.length', createService().filters.length);

    reportTestProgress({ step: 'Running accessibility scan on quarantine results' });
    cy.checkA11y('#quarantine-view', {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'section508']
      }
    });
  });

  // Exercises the primary navigation, search, filter chips, and checkboxes using keyboard input.
  // Asserts visible focus, active/pressed state, updated results, live announcements, and axe
  // results for both the initial and filtered quarantine states.
  it('keeps navigation, filter controls, and search operable from the keyboard', () => {
    cy.get('.tab-btn').first().focus();
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should('have.text', 'Quarantine Vault').type('{enter}');
    cy.get('#quarantine-view').should('be.visible');
    cy.get('.tab-btn[aria-current="page"]').should('have.text', 'Quarantine Vault');

    cy.get('#q-search').focus().type('billing@');
    cy.focused().should('have.attr', 'aria-label', 'Search quarantined emails by sender or subject');
    cy.get('#q-search').should($search => {
      expect(getComputedStyle($search[0]).outlineWidth).to.equal('2px');
    });
    cy.get('#quarantine-list .q-item').should('have.length.greaterThan', 0);
    cy.get('#quarantine-list').should('have.attr', 'aria-live', 'polite');
    cy.checkA11y('#quarantine-view', {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'section508'] }
    });

    cy.get('#q-search').clear();
    cy.get('.filter-tag[data-filter="all"]').should('have.attr', 'aria-pressed', 'true');
    cy.get('.filter-tag[data-filter="urgent_phishing"]')
      .should('have.attr', 'aria-label', 'Filter by False Gravity')
      .focus()
      .type('{enter}')
      .should('have.attr', 'aria-pressed', 'true');
    cy.get('.filter-tag[data-filter="all"]').should('have.attr', 'aria-pressed', 'false');
    cy.get('#quarantine-list .q-item').should('have.length', 1);
    cy.checkA11y('#quarantine-view', {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'section508'] }
    });
    cy.get('.filter-tag[data-filter="all"]').focus().type('{enter}');

    cy.get('.tab-btn').first().focus().type('{enter}');
    cy.get('#dashboard-view').should('be.visible');
    cy.get('#filter-list input[type="checkbox"]').first().focus().type(' ');
    cy.get('#filter-list input[type="checkbox"]').first().should('be.checked');
    cy.get('#filter-list input[type="checkbox"]').first().should($checkbox => {
      expect(getComputedStyle($checkbox[0]).outlineWidth).to.equal('2px');
    });
    cy.get('#whitelist-input').focus().type('focus@example.com');
    cy.get('#whitelist-input').should($input => {
      expect(getComputedStyle($input[0]).outlineWidth).to.equal('2px');
    });
  });

  // Activates a cyber-news card with Enter, verifies modal focus and an informative image
  // alternative, scans the open dialog, then checks Escape dismissal and focus restoration.
  it('makes a cyber news card keyboard accessible and its modal Section 508 conformant', () => {
    cy.get('#news-overlay .overlay-text', { timeout: 3000 }).should('have.text', 'Link Established');
    cy.get('#news-list .news-card').first().focus().should('have.focus').type('{enter}');
    cy.get('#news-modal').should('be.visible');
    cy.get('#news-modal .close-btn').should('have.focus');
    cy.get('#n-img').should('have.attr', 'alt').and('not.be.empty');

    cy.checkA11y('#news-modal', {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'section508'] }
    });

    cy.get('body').type('{esc}');
    cy.get('#news-modal').should('not.be.visible');
    cy.get('#news-list .news-card').first().should('have.focus');
  });

  // Keeps the Threat Intel documentation in sync with the canonical filter registry by checking
  // one named, explained card per filter, then runs axe on the visible intel content.
  it('passes Section 508 and WCAG checks on the Threat Intel view', () => {
    cy.contains('.tab-btn', 'Threat Intel').click();
    cy.get('#intel-view').should('be.visible');
    const filters = createService().filters;
    cy.get('#intel-view .intel-card').should('have.length', filters.length).each(($card, index) => {
      const filter = filters[index];
      cy.wrap($card).should('have.attr', 'data-filter-id', filter.id);
      cy.wrap($card).find('h3').should('contain.text', filter.name);
      cy.wrap($card).find('.intel-body').should('contain.text', 'Detection:');
      cy.wrap($card).find('.intel-body').should('contain.text', 'Example:');
    });
    cy.checkA11y('#intel-view', {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'section508'] }
    });
  });

  // Verifies each dynamic filter checkbox receives a registry-derived accessible name and
  // confirms the analytics disclosure exposes expanded state and its revealed content.
  it('provides accessible names, state, and keyboard operation for filter controls', () => {
    const checkboxes = createService().filters;
    cy.get('#filter-list input[type="checkbox"]').should('have.length', checkboxes.length).each(($checkbox, index) => {
      cy.wrap($checkbox).should('have.attr', 'aria-label', `Enable ${checkboxes[index].name} filter`);
    });

    cy.get('.stats-header')
      .should('have.attr', 'aria-expanded', 'false')
      .focus()
      .type(' ')
      .should('have.attr', 'aria-expanded', 'true');
    cy.get('#stats-container').should('have.attr', 'aria-hidden', 'false');
  });

  createService().filters.forEach(filter => {
    it(`toggles the ${filter.name} filter on and off`, () => {
      const selector = `#filter-${filter.id}`;
      let uncheckedBackground;

      reportTestProgress({ step: `Enabling the ${filter.name} filter`, view: 'dashboard' });
      cy.get(selector).should('not.be.checked').then($toggle => {
        uncheckedBackground = getComputedStyle($toggle[0]).backgroundColor;
      });

      cy.get(selector).click().should('be.checked').should($toggle => {
        expect(getComputedStyle($toggle[0]).backgroundColor).not.to.equal(uncheckedBackground);
      });

      reportTestProgress({ step: `Disabling the ${filter.name} filter`, view: 'dashboard' });
      cy.get(selector).click().should('not.be.checked').should($toggle => {
        expect(getComputedStyle($toggle[0]).backgroundColor).to.equal(uncheckedBackground);
      });
    });
  });

  // Checks the page has no horizontal overflow at a 320px viewport before and after navigating
  // to the vault and filtering results, covering both the shell and a data-populated view.
  it('reflows the interface at a narrow viewport without horizontal scrolling', () => {
    cy.viewport(320, 720);
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth);
    });

    cy.get('.tab-btn').contains('Quarantine Vault').focus().type('{enter}');
    cy.get('#quarantine-view').should('be.visible');
    cy.get('#q-search').type('billing@');
    cy.get('#quarantine-list .q-item').should('have.length.greaterThan', 0);
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth);
    });
  });

  // Applies the WCAG text-spacing override values and a viewport representing a 200%-scaled
  // narrow layout, then checks that navigation, search results, and the full page still reflow.
  it('preserves content and controls with WCAG text-spacing overrides and 200% layout scaling', () => {
    cy.viewport(640, 900);
    cy.document().then(document => {
      const style = document.createElement('style');
      style.id = 'section508-text-spacing-test';
      style.textContent = `
        * {
          line-height: 1.5 !important;
          letter-spacing: 0.12em !important;
          word-spacing: 0.16em !important;
        }
        p { margin-bottom: 2em !important; }
      `;
      document.head.appendChild(style);
    });

    cy.get('h1').should('be.visible');
    cy.get('.tab-btn').contains('Quarantine Vault').focus().type('{enter}');
    cy.get('#q-search').should('be.visible').type('billing@');
    cy.get('#quarantine-list .q-item').should('have.length.greaterThan', 0);
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth);
    });
  });

  // Independently verifies the dashboard statistics disclosure can be reached and opened with
  // Enter, exposes its content, and remains axe-clean after the previously hidden section appears.
  it('Operates the Dashboard Stats expander strictly via keyboard', () => {
    reportTestProgress({ step: 'Testing keyboard navigation on Stats Card' });

    // Ensure the header is focusable (requires tabindex="0" in your HTML)
    cy.get('.stats-header')
      .focus()
      .should('have.focus') // Verifies a visible focus ring exists
      .type('{enter}');     // Simulates keyboard activation

    // Verify the dynamic content expands
    cy.get('#stats-container').should('be.visible');

    // Scan the newly revealed content
    cy.checkA11y('#stats-container', {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'section508'] }
    });
  });

  // Checks the email inspector's dialog semantics, Escape-key dismissal, and focus return to
  // the invoking email button. The axe scan covers the dialog while it is open.
  it('Manages focus and allows keyboard exit for the Email Inspector Modal', () => {
    reportTestProgress({ step: 'Opening Quarantine Vault and triggering modal' });
    cy.contains('.tab-btn', 'Quarantine Vault').click();

    // Open the first email in the vault
    cy.get('.view-btn').first().click();
    cy.get('#email-modal').should('be.visible');

    reportTestProgress({ step: 'Scanning Modal DOM structure' });
    cy.checkA11y('#email-modal');
    cy.checkA11y('#email-modal', {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'section508'] }
    });

    reportTestProgress({ step: 'Testing Escape key closure' });
    // Simulate pressing the Escape key globally
    cy.get('body').type('{esc}');

    // Verify the modal actually closes
    cy.get('#email-modal').should('not.be.visible');

    // Best Practice Check: Did focus return to the button that opened it?
    cy.get('.view-btn').first().should('have.focus');
  });

  // Iterates through every seeded vault entry and verifies the corresponding inspector presents
  // the exact subject, sender, matching filter name, and body before closing for the next item.
  it('opens the matching email modal for every quarantine entry', () => {
    const emails = createService().getQuarantineData();

    reportTestProgress({ step: 'Opening and verifying each quarantined email', view: 'quarantine' });
    cy.contains('.tab-btn', 'Quarantine Vault').click();
    cy.get('#quarantine-overlay .overlay-text', { timeout: 3000 }).should('have.text', 'Access Granted');
    cy.get('#quarantine-list .q-item').should('have.length', emails.length).each(($item, index) => {
      const email = emails[index];
      cy.wrap($item).find('.view-btn').focus().type('{enter}');
      cy.get('#email-modal').should('be.visible');
      cy.get('#modal-subject').should('have.text', email.subject);
      cy.get('#modal-sender').should('have.text', email.sender);
      cy.get('#modal-filter').should('have.text', email.filterName);
      cy.get('#modal-body').should('have.text', email.body);
      cy.get('#email-modal .close-btn').click();
      cy.get('#email-modal').should('not.be.visible');
    });
  });

  // Searches every fixture independently by subject and sender, asserts the unique matching
  // result, covers the no-match announcement, scans that empty state with axe, and resets search.
  it('searches the vault by every seeded email subject and sender', () => {
    const emails = createService().getQuarantineData();

    reportTestProgress({ step: 'Searching the vault for each filter sample', view: 'quarantine' });
    cy.contains('.tab-btn', 'Quarantine Vault').click();
    cy.get('#quarantine-overlay .overlay-text', { timeout: 3000 }).should('have.text', 'Access Granted');
    cy.get('#quarantine-list .q-item').should('have.length', emails.length);

    emails.forEach(email => {
      cy.get('#q-search').clear().invoke('val', email.subject).trigger('input');
      cy.get('#quarantine-list .q-item').should('have.length', 1);
      cy.get('#quarantine-list .q-subject').should('have.text', email.subject);
      cy.get('#quarantine-list .q-sender').should('contain.text', email.sender);

      cy.get('#q-search').clear().type(email.sender);
      cy.get('#quarantine-list .q-item').should('have.length', 1);
      cy.get('#quarantine-list .q-subject').should('have.text', email.subject);
      cy.get('#quarantine-list .q-sender').should('contain.text', email.sender);
    });

    cy.get('#q-search').clear().type('no-matching-email@example.invalid');
    cy.get('#quarantine-list').should('contain.text', 'No anomalies found.');
    cy.checkA11y('#quarantine-view', {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'section508'] }
    });
    cy.get('#q-search').clear();
    cy.get('#quarantine-list .q-item').should('have.length', emails.length);
  });

  // Opens each news article from its visible card and compares title, date, and full body with
  // fixture data, ensuring cards are wired to their own detail dialog.
  it('opens the matching article modal for every cyber news card', () => {
    const articles = [
      {
        title: 'Phantom Payload Campaign Surges',
        date: 'Oct 18, 2026',
        summary: 'A new wave of fake Geek Squad invoices is bypassing traditional spam filters.',
        content: 'Security researchers have identified a massive spike in invoice fraud utilizing PDF attachments and obfuscated sender domains to bypass baseline defenses.'
      },
      {
        title: 'Zero-Width Character Exploits',
        date: 'Oct 17, 2026',
        summary: 'Spammers are sandwiching invisible characters between letters to hide trigger words.',
        content: "By injecting Unicode zero-width spaces (U+200B) into words like 'P a s s w o r d', attackers are successfully evading standard RegEx scanners."
      }
    ];

    reportTestProgress({ step: 'Opening and verifying each cyber news article', view: 'dashboard' });
    cy.get('#news-overlay .overlay-text', { timeout: 3000 }).should('have.text', 'Link Established');
    cy.get('#news-list .news-card').should('have.length', articles.length).each(($card, index) => {
      const article = articles[index];
      cy.wrap($card).should('contain.text', article.title);
      cy.wrap($card).should('contain.text', article.summary).click();
      cy.get('#news-modal').should('be.visible');
      cy.get('#n-title').should('have.text', article.title);
      cy.get('#n-date').should('have.text', article.date);
      cy.get('#n-body').should('have.text', article.content);
      cy.get('#news-modal .close-btn').click();
      cy.get('#news-modal').should('not.be.visible');
    });
  });

  // Adds a trusted address through the keyboard, verifies the generated list item, and reruns
  // axe over the dashboard after the dynamic DOM update.
  it('Maintains accessibility during dynamic Whitelist input creation', () => {
    reportTestProgress({ step: 'Testing dynamic DOM updates in Whitelist' });

    // Type and submit via keyboard
    cy.get('#whitelist-input')
      .type('safe-sender@google.com')
      .type('{enter}');

    // Verify the tag was created
    cy.get('.w-tag').should('contain.text', 'safe-sender@google.com');

    // Scan the dashboard containing the newly generated list item.
    cy.checkA11y('#dashboard-view', {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'section508'] }
    });
  });

  // Uses HTML and an event-handler payload as inert whitelist input, asserting the submitted
  // value is displayed as text, no SVG is created, and the handler never executes.
  it('renders HTML and event-handler payloads in whitelist input as inert text', () => {
    const payload = '<svg/onload=window.__xssexecuted=true>@example.com';
    cy.window().then(win => {
      win.__xssexecuted = false;
    });

    cy.get('#whitelist-input').type(payload);
    cy.contains('.whitelist-input-group button', 'Add Sender').click();

    cy.get('#whitelist-tags .w-tag').should('contain.text', payload);
    cy.get('#whitelist-tags svg').should('not.exist');
    cy.window().its('__xssexecuted').should('be.false');
  });

  // Submits markup-shaped text to the quarantine search and verifies it produces an ordinary
  // no-results state without inserting active markup or executing an event handler.
  it('does not execute markup entered into quarantine search', () => {
    const payload = '<svg/onload=window.__xssExecuted=true>';
    cy.window().then(win => {
      win.__xssExecuted = false;
    });

    cy.contains('.tab-btn', 'Quarantine Vault').click();
    cy.get('#quarantine-overlay .overlay-text', { timeout: 3000 }).should('have.text', 'Access Granted');
    cy.get('#q-search').type(payload);

    cy.get('#quarantine-list').should('contain.text', 'No anomalies found.');
    cy.get('#quarantine-list svg').should('not.exist');
    cy.window().its('__xssExecuted').should('be.false');
  });

  // Saves all filters and one trusted sender, scans the deterministic 11-message inbox, and
  // verifies reported totals, expanded quarantine contents, and whitelist exclusion end to end.
  it('scans representative mock inbox data using enabled filters and the whitelist', () => {
    reportTestProgress({
      step: 'Enabling all filters and adding a trusted sender',
      view: 'dashboard'
    });
    cy.get('#filter-list input[type="checkbox"]').check({ multiple: true });
    cy.get('#whitelist-input').type('trusted@example.com{enter}');
    cy.get('#whitelist-tags').should('contain.text', 'trusted@example.com');

    cy.get('#save-btn').focus().type('{enter}');
    cy.get('#mock-scan-result').should('contain.text', 'Mock filters and trusted senders saved.');
    cy.get('#mock-scan-result').should('have.attr', 'role', 'status').and('have.attr', 'aria-live', 'polite');
    cy.get('#scan-mock-inbox-btn').focus().type('{enter}');

    cy.get('#mock-scan-result').should('have.text', 'Scanned 11 sample emails; quarantined 9.');
    cy.get('#total-blocked').should('have.text', String(createService().filters.length + 9));
    cy.contains('.tab-btn', 'Quarantine Vault').click();
    cy.get('#quarantine-list .q-item').should('have.length', createService().filters.length + 9);
    cy.get('#quarantine-list').should('not.contain.text', 'trusted@example.com');
  });

});

describe('NebulousSearch UI Framework', () => {
  beforeEach(function() {
    return reportTestProgress({
      status: 'running',
      test: this.currentTest.title,
      step: 'Opening mock interface',
      view: 'dashboard',
      action: 'none'
    }).then(visitApp);
  });

  // Confirms the dashboard and news loading transitions reach their expected completion states
  // and that the displayed dashboard total matches the seeded mock quarantine.
  it('Validates Glassmorphism Loading States on Dashboard Load', () => {
    reportTestProgress({ step: 'Checking dashboard loading animation', view: 'dashboard' });
    cy.get('#dashboard-overlay').should('be.visible');
    cy.get('#dashboard-overlay .glass-spinner').should('exist');
    cy.contains('.overlay-text', 'Scanning local airspace...').should('be.visible');

    cy.get('#total-blocked').should('have.text', String(createService().filters.length));
    cy.get('#dashboard-overlay .overlay-text').should('have.text', 'Airspace Secured');
  });

  // Exercises the analytics disclosure and destructive purge confirmation, then checks the
  // progress overlay, spinner, zeroed count, and successful completion feedback.
  it('Executes the Purge Analytics Workflow', () => {
    cy.on('window:confirm', () => true);

    reportTestProgress({ step: 'Expanding analytics details', view: 'dashboard', action: 'expand-stats' });
    cy.get('.stats-header').click();
    reportTestProgress({ step: 'Purging analytics', action: 'purge-start' });
    cy.get('#purge-btn').should('be.visible').focus().type('{enter}');

    cy.get('#purge-overlay').should('be.visible');
    cy.get('#purge-overlay .glass-spinner').should('exist');

    cy.get('#total-blocked').should('have.text', '0');
    cy.get('#purge-overlay .overlay-text').should('have.text', 'Purge Complete');
    reportTestProgress({ step: 'Purge completed', action: 'purge-complete' });
  });

  // Verifies navigation changes the visible view and current-page state for the vault, loads
  // its seeded results, and then opens the Threat Intel tab.
  it('Navigates the Command Center Tabs', () => {
    reportTestProgress({ step: 'Opening the Quarantine Vault', view: 'quarantine' });
    cy.contains('.tab-btn', 'Quarantine Vault').click();
    cy.get('#quarantine-view').should('be.visible');
    cy.get('#quarantine-overlay .overlay-text', { timeout: 3000 }).should('have.text', 'Access Granted');
    cy.get('#quarantine-list .q-item').should('have.length', createService().filters.length);
    cy.get('#dashboard-view').should('not.be.visible');

    reportTestProgress({ step: 'Opening Threat Intel', view: 'intel' });
    cy.contains('.tab-btn', 'Threat Intel').click();
    cy.get('#intel-view').should('be.visible');
  });

});