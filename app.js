import { flashEsp32 } from './flash.js';

const firmwareInput = document.querySelector('#firmware');
const fullImage = document.querySelector('#full-image');
const flashButton = document.querySelector('#flash');
const status = document.querySelector('#status');

function log(message) {
  status.textContent = message;
}

firmwareInput.addEventListener('change', () => {
  flashButton.disabled = !firmwareInput.files?.length;
  if (firmwareInput.files?.length) log(`Arquivo selecionado: ${firmwareInput.files[0].name}`);
});

flashButton.addEventListener('click', async () => {
  const file = firmwareInput.files?.[0];
  if (!file) return;

  if (!('serial' in navigator)) {
    log('Web Serial não está disponível. Use Chrome ou Edge em HTTPS.');
    return;
  }

  flashButton.disabled = true;
  try {
    const port = await navigator.serial.requestPort();
    const address = fullImage.checked ? 0x000000 : 0x10000;
    await flashEsp32(port, file, {
      address,
      eraseAll: fullImage.checked,
      onProgress: percent => log(`Gravando: ${percent.toFixed(1)}%`),
    });
    log('Gravação concluída. O ESP32 foi reiniciado.');
  } catch (error) {
    log(`Falha: ${error.message}`);
  } finally {
    flashButton.disabled = false;
  }
});
