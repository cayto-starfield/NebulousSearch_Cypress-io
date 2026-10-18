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
      totalQuarantined: 11
    });
    expect(service.scanMockInbox()).to.deep.equal({
      scannedCount: 11,
      quarantinedCount: 0,
      totalQuarantined: 11
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

  it('Passes accessibility checks after opening the Quarantine Vault', () => {
    reportTestProgress({
      step: 'Opening the Quarantine Vault',
      view: 'quarantine'
    });
    cy.contains('.tab-btn', 'Quarantine Vault').click();
    cy.get('#quarantine-view').should('be.visible');
    cy.get('#quarantine-overlay .overlay-text', { timeout: 3000 }).should('have.text', 'Access Granted');
    cy.get('#quarantine-list .q-item').should('have.length', 2);

    reportTestProgress({ step: 'Running accessibility scan on quarantine results' });
    cy.checkA11y('#quarantine-view', {
      runOnly: {
        type: 'tag',
        values: ['section508', 'best-practice']
      }
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
    cy.checkA11y('#stats-container', { runOnly: { type: 'tag', values: ['wcag2aa'] } });
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

    reportTestProgress({ step: 'Testing Escape key closure' });
    // Simulate pressing the Escape key globally
    cy.get('body').type('{esc}');

    // Verify the modal actually closes
    cy.get('#email-modal').should('not.be.visible');

    // Best Practice Check: Did focus return to the button that opened it?
    cy.get('.view-btn').first().should('have.focus');
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
    cy.checkA11y('#whitelist-tags', {
      runOnly: { type: 'tag', values: ['wcag2aa'] }
    });
  });

  it('scans representative mock inbox data using enabled filters and the whitelist', () => {
    reportTestProgress({
      step: 'Enabling all filters and adding a trusted sender',
      view: 'dashboard'
    });
    cy.get('#filter-list input[type="checkbox"]').check({ multiple: true });
    cy.get('#whitelist-input').type('trusted@example.com{enter}');
    cy.get('#whitelist-tags').should('contain.text', 'trusted@example.com');

    cy.get('#save-btn').click();
    cy.get('#mock-scan-result').should('contain.text', 'Mock filters and trusted senders saved.');
    cy.get('#scan-mock-inbox-btn').click();

    cy.get('#mock-scan-result').should('have.text', 'Scanned 11 sample emails; quarantined 9.');
    cy.get('#total-blocked').should('have.text', '11');
    cy.contains('.tab-btn', 'Quarantine Vault').click();
    cy.get('#quarantine-list .q-item').should('have.length', 11);
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

    cy.get('#total-blocked').should('have.text', '2');
    cy.get('#dashboard-overlay .overlay-text').should('have.text', 'Airspace Secured');
  });

  it('Executes the Purge Analytics Workflow', () => {
    cy.on('window:confirm', () => true);

    reportTestProgress({ step: 'Expanding analytics details', view: 'dashboard', action: 'expand-stats' });
    cy.get('.stats-header').click();
    reportTestProgress({ step: 'Purging analytics', action: 'purge-start' });
    cy.get('#purge-btn').should('be.visible').click();

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
    cy.get('#quarantine-list .q-item').should('have.length', 2);
    cy.get('#dashboard-view').should('not.be.visible');

    reportTestProgress({ step: 'Opening Threat Intel', view: 'intel' });
    cy.contains('.tab-btn', 'Threat Intel').click();
    cy.get('#intel-view').should('be.visible');
  });

});