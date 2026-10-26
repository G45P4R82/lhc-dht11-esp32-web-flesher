import { ESPLoader, HardReset, Transport } from './lib/esp32.js';

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function blobToBinaryString(blob) {
  const buffer = await blob.arrayBuffer();
  return String.fromCharCode(...new Uint8Array(buffer));
}

export async function flashEsp32(port, file, { address, eraseAll, onProgress }) {
  const transport = new Transport(port, true);
  const terminal = {
    clean() {},
    writeLine(message) { console.info(message); },
    write(message) { console.info(message); },
  };
  const options = {
    transport,
    terminal,
    compress: true,
    eraseAll,
    flashSize: 'keep',
    flashMode: 'keep',
    flashFreq: 'keep',
    baudrate: 115200,
    romBaudrate: 115200,
    fileArray: [{ data: await blobToBinaryString(file), address }],
    reportProgress: (_, written, total) => onProgress((written / total) * 100),
  };
  const loader = new ESPLoader(options);
  loader.hr = new HardReset(transport);

  try {
    await loader.main();
    await loader.flashId();
    await loader.writeFlash(options);
    await delay(100);
    await loader.after('hard_reset');
  } finally {
    await transport.disconnect();
  }

  return port;
}
