import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

export function htmlToPlainText(html: string): string {
  if (!html) return '';

  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function parseDocxFile(file: File): Promise<{ html: string; text: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;
  const text = htmlToPlainText(html);
  return { html, text };
}

export async function generateDocxBlob(html: string, _title: string = 'Resume'): Promise<Blob> {
  const plainText = htmlToPlainText(html);
  const lines = plainText.split('\n');
  const paragraphs: Paragraph[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      paragraphs.push(new Paragraph({ text: '' }));
      continue;
    }

    if (i === 0 && line.length < 40) {
      paragraphs.push(
        new Paragraph({
          text: line,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        })
      );
      continue;
    }

    if (/^(work experience|experience|professional experience|technical skills|skills|education|projects|summary|certifications|awards)$/i.test(line)) {
      paragraphs.push(
        new Paragraph({
          text: line.toUpperCase(),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 80 },
        })
      );
      continue;
    }

    if (line.startsWith('•') || line.startsWith('-')) {
      const bulletText = line.replace(/^[•-]\s*/, '');
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(bulletText)],
          bullet: { level: 0 },
          spacing: { after: 40 },
        })
      );
      continue;
    }

    paragraphs.push(
      new Paragraph({
        children: [new TextRun(line)],
        spacing: { after: 60 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: 'Resume' })],
      },
    ],
  });

  return await Packer.toBlob(doc);
}
