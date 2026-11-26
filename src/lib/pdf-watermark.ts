import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export interface WatermarkPdfInput {
  bookTitle: string;
  bookSubtitle: string;
  versionCode: string;
  authorName: string;
  readerEmail: string;
  readerName: string;
  watermarkFingerprint: string;
  downloadedAtIso: string;
  chapters: Array<{
    chapterNumber: number;
    title: string;
    contentMarkdown: string;
  }>;
  existingPdfBytes?: Uint8Array | null;
}

async function fetchSubsetTraditionalChineseFont(textToRender: string): Promise<Uint8Array | null> {
  try {
    const uniqueChars = Array.from(new Set(textToRender.replace(/\s+/g, ''))).join('');
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400&text=${encodeURIComponent(
      uniqueChars.slice(0, 3500)
    )}`;

    // Request TrueType (.ttf) format compatible with @pdf-lib/fontkit
    const cssRes = await fetch(cssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; rv:27.0) Gecko/20100101 Firefox/27.0',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!cssRes.ok) return null;
    const cssText = await cssRes.text();
    const match = cssText.match(/src:\s*url\((https:\/\/[^)]+)\)/);
    if (!match?.[1]) return null;

    const fontRes = await fetch(match[1], {
      signal: AbortSignal.timeout(8000),
    });
    if (!fontRes.ok) return null;

    const buf = await fontRes.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

function stripMarkdownForPdf(md: string): string[] {
  return md
    .replace(/```[\s\S]*?```/g, (block) =>
      block
        .replace(/```\w*\n?/g, '')
        .split('\n')
        .map((l) => `    ${l}`)
        .join('\n')
    )
    .split('\n')
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/, '■ ')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .trimEnd()
    );
}

function wrapLineByWidth(
  text: string,
  maxCharsPerLine: number
): string[] {
  if (!text) return [''];
  const result: string[] = [];
  let current = '';
  let count = 0;

  for (const ch of text) {
    const weight = ch.charCodeAt(0) > 255 ? 2 : 1;
    if (count + weight > maxCharsPerLine && current.length > 0) {
      result.push(current);
      current = ch;
      count = weight;
    } else {
      current += ch;
      count += weight;
    }
  }
  if (current.length > 0) {
    result.push(current);
  }
  return result;
}

