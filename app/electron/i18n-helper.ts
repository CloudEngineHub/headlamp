import * as fs from 'fs';
import * as path from 'path';

// Get the path to the frontend locales directory
let frontendLocalesPath: string;
const isDev = process.env.ELECTRON_DEV || false;

if (isDev) {
  frontendLocalesPath = path.resolve(__dirname, '../../frontend/src/i18n/locales');
} else {
  frontendLocalesPath = path.join(process.resourcesPath, 'frontend/i18n/locales');
}

// Read available locales from the frontend locales directory
const currentLocales: string[] = [];
if (fs.existsSync(frontendLocalesPath)) {
  fs.readdirSync(frontendLocalesPath).forEach(file => currentLocales.push(file));
}

export { currentLocales as CURRENT_LOCALES };
export { frontendLocalesPath as LOCALES_DIR };
