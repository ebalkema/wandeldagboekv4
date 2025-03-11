/**
 * Script om het buildnummer automatisch te verhogen bij elke build
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Bepaal het pad naar package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '..', 'package.json');

// Lees het package.json bestand
console.log('Buildnummer verhogen...');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Verhoog het buildnummer
const currentBuildNumber = packageJson.buildNumber || 0;
const newBuildNumber = currentBuildNumber + 1;
packageJson.buildNumber = newBuildNumber;

// Schrijf het bijgewerkte package.json bestand
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

// Maak een bestand met versie-informatie voor gebruik in de app
const versionInfoPath = path.join(__dirname, '..', 'src', 'version.js');
const versionInfo = {
  version: packageJson.version,
  buildNumber: newBuildNumber,
  buildDate: new Date().toISOString()
};

const versionFileContent = `/**
 * Automatisch gegenereerd versiebestand
 * Niet handmatig bewerken!
 */

export const VERSION = "${packageJson.version}";
export const BUILD_NUMBER = ${newBuildNumber};
export const BUILD_DATE = "${new Date().toISOString()}";

export default {
  version: VERSION,
  buildNumber: BUILD_NUMBER,
  buildDate: BUILD_DATE
};
`;

// Maak de src directory als deze nog niet bestaat
const srcDir = path.join(__dirname, '..', 'src');
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir, { recursive: true });
}

// Schrijf het versiebestand
fs.writeFileSync(versionInfoPath, versionFileContent);

console.log(`Buildnummer verhoogd naar ${newBuildNumber}`); 