export async function generateWatermarkedBookPdf(
  input: WatermarkPdfInput
): Promise<Uint8Array> {
  const allTextSample = [
    input.bookTitle,
    input.bookSubtitle,
    input.versionCode,
    input.authorName,
    input.readerEmail,
    input.readerName,
    input.watermarkFingerprint,
    "艾倫數位書坊 Alan's AI Press 專屬授權電子書 嚴禁未經授權公開轉載散佈或轉售 頁 授權訂戶 數位指紋 時間",
    ...input.chapters.map((c) => `${c.title}\n${c.contentMarkdown}`),
  ].join('\n');

  const cjkFontBytes = await fetchSubsetTraditionalChineseFont(allTextSample);

  // Case A: Stamp personal watermark onto author-uploaded master PDF
  if (input.existingPdfBytes && input.existingPdfBytes.byteLength > 0) {
    const pdfDoc = await PDFDocument.load(input.existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const customFont = cjkFontBytes
      ? await pdfDoc.embedFont(cjkFontBytes)
      : null;

    const pages = pdfDoc.getPages();
    const asciiStamp = `Licensed to: ${input.readerEmail} | ID: ${input.watermarkFingerprint} | Alan's AI Press`;
    const zhStamp = `授權予：${input.readerEmail} ｜ 數位指紋：${input.watermarkFingerprint} ｜ 艾倫數位書坊防盜版保護`;

    for (const page of pages) {
      const { width, height } = page.getSize();
      if (customFont) {
        page.drawText(zhStamp, {
          x: 36,
          y: 18,
          size: 8.5,
          font: customFont,
          color: rgb(0.45, 0.45, 0.5),
          opacity: 0.85,
        });
        page.drawText(`專屬授權：${input.readerEmail}（${input.watermarkFingerprint}）`, {
          x: width * 0.14,
          y: height * 0.35,
          size: 18,
          font: customFont,
          color: rgb(0.55, 0.55, 0.62),
          rotate: degrees(32),
          opacity: 0.13,
        });
      } else {
        page.drawText(asciiStamp, {
          x: 36,
          y: 18,
          size: 8.5,
          font: helvetica,
          color: rgb(0.45, 0.45, 0.5),
          opacity: 0.85,
        });
        page.drawText(asciiStamp, {
          x: width * 0.12,
          y: height * 0.35,
          size: 15,
          font: helvetica,
          color: rgb(0.55, 0.55, 0.62),
          rotate: degrees(32),
          opacity: 0.13,
        });
      }
    }

    return await pdfDoc.save();
  }

  // Case B: Dynamically typeset full e-book chapters with personal watermark
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const font = cjkFontBytes ? await pdfDoc.embedFont(cjkFontBytes) : helvetica;

  pdfDoc.setTitle(`${input.bookTitle} (${input.versionCode})`);
  pdfDoc.setAuthor(input.authorName);
  pdfDoc.setSubject(`Licensed to ${input.readerEmail} [${input.watermarkFingerprint}]`);
  pdfDoc.setProducer("Alan's AI Press Dynamic Watermark Engine");

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const marginX = 56;

  const drawWatermarkChrome = (
    page: ReturnType<typeof pdfDoc.addPage>,
    pageNumber: number
  ) => {
    if (cjkFontBytes) {
      page.drawText(
        `艾倫數位書坊 Alan's AI Press ｜ ${input.bookTitle} (${input.versionCode})`,
        {
          x: marginX,
          y: pageHeight - 36,
          size: 8.5,
          font,
          color: rgb(0.42, 0.45, 0.52),
        }
      );
      page.drawText(
        `授權訂戶：${input.readerEmail} ｜ 數位指紋：${input.watermarkFingerprint} ｜ 嚴禁未經授權公開轉載散佈`,
        {
          x: marginX,
          y: 26,
          size: 8,
          font,
          color: rgb(0.45, 0.45, 0.5),
        }
      );
      page.drawText(`第 ${pageNumber} 頁`, {
        x: pageWidth - marginX - 42,
        y: 26,
        size: 8,
        font,
        color: rgb(0.45, 0.45, 0.5),
      });
      page.drawText(
        `專屬授權：${input.readerEmail} [${input.watermarkFingerprint}]`,
        {
          x: 88,
          y: 260,
          size: 20,
          font,
          color: rgb(0.35, 0.38, 0.55),
          rotate: degrees(34),
          opacity: 0.1,
        }
      );
      page.drawText(
        `艾倫數位書坊防盜版數位浮水印 · ${input.downloadedAtIso.slice(0, 10)}`,
        {
          x: 110,
          y: 510,
          size: 17,
          font,
          color: rgb(0.35, 0.38, 0.55),
          rotate: degrees(34),
          opacity: 0.08,
        }
      );
    } else {
      page.drawText(`Alan's AI Press | Version ${input.versionCode}`, {
        x: marginX,
        y: pageHeight - 36,
        size: 9,
        font: helveticaBold,
        color: rgb(0.42, 0.45, 0.52),
      });
      page.drawText(
        `Licensed to: ${input.readerEmail} | Fingerprint: ${input.watermarkFingerprint} | Page ${pageNumber}`,
        {
          x: marginX,
          y: 26,
          size: 8.5,
          font: helvetica,
          color: rgb(0.45, 0.45, 0.5),
        }
      );
      page.drawText(
        `Licensed to ${input.readerEmail} [${input.watermarkFingerprint}]`,
        {
          x: 84,
          y: 290,
          size: 19,
          font: helveticaBold,
          color: rgb(0.35, 0.38, 0.55),
          rotate: degrees(34),
          opacity: 0.11,
        }
      );
    }
  };

  // Cover Page
  let pageCount = 1;
  const cover = pdfDoc.addPage([pageWidth, pageHeight]);
  cover.drawRectangle({
    x: 0,
    y: pageHeight - 280,
    width: pageWidth,
    height: 280,
    color: rgb(0.11, 0.14, 0.28),
  });

  if (cjkFontBytes) {
    cover.drawText("艾倫數位書坊 ALAN'S AI PRESS", {
      x: marginX,
      y: pageHeight - 82,
      size: 11,
      font,
      color: rgb(0.72, 0.78, 0.98),
    });
    const titleLines = wrapLineByWidth(input.bookTitle, 32);
    let ty = pageHeight - 135;
    for (const tl of titleLines) {
      cover.drawText(tl, {
        x: marginX,
        y: ty,
        size: 24,
        font,
        color: rgb(1, 1, 1),
      });
      ty -= 34;
    }
    const subLines = wrapLineByWidth(input.bookSubtitle, 52);
    for (const sl of subLines) {
      cover.drawText(sl, {
        x: marginX,
        y: ty - 4,
        size: 12,
        font,
        color: rgb(0.84, 0.88, 0.96),
      });
      ty -= 20;
    }

    cover.drawText(`發行版本：${input.versionCode}　｜　作者：${input.authorName}`, {
      x: marginX,
      y: pageHeight - 330,
      size: 12,
      font,
      color: rgb(0.18, 0.2, 0.26),
    });

    // Personal License Box on Cover
    cover.drawRectangle({
      x: marginX,
      y: 120,
      width: pageWidth - marginX * 2,
      height: 145,
      borderColor: rgb(0.3, 0.36, 0.72),
      borderWidth: 1,
      color: rgb(0.96, 0.97, 1),
    });
    cover.drawText('個人專屬數位版權與動態浮水印憑證', {
      x: marginX + 20,
      y: 235,
      size: 12,
      font,
      color: rgb(0.16, 0.2, 0.48),
    });
    cover.drawText(`授權帳號：${input.readerEmail}`, {
      x: marginX + 20,
      y: 208,
      size: 10.5,
      font,
      color: rgb(0.2, 0.22, 0.28),
    });
    cover.drawText(`數位浮水印指紋：${input.watermarkFingerprint}`, {
      x: marginX + 20,
      y: 186,
      size: 10.5,
      font,
      color: rgb(0.2, 0.22, 0.28),
    });
    cover.drawText(`簽發時間：${input.downloadedAtIso}`, {
      x: marginX + 20,
      y: 164,
      size: 10,
      font,
      color: rgb(0.35, 0.38, 0.44),
    });
    cover.drawText(
      '本電子書檔案僅供購買本人離線閱讀使用，每頁均內嵌隱性與顯性個人授權編號，請勿公開上傳或轉散佈。',
      {
        x: marginX + 20,
        y: 138,
        size: 8.5,
        font,
        color: rgb(0.42, 0.22, 0.22),
      }
    );
  } else {
    cover.drawText("ALAN'S AI PRESS - LICENSED DIGITAL EDITION", {
      x: marginX,
      y: pageHeight - 110,
      size: 16,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });
    cover.drawText(`Version: ${input.versionCode}`, {
      x: marginX,
      y: pageHeight - 150,
      size: 14,
      font: helvetica,
      color: rgb(0.88, 0.9, 0.98),
    });
    cover.drawText(`Licensed Reader: ${input.readerEmail}`, {
      x: marginX,
      y: 220,
      size: 12,
      font: helveticaBold,
      color: rgb(0.15, 0.18, 0.3),
    });
    cover.drawText(`Watermark Fingerprint: ${input.watermarkFingerprint}`, {
      x: marginX,
      y: 195,
      size: 11,
      font: helvetica,
      color: rgb(0.2, 0.22, 0.3),
    });
  }
  drawWatermarkChrome(cover, pageCount);

  // Content Pages (when CJK font available, render full Chinese chapters; otherwise license summary)
  if (cjkFontBytes) {
    for (const ch of input.chapters) {
      pageCount += 1;
      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      drawWatermarkChrome(page, pageCount);
      let cursorY = pageHeight - 82;

      const chHeaderLines = wrapLineByWidth(ch.title, 44);
      for (const hl of chHeaderLines) {
        page.drawText(hl, {
          x: marginX,
          y: cursorY,
          size: 16,
          font,
          color: rgb(0.12, 0.16, 0.38),
        });
        cursorY -= 26;
      }
      cursorY -= 10;

      const rawLines = stripMarkdownForPdf(ch.contentMarkdown);
      for (const rawLine of rawLines) {
        const isHeading = rawLine.startsWith('■ ');
        const wrapped = wrapLineByWidth(rawLine, isHeading ? 54 : 64);
        for (const wLine of wrapped) {
          if (cursorY < 68) {
            pageCount += 1;
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            drawWatermarkChrome(page, pageCount);
            cursorY = pageHeight - 76;
          }
          if (wLine.length > 0) {
            page.drawText(wLine, {
              x: marginX,
              y: cursorY,
              size: isHeading ? 12.5 : 10.5,
              font,
              color: isHeading ? rgb(0.14, 0.2, 0.45) : rgb(0.18, 0.2, 0.24),
            });
          }
          cursorY -= isHeading ? 22 : 18;
        }
      }
    }
  }

  return await pdfDoc.save();
}
