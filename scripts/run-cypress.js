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

async function hasProgressApi(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/__test-progress`);
    if (!response.ok) return false;
    const state = await response.json();
    return ['idle', 'running', 'passed', 'failed'].includes(state.status) &&
      typeof state.sequence === 'number';
  } catch {
    return false;
  }
}

async function waitForProgressApi(port) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (shuttingDown) return false;
    if (await hasProgressApi(port)) return true;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return false;
}

async function start() {
  const serverPort = 8081;

  if (!await hasProgressApi(serverPort)) {
    server = spawn(process.execPath, [path.join(__dirname, 'serve.js')], {
      stdio: 'inherit',
      env: { ...process.env, PORT: String(serverPort) }
    });

    server.on('error', error => {
      console.error('Unable to start the test progress server:', error);
      shutdown(1);
    });

    server.on('exit', code => {
      if (!shuttingDown && code !== 0) {
        console.error(`Test progress server exited with code ${code}.`);
        shutdown(code || 1);
      }
    });

    if (!await waitForProgressApi(serverPort)) {
      if (!shuttingDown) {
        console.error(`The test progress server did not become ready on port ${serverPort}.`);
        shutdown(1);
      }
      return;
    }
  }

  const cypressPackage = require.resolve('cypress/package.json');
  const cypressCli = path.join(path.dirname(cypressPackage), 'bin', 'cypress');
  const cypressArgs = command === 'run'
    ? ['run', '--headed', '--browser', 'electron', '--runner-ui', '--no-exit']
    : ['open'];
  cypress = spawn(process.execPath, [cypressCli, ...cypressArgs], {
    stdio: 'inherit',
    env: { ...process.env, CYPRESS_BASE_URL: `http://127.0.0.1:${serverPort}` }
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
