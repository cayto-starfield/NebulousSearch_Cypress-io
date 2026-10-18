const { spawn } = require('node:child_process');
const path = require('node:path');

const [command = 'open'] = process.argv.slice(2);
if (!['open', 'run'].includes(command)) {
  console.error(`Unsupported Cypress command: ${command}`);
  process.exit(1);
}

let server;
let cypress;
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  server?.kill();
  if (cypress && !cypress.killed) cypress.kill();
  process.exitCode = code;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}

async function isServerReady() {
  const url = 'http://localhost:8080/.github/workflows/Index.html';
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (shuttingDown) return false;

    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  return false;
}

async function start() {
  if (!await isServerReady()) {
    server = spawn(process.execPath, [path.join(__dirname, 'serve.js')], {
      stdio: 'inherit'
    });

    server.on('error', error => {
      console.error('Unable to start the local test server:', error);
      shutdown(1);
    });

    server.on('exit', code => {
      if (!shuttingDown && code !== 0) {
        console.error(`Local test server exited with code ${code}.`);
        shutdown(code || 1);
      }
    });

    if (!await isServerReady()) {
      console.error('The local test server did not become ready within 7.5 seconds.');
      shutdown(1);
      return;
    }
  }

  const cypressPackage = require.resolve('cypress/package.json');
  const cypressCli = path.join(path.dirname(cypressPackage), 'bin', 'cypress');
  const cypressArgs = command === 'run'
    ? ['run', '--headed', '--browser', 'electron', '--runner-ui', '--no-exit']
    : ['open'];
  cypress = spawn(process.execPath, [cypressCli, ...cypressArgs], {
    stdio: 'inherit'
  });

  cypress.on('error', error => {
    console.error('Unable to launch the Cypress test runner:', error);
    shutdown(1);
  });
  cypress.on('exit', code => shutdown(code || 0));
}

start().catch(error => {
  console.error('Unable to open the Cypress test runner:', error);
  shutdown(1);
});
