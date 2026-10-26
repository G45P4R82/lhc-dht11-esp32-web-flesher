import { flashEsp32 } from './flash.js';

const fields = {
  firmware: document.querySelector('#firmware'),
  fullImage: document.querySelector('#full-image'),
  board: document.querySelector('#board'),
  sensor: document.querySelector('#sensor'),
  pin: document.querySelector('#pin'),
  port: document.querySelector('#port'),
  wifiSsid: document.querySelector('#wifi-ssid'),
  wifiPassword: document.querySelector('#wifi-password'),
  mqttHost: document.querySelector('#mqtt-host'),
  mqttUser: document.querySelector('#mqtt-user'),
  mqttPassword: document.querySelector('#mqtt-password'),
};
const reviewButton = document.querySelector('#review');
const confirmation = document.querySelector('#confirmation');
const summary = document.querySelector('#summary');
const flashButton = document.querySelector('#flash');
const cancelButton = document.querySelector('#cancel');
const status = document.querySelector('#status');

function log(message) {
  status.textContent = message;
}

function configuration() {
  return {
    wifiSsid: fields.wifiSsid.value.trim(),
    wifiPassword: fields.wifiPassword.value,
    mqttHost: fields.mqttHost.value.trim(),
    mqttPort: Number(fields.port.value),
    mqttUser: fields.mqttUser.value.trim(),
    mqttPassword: fields.mqttPassword.value,
  };
}

function validate(config) {
  if (!fields.firmware.files?.length) return 'Selecione o arquivo .bin do firmware.';
  if (!config.wifiSsid || !config.wifiPassword || !config.mqttHost || !config.mqttUser || !config.mqttPassword) {
    return 'Preencha todos os campos de Wi-Fi e MQTT.';
  }
  if (!Number.isInteger(config.mqttPort) || config.mqttPort < 1 || config.mqttPort > 65535) {
    return 'Informe uma porta MQTT válida.';
  }
  return '';
}

function escapedSummary(config) {
  return [
    `Placa: ${fields.board.value}`,
    `Sensor: ${fields.sensor.value} no ${fields.pin.value}`,
    `Wi-Fi: ${config.wifiSsid}`,
    `MQTT: ${config.mqttHost}:${config.mqttPort}`,
    `Firmware: ${fields.firmware.files[0].name}`,
    '',
    'A senha será enviada somente pela USB e salva no ESP32.',
    'Deseja gravar esta configuração na placa?',
  ].join('\n');
}

reviewButton.addEventListener('click', () => {
  const config = configuration();
  const error = validate(config);
  if (error) {
    log(error);
    return;
  }
  summary.textContent = escapedSummary(config);
  confirmation.classList.remove('hidden');
  log('Revise os dados antes de confirmar.');
});

cancelButton.addEventListener('click', () => {
  confirmation.classList.add('hidden');
  log('Gravação cancelada.');
});

fields.firmware.addEventListener('change', () => {
  reviewButton.disabled = !fields.firmware.files?.length;
  if (fields.firmware.files?.length) log(`Firmware selecionado: ${fields.firmware.files[0].name}`);
});

flashButton.addEventListener('click', async () => {
  const config = configuration();
  const error = validate(config);
  if (error) {
    log(error);
    return;
  }
  if (!('serial' in navigator)) {
    log('Web Serial não está disponível. Use Chrome ou Edge em HTTPS.');
    return;
  }

  flashButton.disabled = true;
  cancelButton.disabled = true;
  try {
    const port = await navigator.serial.requestPort();
    const address = fields.fullImage.checked ? 0x000000 : 0x10000;
    const flashedPort = await flashEsp32(port, fields.firmware.files[0], {
      address,
      eraseAll: fields.fullImage.checked,
      onProgress: percent => log(`Gravando firmware: ${percent.toFixed(1)}%`),
    });
    log('Firmware gravado. Abra a porta serial para enviar a configuração.');
    await configureSerial(flashedPort, config);
    log('Configuração salva no ESP32. O dispositivo será reiniciado.');
  } catch (error) {
    log(`Falha: ${error.message}`);
  } finally {
    flashButton.disabled = false;
    cancelButton.disabled = false;
  }
});

async function configureSerial(port, config) {
  await new Promise(resolve => setTimeout(resolve, 1200));
  if (!port.readable && !port.writable) await port.open({ baudRate: 115200 });
  const writer = port.writable.getWriter();
  const command = [
    config.wifiSsid,
    config.wifiPassword,
    config.mqttHost,
    config.mqttPort,
    config.mqttUser,
    config.mqttPassword,
  ].join('|');
  await writer.write(new TextEncoder().encode(`CONFIG_SET ${command}\n`));
  writer.releaseLock();
  await new Promise(resolve => setTimeout(resolve, 500));
  await port.close();
}
