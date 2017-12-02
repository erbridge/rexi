const cp = require('child_process');
const net = require('net');

const chalk = require('chalk');

const port = process.env.PORT || 3000;

process.env.REACT_SERVER_URL = `http://localhost:${port}`;

const client = new net.Socket();

let electronWasStarted = false;

const startElectron = () =>
  client.connect({ port }, () => {
    client.end();

    if (!electronWasStarted) {
      console.log(chalk.cyan('Starting electron...\n'));

      electronWasStarted = true;

      cp.spawn('yarn run start-electron', {
        shell: true,
        stdio: 'inherit',
      });
    }
  });

client.on('error', error => {
  setTimeout(startElectron, 1000);
});

startElectron();
