'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const boot = 'const initialArena=restart();';
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
if (!html.includes(boot)) throw Error('Inicialização da arena não encontrada.');
const probe = fs.readFileSync(path.join(__dirname, 'audit-room-client-probe.js'), 'utf8');
fs.writeFileSync(path.join(root, 'audit-room-client.html'), html.replace(boot, () => `${boot}\n${probe}`));
fs.copyFileSync(path.join(__dirname, 'audit-webrtc.html'), path.join(root, 'audit-webrtc.html'));
