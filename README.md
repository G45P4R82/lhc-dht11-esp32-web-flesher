# LHC DHT11 ESP32 Web Flasher

Web flasher para gravar o firmware do sensor ESP32 + DHT11 diretamente pelo
navegador usando Web Serial e `esptool.js`.

## Estado atual

O flasher permite selecionar a placa, informar que o sensor é um DHT11 no
GPIO5, preencher os dados equivalentes ao `secrets.h`, revisar um resumo e
confirmar a gravação. Depois do upload, ele envia as credenciais pela mesma
porta USB para serem salvas na NVS do ESP32.

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

## Fluxo de configuração

1. Selecione o firmware `.bin`.
2. Confirme `ESP32 Dev Module`, `DHT11` e `GPIO5`.
3. Preencha Wi-Fi e MQTT.
4. Clique em `Revisar configuração`.
5. Confirme `Sim, gravar na placa`.
6. Escolha a porta USB quando o navegador solicitar.
7. Aguarde o firmware ser gravado.
8. O flasher envia `CONFIG_SET` pela serial.
9. O firmware salva os dados na NVS e passa a usá-los para Wi-Fi/MQTT.

As credenciais não são enviadas a um servidor. Elas ficam no navegador durante
a sessão e são transmitidas diretamente para o ESP32.

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
