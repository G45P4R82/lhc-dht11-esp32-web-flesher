# LHC DHT11 ESP32 Web Flasher

Web flasher para gravar o firmware do sensor ESP32 + DHT11 diretamente pelo
navegador usando Web Serial e `esptool.js`.

## Estado atual

Este repositório contém a base inicial do flasher. A interface já está
preparada para selecionar um firmware local e iniciar a gravação no ESP32.

O navegador precisa ser Chrome ou Edge em HTTPS. O usuário deve clicar no
botão para autorizar a porta serial.

## Firmware

Coloque o binário compilado em:

```text
firmware/esp32-dht11-v1.0.0.bin
```

O firmware atual do projeto principal está em:

```text
https://github.com/G45P4R82/lhc-campinas-esp32-dht11
```

O binário não deve conter credenciais MQTT ou Wi-Fi reais compartilhadas
publicamente.

## Desenvolvimento local

Sirva os arquivos por HTTP ou HTTPS. Não abra diretamente com `file://`, pois a
Web Serial API exige um contexto seguro.

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000` no Chrome ou Edge.

## Aviso de segurança

Gravar firmware pode apagar ou substituir o conteúdo do ESP32. Confirme a
placa e a porta antes de iniciar. O modo de instalação completa pode usar o
endereço `0x000000`; atualizações somente da aplicação normalmente usam
`0x10000`, conforme o layout de partições usado na compilação.
