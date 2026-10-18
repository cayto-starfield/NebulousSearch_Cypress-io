if (typeof google === 'undefined') {
  window.google = {
    script: {
      run: {
        withSuccessHandler: function(callback) {
          this.callback = callback;
          return this;
        },
        withFailureHandler: function() { return this; },

        // 1. Command Center Mock
        getDashboardData: function() {
          setTimeout(() => this.callback({
            stats: { total: 42, breakdown: [{name: 'False Gravity', count: 42}] },
            filters: [], whitelist: []
          }), 1000);
        },

        // 2. Purge Mock
        clearStats: function() {
          setTimeout(() => this.callback({ success: true }), 1500);
        },

        // 3. Cyber News Mock (Triggered on page load)
        getCyberNews: function() {
          setTimeout(() => this.callback([
            {
              id: 0,
              title: "Phantom Payload Campaign Surges",
              date: "Oct 18, 2026",
              summary: "A new wave of fake Geek Squad invoices is bypassing traditional spam filters.",
              content: "Security researchers have identified a massive spike in invoice fraud utilizing PDF attachments and obfuscated sender domains to bypass baseline defenses.",
              imageUrl: "https://picsum.photos/seed/cyber1/800/400"
            },
            {
              id: 1,
              title: "Zero-Width Character Exploits",
              date: "Oct 17, 2026",
              summary: "Spammers are sandwiching invisible characters between letters to hide trigger words.",
              content: "By injecting Unicode zero-width spaces (U+200B) into words like 'P a s s w o r d', attackers are successfully evading standard RegEx scanners.",
              imageUrl: "https://picsum.photos/seed/cyber2/800/400"
            }
          ]), 1200);
        },

        // 4. Quarantine Vault Mock (Triggered when the Vault tab is clicked)
        getQuarantineData: function() {
          setTimeout(() => this.callback([
            {
              id: 'thread-001',
              subject: 'ACCOUNT SUSPENDED: Immediate Action Required',
              sender: 'security@paypaI-alert.com',
              date: 'Oct 18, 08:15 AM',
              filterId: 'urgent_phishing',
              filterName: 'False Gravity (Urgency Scams)',
              body: 'Your account access has been restricted. Click the secure link below to verify your identity and restore access.'
            },
            {
              id: 'thread-002',
              subject: 'N.o.r.t.o.n Auto-Renewal Receipt #9982',
              sender: 'billing@nort0n-secure.net',
              date: 'Oct 17, 14:30 PM',
              filterId: 'period_obfuscation',
              filterName: 'Meteor Shower (Period Obfuscation)',
              body: 'Thank you for your purchase. You have been billed $399.99 for your annual protection plan. Call us to cancel.'
            }
          ]), 1000);
        }
      }
    }
  };
}
describe('NebulousSearch UI Framework & Accessibility', () => {
  beforeEach(() => {
   cy.visit('/.github/workflows/Index.html');

    // Inject the Axe accessibility engine into the mock DOM
    cy.injectAxe();
  });

  it('Passes Section 508 & WCAG 2.1 AA checks on Dashboard Load', () => {
    // 1. Wait for your mock loading spinner to finish and the DOM to settle
    cy.get('.success-mark', { timeout: 2000 }).should('be.visible');

    // 2. Run the automated accessibility scan
    // We restrict the scan specifically to Section 508 and WCAG AA standards
    cy.checkA11y(null, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'section508']
      }
    });
  });

  it('Passes accessibility checks after opening the Quarantine Vault', () => {
    // Navigate to the vault
    cy.contains('.tab-btn', 'Quarantine Vault').click();
    cy.get('#quarantine-view').should('be.visible');

    // Scope the check specifically to the Vault container to reduce noise and run faster
    cy.checkA11y('#quarantine-view', {
      runOnly: {
        type: 'tag',
        values: ['section508', 'best-practice']
      }
    });
  });

  // ... (Your previous tests for the Purge Workflow remain exactly the same) ...
});

describe('NebulousSearch UI Framework', () => {
  beforeEach(() => {
    // Visit the local mocked version of your app
    cy.visit('/.github/workflows/Index.html');
  });

  it('Validates Glassmorphism Loading States on Dashboard Load', () => {
    // Assert the overlay appears with the spinner
    cy.get('#dashboard-overlay').should('be.visible');
    cy.get('.glass-spinner').should('exist');
    cy.contains('.overlay-text', 'Scanning local airspace...').should('be.visible');

    // Wait for the mock promise to resolve and check for the success mark
    cy.get('.success-mark', { timeout: 2000 }).should('be.visible');
    cy.contains('.overlay-text', 'Airspace Secured').should('be.visible');

    // Verify the mock data populated the DOM
    cy.get('#total-blocked').should('have.text', '42');
  });

  it('Executes the Purge Analytics Workflow', () => {
    // Force click to bypass the window.confirm dialog in Cypress
    cy.on('window:confirm', () => true);

    // Expand the stats card
    cy.get('.stats-header').click();
    cy.get('#purge-btn').should('be.visible').click();

    // Verify Purge loading state
    cy.get('#purge-overlay').should('be.visible');
    cy.get('#purge-overlay .glass-spinner').should('exist');

    // Verify counters reset to 0 after success
    cy.get('.success-mark', { timeout: 2000 }).should('be.visible');
    cy.get('#total-blocked').should('have.text', '0');
  });

  it('Navigates the Command Center Tabs', () => {
    // Click Quarantine Tab
    cy.contains('.tab-btn', 'Quarantine Vault').click();
    cy.get('#quarantine-view').should('be.visible');
    cy.get('#dashboard-view').should('not.be.visible');

    // Click Threat Intel Tab
    cy.contains('.tab-btn', 'Threat Intel').click();
    cy.get('#intel-view').should('be.visible');
  });
});