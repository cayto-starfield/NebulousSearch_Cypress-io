const dashboardData = {
  stats: { total: 42, breakdown: [{ name: 'False Gravity', count: 42 }] },
  filters: [],
  whitelist: []
};

const cyberNews = [
  {
    id: 0,
    title: 'Phantom Payload Campaign Surges',
    date: 'Oct 18, 2026',
    summary: 'A new wave of fake Geek Squad invoices is bypassing traditional spam filters.',
    content: 'Security researchers have identified a massive spike in invoice fraud utilizing PDF attachments and obfuscated sender domains to bypass baseline defenses.',
    imageUrl: 'https://picsum.photos/seed/cyber1/800/400'
  },
  {
    id: 1,
    title: 'Zero-Width Character Exploits',
    date: 'Oct 17, 2026',
    summary: 'Spammers are sandwiching invisible characters between letters to hide trigger words.',
    content: "By injecting Unicode zero-width spaces (U+200B) into words like 'P a s s w o r d', attackers are successfully evading standard RegEx scanners.",
    imageUrl: 'https://picsum.photos/seed/cyber2/800/400'
  }
];

const quarantineData = [
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
];

function installGoogleAppsScriptMock(win) {
  const methods = {
    getDashboardData: [dashboardData, 1000],
    clearStats: [{ success: true }, 1500],
    getCyberNews: [cyberNews, 1200],
    getQuarantineData: [quarantineData, 1000],
    saveFilterSettings: [{ success: true }, 0]
  };

  function createRunner(successHandler, failureHandler) {
    const runner = {
      withSuccessHandler(callback) {
        return createRunner(callback, failureHandler);
      },
      withFailureHandler(callback) {
        return createRunner(successHandler, callback);
      }
    };

    Object.entries(methods).forEach(([method, [result, delay]]) => {
      runner[method] = () => win.setTimeout(() => successHandler?.(result), delay);
    });

    return runner;
  }

  win.google = {
    script: {
      run: {
        withSuccessHandler: callback => createRunner(callback),
        withFailureHandler: callback => createRunner(undefined, callback)
      }
    }
  };
}

function visitApp() {
  cy.visit('/.github/workflows/Index.html', {
    onBeforeLoad: installGoogleAppsScriptMock
  });
}

describe('NebulousSearch UI Framework & Accessibility', () => {
  beforeEach(() => {
    visitApp();
    cy.injectAxe();
  });

  it('Passes Section 508 & WCAG 2.1 AA checks on Dashboard Load', () => {
    cy.get('#dashboard-overlay .overlay-text', { timeout: 3000 }).should('have.text', 'Airspace Secured');

    cy.checkA11y(null, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'section508']
      }
    });
  });

  it('Passes accessibility checks after opening the Quarantine Vault', () => {
    cy.contains('.tab-btn', 'Quarantine Vault').click();
    cy.get('#quarantine-view').should('be.visible');
    cy.get('#quarantine-overlay .overlay-text', { timeout: 3000 }).should('have.text', 'Access Granted');
    cy.get('#quarantine-list .q-item').should('have.length', 2);

    cy.checkA11y('#quarantine-view', {
      runOnly: {
        type: 'tag',
        values: ['section508', 'best-practice']
      }
    });
  });

});

describe('NebulousSearch UI Framework', () => {
  beforeEach(() => {
    visitApp();
  });

  it('Validates Glassmorphism Loading States on Dashboard Load', () => {
    cy.get('#dashboard-overlay').should('be.visible');
    cy.get('#dashboard-overlay .glass-spinner').should('exist');
    cy.contains('.overlay-text', 'Scanning local airspace...').should('be.visible');

    cy.get('#total-blocked').should('have.text', '42');
    cy.get('#dashboard-overlay .overlay-text').should('have.text', 'Airspace Secured');
  });

  it('Executes the Purge Analytics Workflow', () => {
    cy.on('window:confirm', () => true);

    cy.get('.stats-header').click();
    cy.get('#purge-btn').should('be.visible').click();

    cy.get('#purge-overlay').should('be.visible');
    cy.get('#purge-overlay .glass-spinner').should('exist');

    cy.get('#total-blocked').should('have.text', '0');
    cy.get('#purge-overlay .overlay-text').should('have.text', 'Purge Complete');
  });

  it('Navigates the Command Center Tabs', () => {
    cy.contains('.tab-btn', 'Quarantine Vault').click();
    cy.get('#quarantine-view').should('be.visible');
    cy.get('#quarantine-overlay .overlay-text', { timeout: 3000 }).should('have.text', 'Access Granted');
    cy.get('#quarantine-list .q-item').should('have.length', 2);
    cy.get('#dashboard-view').should('not.be.visible');

    cy.contains('.tab-btn', 'Threat Intel').click();
    cy.get('#intel-view').should('be.visible');
  });
});