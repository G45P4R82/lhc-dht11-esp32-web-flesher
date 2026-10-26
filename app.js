(function () {
  'use strict';

  const panels = Array.from(document.querySelectorAll('.panel'));
  const steps = Array.from(document.querySelectorAll('.step'));
  const backButton = document.getElementById('back');
  const nextButton = document.getElementById('next');
  const finishButton = document.getElementById('finish');
  const summary = document.getElementById('summary');
  const status = document.getElementById('status');
  const fields = {
    board: document.getElementById('board'), sensor: document.getElementById('sensor'), pin: document.getElementById('pin'),
    wifiSsid: document.getElementById('wifi-ssid'), wifiPassword: document.getElementById('wifi-password'),
    mqttHost: document.getElementById('mqtt-host'), mqttPort: document.getElementById('port'),
    mqttUser: document.getElementById('mqtt-user'), mqttPassword: document.getElementById('mqtt-password'),
    firmware: document.getElementById('firmware'), customFirmware: document.getElementById('custom-firmware'), fullImage: document.getElementById('full-image'),
  };
  let current = 0;

  function log(message) { status.textContent = message; }
  function config() { return { wifiSsid: fields.wifiSsid.value.trim(), wifiPassword: fields.wifiPassword.value, mqttHost: fields.mqttHost.value.trim(), mqttPort: Number(fields.mqttPort.value), mqttUser: fields.mqttUser.value.trim(), mqttPassword: fields.mqttPassword.value }; }
  function selectedFirmware() { const custom = fields.customFirmware.files && fields.customFirmware.files[0]; return custom || { name: fields.firmware.value.split('/').pop(), url: fields.firmware.value }; }
  function validate(index) {
    if (index === 0 && (!fields.board.value || fields.sensor.value !== 'DHT11' || fields.pin.value !== 'GPIO5')) return 'Confirme ESP32, DHT11 e GPIO5.';
    if (index === 1) { const value = config(); if (!value.wifiSsid || !value.wifiPassword || !value.mqttHost || !value.mqttUser || !value.mqttPassword) return 'Preencha todos os dados de Wi-Fi e MQTT.'; if (!Number.isInteger(value.mqttPort) || value.mqttPort < 1 || value.mqttPort > 65535) return 'Informe uma porta MQTT válida.'; }
    return '';
  }
  function render(index) {
    panels.forEach((panel, panelIndex) => { panel.classList.toggle('active', panelIndex === index); });
    steps.forEach((step, stepIndex) => { step.classList.toggle('active', stepIndex === index); step.classList.toggle('done', stepIndex < index); });
    backButton.disabled = index === 0;
    nextButton.classList.toggle('hidden', index >= 4);
    finishButton.classList.toggle('hidden', index !== 4);
  }
  function buildSummary() {
    const value = config();
    summary.replaceChildren();
    [['Placa', fields.board.value], ['Sensor', fields.sensor.value + ' · ' + fields.pin.value], ['Wi-Fi', value.wifiSsid], ['MQTT', value.mqttHost + ':' + value.mqttPort], ['Firmware', selectedFirmware().name]].forEach(([label, content]) => { const item = document.createElement('div'); const title = document.createElement('strong'); title.textContent = label; item.appendChild(title); item.appendChild(document.createTextNode(content)); summary.appendChild(item); });
  }
  async function startFlash() {
    if (!('serial' in navigator)) throw new Error('Web Serial não está disponível. Use Chrome ou Edge em HTTPS.');
    const module = await import('./flash.js');
    const port = await navigator.serial.requestPort();
    const firmware = selectedFirmware();
    const file = firmware instanceof File ? firmware : await fetch(firmware.url).then(response => { if (!response.ok) throw new Error('Firmware não encontrado: HTTP ' + response.status); return response.blob(); });
    const flashedPort = await module.flashEsp32(port, file, { address: fields.fullImage.checked ? 0 : 0x10000, eraseAll: fields.fullImage.checked, onProgress: percent => log('Gravando firmware: ' + percent.toFixed(1) + '%') });
    await configureSerial(flashedPort, config());
  }
  async function configureSerial(port, value) {
    await new Promise(resolve => setTimeout(resolve, 1200));
    if (!port.readable && !port.writable) await port.open({ baudRate: 115200 });
    const writer = port.writable.getWriter();
    const command = [value.wifiSsid, value.wifiPassword, value.mqttHost, value.mqttPort, value.mqttUser, value.mqttPassword].join('|');
    await writer.write(new TextEncoder().encode('CONFIG_SET ' + command + '\n'));
    writer.releaseLock();
    await new Promise(resolve => setTimeout(resolve, 500));
    await port.close();
  }
  nextButton.addEventListener('click', async function () {
    const error = validate(current);
    if (error) { log(error); return; }
    if (current === 2) { fields.fullImage.checked = fields.firmware.value.indexOf('-merged') >= 0 || fields.fullImage.checked; buildSummary(); current = 3; render(current); return; }
    if (current === 3) {
      nextButton.disabled = true; backButton.disabled = true; current = 4; render(current); log('Solicitando acesso à porta USB...');
      try { await startFlash(); document.getElementById('finish-message').textContent = 'Firmware e credenciais foram gravados com sucesso.'; log('Concluído.'); } catch (error) { document.getElementById('finish-message').textContent = 'A gravação não foi concluída.'; log('Falha: ' + error.message); }
      nextButton.disabled = false; return;
    }
    current += 1; render(current);
  });
  backButton.addEventListener('click', function () { if (current > 0 && current < 4) { current -= 1; render(current); } });
  finishButton.addEventListener('click', function () { current = 0; render(current); log('Assistente reiniciado.'); });
  fields.firmware.addEventListener('change', function () { fields.fullImage.checked = fields.firmware.value.indexOf('-merged') >= 0; });
  fields.customFirmware.addEventListener('change', function () { fields.fullImage.checked = false; });
  render(current);
}());
