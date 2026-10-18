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

  it('scans each sample idempotently and allows scanning again after a purge', () => {
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

  it('Passes Section 508 & WCAG 2.1 AA checks on Dashboard Load', () => {
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

  it('exposes required document language, title, landmarks, and heading structure', () => {
    cy.document().should(document => {
      expect(document.documentElement).to.have.attr('lang').and.not.be.empty;
      expect(document.title).to.equal('NebulousSearch Command Center');
      expect(document.querySelectorAll('h1')).to.have.length(1);
      expect(document.querySelector('main')).to.exist;
      expect(document.querySelector('nav[aria-label="Main navigation"]')).to.exist;
    });

    cy.checkA11y(null, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'section508'] }
    });
  });

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

  it('makes every cyber news card keyboard accessible and its modal Section 508 conformant', () => {
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

  //Keyboard Navigation & Focus State Testing
  // Users with motor disabilities rely entirely on the Tab and Enter keys.
  // You must verify that hidden elements become visible when activated by a keyboard, not just a mouse click.
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

//Modal Accessibility (Focus Management & Esc Key)
// When a modal opens (like inspecting an email or reading a news article),
// accessibility standards dictate two things: focus must immediately shift inside the modal, and the Escape key must close it.
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

  //Dynamic Form States & ARIA Validation
  // When a user adds an email to the whitelist, the DOM changes. You need to verify that these dynamic updates do not introduce new accessibility
  //   violations, and that error states are properly handled.
  it('Maintains accessibility during dynamic Whitelist input creation', () => {
    reportTestProgress({ step: 'Testing dynamic DOM updates in Whitelist' });

    // Type and submit via keyboard
    cy.get('#whitelist-input')
      .type('safe-sender@google.com')
      .type('{enter}'); // Assuming you wrap the input in a form or listen for Enter

    // Verify the tag was created
    cy.get('.w-tag').should('contain.text', 'safe-sender@google.com');

    // Run Axe specifically on the newly generated elements
    cy.checkA11y('#dashboard-view', {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'section508'] }
    });
  });

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

  it('Validates Glassmorphism Loading States on Dashboard Load', () => {
    reportTestProgress({ step: 'Checking dashboard loading animation', view: 'dashboard' });
    cy.get('#dashboard-overlay').should('be.visible');
    cy.get('#dashboard-overlay .glass-spinner').should('exist');
    cy.contains('.overlay-text', 'Scanning local airspace...').should('be.visible');

    cy.get('#total-blocked').should('have.text', String(createService().filters.length));
    cy.get('#dashboard-overlay .overlay-text').should('have.text', 'Airspace Secured');
  });

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