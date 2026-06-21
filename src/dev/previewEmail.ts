import fs from 'node:fs';
import path from 'node:path';
import { verificationEmailTemplate } from '../emailTemplates/verificationEmail';

const html = verificationEmailTemplate('https://example.com/verify-token');

const filePath = path.join(process.cwd(), 'preview-email.html');

fs.writeFileSync(filePath, html);

console.log(`Email preview created: ${filePath}`);

// Run manually:
// npx tsx src/dev/previewEmail.ts