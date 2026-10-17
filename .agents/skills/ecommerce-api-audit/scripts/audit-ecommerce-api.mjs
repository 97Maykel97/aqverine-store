import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceContracts } from '../references/source-contracts.mjs';

const baseUrl = process.env.ECOMMERCE_AUDIT_BASE_URL;
if (!baseUrl) throw new Error('ECOMMERCE_AUDIT_BASE_URL is required.');
let origin;
try { origin = new URL(baseUrl); } catch { throw new Error('ECOMMERCE_AUDIT_BASE_URL must be a valid URL.'); }
if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('Audit URL must use HTTP(S).');

const sanitize = (value) => String(value)
  .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
  .replace(/(token|secret|payment[_-]?id|authorization)\s*[:=]\s*[^,\s]+/gi, '$1=[redacted]');

const results = [];
for (const contract of sourceContracts) {
  const url = new URL(contract.path, origin);
  try {
    const response = await fetch(url, { method: 'GET', redirect: 'manual', headers: { Accept: 'application/json' } });
    results.push({ name: contract.name, path: contract.path, status: response.status, passed: contract.expectedStatuses.includes(response.status) });
  } catch (error) {
    results.push({ name: contract.name, path: contract.path, status: 'network error', passed: false, detail: sanitize(error.message) });
  }
}

const date = new Date().toISOString().slice(0, 10);
const skillScriptDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const reportDir = resolve(skillScriptDirectory, '../../../../docs/reports');
const reportPath = resolve(reportDir, `ecommerce-api-audit-${date}.md`);
const rows = results.map((result) => `| ${result.name} | \`${result.path}\` | ${result.status} | ${result.passed ? 'pass' : 'review'} |`).join('\n');
const report = `# E-commerce API Audit — ${date}\n\nTarget: ${origin.origin}\n\n| Check | Endpoint | Result | Status |\n| --- | --- | ---: | --- |\n${rows}\n\nThe report intentionally omits response bodies and sensitive data. Findings marked \`review\` require backend investigation; this audit sends only safe GET requests.\n`;
await mkdir(reportDir, { recursive: true });
await writeFile(reportPath, report, 'utf8');
console.log(`Audit report written: ${reportPath}`);
if (results.some((result) => !result.passed)) process.exitCode = 1;
