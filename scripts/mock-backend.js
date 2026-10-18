(function(root, factory) {
  const backend = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = backend;
  } else {
    root.NebulousMockBackend = backend;
  }
})(typeof globalThis === 'undefined' ? this : globalThis, function() {
  const filters = [
    { id: 'excessive_spaces', name: 'Asteroid Belt', description: 'Deletes incoming emails that contain structural spacing anomalies.' },
    { id: 'zero_width_chars', name: 'Dark Matter', description: 'Detects invisible zero-width characters sandwiched between text.' },
    { id: 'urgent_phishing', name: 'False Gravity', description: 'Catches fake urgency/panic tactics like "Account Suspended".' },
    { id: 'all_caps_subject', name: 'Solar Flare', description: 'Trashes emails where the subject line is shouting.' },
    { id: 'crypto_phishing', name: 'Crypto & Wallet Phishing', description: 'Deletes emails with common cryptocurrency scam keywords.' },
    { id: 'fake_invoice', name: 'False Payload', description: 'Blocks fake renewal receipts from scammers impersonating Geek Squad, McAfee, Norton, or PayPal.' },
    { id: 'period_obfuscation', name: 'Meteor Shower', description: 'Blocks emails where spammers insert periods between every letter (e.g. p.a.y.p.a.l).' },
    { id: 'no_alphabetical', name: 'Cosmic Vacuum', description: 'Intercepts emails with subject lines containing zero alphabetical letters (purely digits, symbols, or emojis).' },
    { id: 'suspicious_sender', name: 'Rogue Satellite', description: 'Intercepts emails from anomalous senders (over 50 characters, random alphanumeric strings, profanity, or excessive special characters).' }
  ];

  const filterLogic = {
    excessive_spaces(subject) {
      const massiveGaps = /\s{5,}.*?\s{5,}/.test(subject);
      const spacedOutWord = /\b(?:[a-zA-Z]\s{1,2}){5,}[a-zA-Z]\b/.test(subject);
      return massiveGaps || spacedOutWord;
    },
    zero_width_chars(subject) {
      return /(?:[a-zA-Z0-9][\u200B-\u200D\uFEFF]+){2,}[a-zA-Z0-9]/.test(subject);
    },
    urgent_phishing(subject) {
      return /(?:account suspended|action required|final warning|immediate action required|password expired)/i.test(subject);
    },
    all_caps_subject(subject) {
      if (!subject) return false;
      const cleanSubject = subject.replace(/^(?:re|fwd|fw):\s*/i, '');
      const alphaOnly = cleanSubject.replace(/[^a-zA-Z]/g, '');
      return alphaOnly.length >= 6 && alphaOnly === alphaOnly.toUpperCase();
    },
    crypto_phishing(subject) {
      return /(?:bitcoin|crypto wallet|seed phrase|usdt giveaway)/i.test(subject);
    },
    fake_invoice(subject, body) {
      const invoicePattern = /(?:geek squad|mcafee|norton|lifelock).*(?:invoice|renewal|receipt|billed|auto-charge)/i;
      return invoicePattern.test(subject) || invoicePattern.test(body);
    },
    period_obfuscation(subject) {
      const noSpaces = subject.replace(/\s+/g, '');
      return /(?:[a-zA-Z]\.+){3,}[a-zA-Z]/.test(noSpaces);
    },
    no_alphabetical(subject) {
      return !subject || subject.trim().length === 0 || !/\p{L}/u.test(subject);
    },
    suspicious_sender(subject, body, sender) {
      if (!sender) return false;
      const email = sender.toLowerCase().trim();
      const localPart = email.split('@')[0] || '';
      if (email.length > 50) return true;

      const specialChars = (email.replace(/[@.]/g, '').match(/[^a-z0-9]/g) || []).length;
      if (specialChars >= 4) return true;
      if (/(?:fuck|shit|bitch|asshole|bastard|dick|cunt|slut|whore|pussy)/i.test(email)) return true;

      const isHexHash = /^[a-f0-9]{16,}$/i.test(localPart);
      const isVowelless = /^[bcdfghjklmnpqrstvwxyz0-9]{9,}$/i.test(localPart);
      const isJitter = /(?:[a-z]+\d+){3,}|(?:\d+[a-z]+){3,}/i.test(localPart);
      return isHexHash || isVowelless || isJitter;
    }
  };

  const initialQuarantine = [
    {
      id: 'thread-001',
      subject: 'ACCOUNT SUSPENDED: Immediate Action Required',
      sender: 'security@paypaI-alert.com',
      date: 'Oct 18, 08:15 AM',
      filterId: 'urgent_phishing',
      body: 'Your account access has been restricted. Click the secure link below to verify your identity and restore access.'
    },
    {
      id: 'thread-002',
      subject: 'N.o.r.t.o.n Auto-Renewal Receipt #9982',
      sender: 'billing@nort0n-secure.net',
      date: 'Oct 17, 14:30 PM',
      filterId: 'period_obfuscation',
      body: 'Thank you for your purchase. You have been billed $399.99 for your annual protection plan. Call us to cancel.'
    },
    {
      id: 'thread-003',
      subject: 'Payment     is         overdue',
      sender: 'billing@asteroid-belt.example.net',
      date: 'Oct 16, 09:00 AM',
      filterId: 'excessive_spaces',
      body: 'This notice contains structural spacing anomalies.'
    },
    {
      id: 'thread-004',
      subject: 'P\u200Ba\u200By\u200BP\u200Ba\u200Bl verification',
      sender: 'notice@dark-matter.example.net',
      date: 'Oct 15, 10:15 AM',
      filterId: 'zero_width_chars',
      body: 'This notice contains invisible zero-width characters.'
    },
    {
      id: 'thread-005',
      subject: 'URGENT SECURITY ALERT',
      sender: 'security@solar-flare.example.net',
      date: 'Oct 14, 11:30 AM',
      filterId: 'all_caps_subject',
      body: 'This subject uses excessive capitalization.'
    },
    {
      id: 'thread-006',
      subject: 'Bitcoin seed phrase giveaway',
      sender: 'wallet@crypto-example.net',
      date: 'Oct 13, 12:45 PM',
      filterId: 'crypto_phishing',
      body: 'Claim this suspicious cryptocurrency offer.'
    },
    {
      id: 'thread-007',
      subject: 'Norton renewal receipt',
      sender: 'receipts@false-payload.example.net',
      date: 'Oct 12, 01:00 PM',
      filterId: 'fake_invoice',
      body: 'This message impersonates a vendor with a fake renewal charge.'
    },
    {
      id: 'thread-008',
      subject: '12345 !!!',
      sender: 'numbers@cosmic-vacuum.example.net',
      date: 'Oct 11, 02:15 PM',
      filterId: 'no_alphabetical',
      body: 'This subject contains no alphabetical characters.'
    },
    {
      id: 'thread-009',
      subject: 'Meeting notes',
      sender: '0123456789abcdef0123456789abcdef@example.net',
      date: 'Oct 10, 03:30 PM',
      filterId: 'suspicious_sender',
      body: 'This email has an anomalous sender address.'
    }
  ];

  const sampleInbox = [
    { id: 'sample-spaces', subject: 'Payment     is         overdue', sender: 'billing@example.net', body: 'Please review.' },
    { id: 'sample-zero-width', subject: 'P\u200Ba\u200By\u200BP\u200Ba\u200Bl verification', sender: 'notice@example.net', body: 'Verify your account.' },
    { id: 'sample-urgency', subject: 'Account suspended - act now', sender: 'alerts@example.net', body: 'Immediate action requested.' },
    { id: 'sample-caps', subject: 'URGENT SECURITY ALERT', sender: 'security@example.net', body: 'Please read.' },
    { id: 'sample-crypto', subject: 'Bitcoin seed phrase giveaway', sender: 'wallet@example.net', body: 'Claim your crypto wallet prize.' },
    { id: 'sample-invoice', subject: 'Your account update', sender: 'receipts@example.net', body: 'Norton renewal receipt: payment billed today.' },
    { id: 'sample-periods', subject: 'p.a.y.p.a.l security review', sender: 'notify@example.net', body: 'Review your account.' },
    { id: 'sample-no-letters', subject: '12345 !!!', sender: 'numbers@example.net', body: 'Please review.' },
    { id: 'sample-sender', subject: 'Meeting notes', sender: '0123456789abcdef0123456789abcdef@example.net', body: 'Please see attached.' },
    { id: 'sample-whitelisted', subject: 'Account suspended - security exercise', sender: 'trusted@example.com', body: 'Internal security training notice.' },
    { id: 'sample-safe', subject: 'Project update for Tuesday', sender: 'colleague@example.com', body: 'The team meeting is at 2 PM.' }
  ];

  function createService(options = {}) {
    const delayScale = options.delayScale === undefined ? 1 : options.delayScale;
    let schedule = options.setTimeout || setTimeout;
    let activeFilterIds = [];
    let whitelist = [];
    let quarantine = initialQuarantine.map(item => ({ ...item, filterName: filters.find(filter => filter.id === item.filterId).name }));

    function getDashboardData() {
      const breakdown = filters.map(filter => ({
        id: filter.id,
        name: filter.name,
        count: quarantine.filter(item => item.filterId === filter.id).length
      }));
      return {
        filters: filters.map(filter => ({ ...filter, isActive: activeFilterIds.includes(filter.id) })),
        whitelist: [...whitelist],
        stats: { total: quarantine.length, breakdown: breakdown.sort((a, b) => b.count - a.count) }
      };
    }

    function scanMockInbox() {
      const normalizedWhitelist = whitelist.map(email => email.toLowerCase().trim());
      const newlyQuarantined = [];
      let scannedCount = 0;

      sampleInbox.forEach(message => {
        scannedCount += 1;
        if (quarantine.some(item => item.id === message.id)) return;
        if (normalizedWhitelist.includes(message.sender.toLowerCase().trim())) return;

        const filterId = activeFilterIds.find(id => (
          filterLogic[id] && filterLogic[id](message.subject, message.body, message.sender)
        ));
        if (!filterId) return;

        const item = {
          ...message,
          date: 'Mock sample',
          filterId,
          filterName: filters.find(filter => filter.id === filterId).name
        };
        newlyQuarantined.push(item);
      });

      quarantine = [...quarantine, ...newlyQuarantined];
      return { scannedCount, quarantinedCount: newlyQuarantined.length, totalQuarantined: quarantine.length };
    }

    const methods = {
      getDashboardData: getDashboardData,
      clearStats() {
        quarantine = [];
        return { success: true, message: 'Mock quarantine cleared.' };
      },
      getCyberNews() {
        return [
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
      },
      getQuarantineData() {
        return quarantine.map(item => ({ ...item }));
      },
      saveFilterSettings(nextFilterIds, nextWhitelist = []) {
        activeFilterIds = [...new Set(nextFilterIds.filter(id => filterLogic[id]))];
        whitelist = [...new Set(nextWhitelist.map(email => email.toLowerCase().trim()))];
        return { success: true, message: 'Mock filters and trusted senders saved.' };
      },
      scanMockInbox: scanMockInbox
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

      Object.entries(methods).forEach(([method, implementation]) => {
        runner[method] = (...args) => {
          const [, delay] = {
            getDashboardData: [null, 1000],
            clearStats: [null, 1500],
            getCyberNews: [null, 1200],
            getQuarantineData: [null, 1000],
            saveFilterSettings: [null, 0],
            scanMockInbox: [null, 1200]
          }[method];

          return schedule(() => {
            try {
              successHandler?.(implementation(...args));
            } catch (error) {
              if (failureHandler) failureHandler(error);
              else throw error;
            }
          }, delay * delayScale);
        };
      });

      return runner;
    }

    return {
      filters: filters.map(filter => ({ ...filter })),
      filterLogic,
      sampleInbox: sampleInbox.map(message => ({ ...message })),
      getDashboardData,
      getQuarantineData: methods.getQuarantineData,
      clearStats: methods.clearStats,
      saveFilterSettings: methods.saveFilterSettings,
      scanMockInbox,
      createGoogleMock(win) {
        schedule = win.setTimeout.bind(win);
        return {
          script: {
            run: {
              withSuccessHandler: callback => createRunner(callback, undefined),
              withFailureHandler: callback => createRunner(undefined, callback)
            }
          }
        };
      }
    };
  }

  return {
    filters: filters.map(filter => ({ ...filter })),
    filterLogic,
    sampleInbox: sampleInbox.map(message => ({ ...message })),
    createService
  };
});
