import { flashEsp32 } from './flash.js';

const panels = [...document.querySelectorAll('.panel')];
const steps = [...document.querySelectorAll('.step')];
const backButton = document.querySelector('#back');
const nextButton = document.querySelector('#next');
const finishButton = document.querySelector('#finish');
const summary = document.querySelector('#summary');
const status = document.querySelector('#status');
const fields = {
  board: document.querySelector('#board'), sensor: document.querySelector('#sensor'), pin: document.querySelector('#pin'),
  wifiSsid: document.querySelector('#wifi-ssid'), wifiPassword: document.querySelector('#wifi-password'),
  mqttHost: document.querySelector('#mqtt-host'), mqttPort: document.querySelector('#port'),
  mqttUser: document.querySelector('#mqtt-user'), mqttPassword: document.querySelector('#mqtt-password'),
  firmware: document.querySelector('#firmware'), customFirmware: document.querySelector('#custom-firmware'), fullImage: document.querySelector('#full-image'),
};
let current = 0;

function log(message) { status.textContent = message; }
function selectedFirmware() {
  const custom = fields.customFirmware.files?.[0];
  return custom || { name: fields.firmware.value.split('/').pop(), url: fields.firmware.value };
}
function config() {
  return { wifiSsid: fields.wifiSsid.value.trim(), wifiPassword: fields.wifiPassword.value, mqttHost: fields.mqttHost.value.trim(), mqttPort: Number(fields.mqttPort.value), mqttUser: fields.mqttUser.value.trim(), mqttPassword: fields.mqttPassword.value };
}
function validate(index) {
  if (index === 0 && (!fields.board.value || fields.sensor.value !== 'DHT11' || fields.pin.value !== 'GPIO5')) return 'Confirme ESP32, DHT11 e GPIO5.';
  if (index === 1) { const value = config(); if (!value.wifiSsid || !value.wifiPassword || !value.mqttHost || !value.mqttUser || !value.mqttPassword) return 'Preencha todos os dados de Wi-Fi e MQTT.'; if (!Number.isInteger(value.mqttPort) || value.mqttPort < 1 || value.mqttPort > 65535) return 'Informe uma porta MQTT válida.'; }
  if (index === 2 && !fields.firmware.value && !fields.customFirmware.files?.length) return 'Escolha um firmware.';
  return '';
}
function render(index) {
  panels.forEach((panel, panelIndex) => panel.classList.toggle('active', panelIndex === index));
  steps.forEach((step, stepIndex) => { step.classList.toggle('active', stepIndex === index); step.classList.toggle('done', stepIndex < index); });
  backButton.disabled = index === 0;
  nextButton.classList.toggle('hidden', index >= 4);
  finishButton.classList.toggle('hidden', index !== 4);
}
function buildSummary() {
  const value = config();
  summary.replaceChildren();
  [['Placa', fields.board.value], ['Sensor', `${fields.sensor.value} · ${fields.pin.value}`], ['Wi-Fi', value.wifiSsid], ['MQTT', `${value.mqttHost}:${value.mqttPort}`], ['Firmware', selectedFirmware().name]].forEach(([label, content]) => { const item = document.createElement('div'); const title = document.createElement('strong'); title.textContent = label; item.append(title, document.createTextNode(content)); summary.append(item); });
}
async function startFlash() {
  const value = config();
  if (!('serial' in navigator)) throw new Error('Web Serial não está disponível. Use Chrome ou Edge em HTTPS.');
  const port = await navigator.serial.requestPort();
  const firmware = selectedFirmware();
  const firmwareFile = firmware instanceof File ? firmware : await fetch(firmware.url).then(response => { if (!response.ok) throw new Error(`Não foi possível baixar o firmware: HTTP ${response.status}`); return response.blob(); });
  const flashedPort = await flashEsp32(port, firmwareFile, { address: fields.fullImage.checked ? 0 : 0x10000, eraseAll: fields.fullImage.checked, onProgress: percent => log(`Gravando firmware: ${percent.toFixed(1)}%`) });
  await configureSerial(flashedPort, value);
  log('Firmware e configuração salvos. O ESP32 será reiniciado.');
}
async function configureSerial(port, value) {
  await new Promise(resolve => setTimeout(resolve, 1200));
  if (!port.readable && !port.writable) await port.open({ baudRate: 115200 });
  const writer = port.writable.getWriter();
  const command = [value.wifiSsid, value.wifiPassword, value.mqttHost, value.mqttPort, value.mqttUser, value.mqttPassword].join('|');
  await writer.write(new TextEncoder().encode(`CONFIG_SET ${command}\n`));
  writer.releaseLock();
  await new Promise(resolve => setTimeout(resolve, 500));
  await port.close();
}
nextButton.addEventListener('click', async () => {
  const error = validate(current);
  if (error) { if (current < 4) log(error); return; }
  if (current === 2) { fields.fullImage.checked = fields.firmware.value.includes('-merged') || fields.fullImage.checked; buildSummary(); current = 3; render(current); return; }
  if (current === 3) {
    nextButton.disabled = true; backButton.disabled = true; current = 4; render(current); log('Solicitando acesso à porta USB...');
    try { await startFlash(); document.querySelector('#finish-message').textContent = 'Firmware e credenciais foram gravados com sucesso.'; } catch (error) { log(`Falha: ${error.message}`); document.querySelector('#finish-message').textContent = 'A gravação não foi concluída.'; } finally { nextButton.disabled = false; }
    return;
  }
  current += 1; render(current);
});
backButton.addEventListener('click', () => { if (current > 0 && current < 4) { current -= 1; render(current); } });
finishButton.addEventListener('click', () => { current = 0; render(current); log('Assistente reiniciado.'); });
fields.firmware.addEventListener('change', () => { fields.fullImage.checked = fields.firmware.value.includes('-merged'); });
fields.customFirmware.addEventListener('change', () => { fields.fullImage.checked = false; });
