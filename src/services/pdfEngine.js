import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

// Shared visual style so every report (agent, manager, vehicle) looks consistent
const baseStyles = `
  body{font-family:Helvetica,Arial,sans-serif;padding:24px;color:#0f172a;}
  h1{font-size:20px;margin-bottom:2px;}
  h2{font-size:13px;font-weight:normal;color:#64748b;margin-top:0;}
  table{width:100%;border-collapse:collapse;margin-top:16px;}
  th,td{text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;}
  th{background:#f1f5f9;}
  .totals{margin-top:16px;font-size:13px;font-weight:bold;background:#f1f5f9;padding:10px;border-radius:6px;}
  .meta{font-size:11px;color:#94a3b8;margin-top:24px;}
`;

/**
 * Builds a full HTML document from a title, subtitle, table headers/rows, and totals line.
 * rows: array of arrays (already formatted strings) matching headers.length
 */
export function buildReportHTML({ title, subtitle, headers, rows, totalsLine, generatedBy }) {
  const headHtml = headers.map((h) => `<th>${h}</th>`).join('');
  const bodyHtml = rows.length
    ? rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}">No data for this period.</td></tr>`;

  return `<html><head><meta charset="utf-8" /><style>${baseStyles}</style></head>
    <body>
      <h1>${title}</h1>
      <h2>${subtitle}</h2>
      <table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>
      ${totalsLine ? `<div class="totals">${totalsLine}</div>` : ''}
      <div class="meta">Generated ${new Date().toLocaleString()}${generatedBy ? ` · ${generatedBy}` : ''} · Offline report engine</div>
    </body></html>`;
}

/**
 * Renders HTML to a PDF file on-device and returns the local file URI.
 * Works fully offline — expo-print renders via the OS's native print engine, not a remote call.
 */
export async function generatePDF(html, fileName = 'report') {
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  // printToFileAsync writes to a temp cache path with a random name — rename to something readable
  const dest = `${FileSystem.cacheDirectory}${fileName.replace(/[^a-z0-9_-]/gi, '_')}-${Date.now()}.pdf`;
  await FileSystem.moveAsync({ from: uri, to: dest });
  return dest;
}

/**
 * Generates a PDF and immediately opens the native share sheet.
 * Safe to call with no network — this is the function screens should use for "Print"/"Export" buttons.
 */
export async function generateAndSharePDF(html, fileName = 'report') {
  const fileUri = await generatePDF(html, fileName);
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: fileName });
  }
  return fileUri;
}