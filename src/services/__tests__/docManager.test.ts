import { describe, it, expect } from 'vitest';
import { htmlToPlainText, generateDocxBlob } from '../docManager';

describe('Document Manager', () => {
  const sampleHtml = `
    <h1>Jane Doe</h1>
    <p><strong>Senior Software Engineer</strong> | jane@example.com</p>
    <h2>Work Experience</h2>
    <p><strong>Acme Corp</strong> - Staff Engineer (2021 - Present)</p>
    <ul>
      <li>Built distributed caching service using Redis, improving API latency by 40%.</li>
      <li>Mentored 5 junior engineers on TypeScript and React architecture.</li>
    </ul>
  `;

  it('converts rich HTML to clean plain text for ATS analysis', () => {
    const text = htmlToPlainText(sampleHtml);
    expect(text).toContain('Jane Doe');
    expect(text).toContain('Senior Software Engineer');
    expect(text).toContain('Built distributed caching service');
    expect(text).not.toContain('<h1>');
    expect(text).not.toContain('<ul>');
  });

  it('generates a valid DOCX blob from HTML content', async () => {
    const blob = await generateDocxBlob(sampleHtml, 'Jane_Doe_Resume');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(500);
    expect(blob.type).toContain('wordprocessingml');
  });
});
