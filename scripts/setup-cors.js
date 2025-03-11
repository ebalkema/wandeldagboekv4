/**
 * Script om CORS-configuratie voor Firebase Storage in te stellen
 * 
 * Gebruik: node scripts/setup-cors.js
 * 
 * Vereist: Firebase CLI geïnstalleerd en ingelogd
 * npm install -g firebase-tools
 * firebase login
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// CORS-configuratie
const corsConfig = [
  {
    origin: ["*"],
    method: ["GET", "POST", "PUT", "DELETE", "HEAD"],
    maxAgeSeconds: 3600,
    responseHeader: ["Content-Type", "Content-Disposition", "Content-Length"]
  }
];

// Schrijf de CORS-configuratie naar een tijdelijk bestand
const tempFilePath = path.join(__dirname, 'cors.json');
fs.writeFileSync(tempFilePath, JSON.stringify(corsConfig, null, 2));

console.log('CORS-configuratie aangemaakt:', tempFilePath);
console.log('CORS-configuratie inhoud:', JSON.stringify(corsConfig, null, 2));

try {
  // Voer het Firebase CLI-commando uit om de CORS-configuratie in te stellen
  console.log('CORS-configuratie instellen voor Firebase Storage...');
  execSync(`firebase storage:cors update ${tempFilePath} --project wandeldagboekv3`, { stdio: 'inherit' });
  console.log('CORS-configuratie succesvol ingesteld!');
} catch (error) {
  console.error('Fout bij het instellen van CORS-configuratie:', error.message);
  console.log('');
  console.log('Handmatige instructies:');
  console.log('1. Installeer Firebase CLI: npm install -g firebase-tools');
  console.log('2. Log in bij Firebase: firebase login');
  console.log('3. Voer het volgende commando uit:');
  console.log(`   firebase storage:cors update ${tempFilePath} --project wandeldagboekv3`);
} finally {
  // Verwijder het tijdelijke bestand
  fs.unlinkSync(tempFilePath);
  console.log('Tijdelijk bestand verwijderd:', tempFilePath);
} 