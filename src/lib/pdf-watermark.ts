import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export interface WatermarkPdfInput {
  bookTitle: string;
  bookSubtitle: string;
  coverImageUrl?: string | null;
  siteOrigin?: string;
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

async function loadImageBytes(
  srcUrl: string,
  siteOrigin?: string
): Promise<{ bytes: Uint8Array; format: 'jpg' | 'png' } | null> {
  try {
    const cleanPath = srcUrl.split('?')[0];
    const lower = cleanPath.toLowerCase();
    if (!lower.endsWith('.jpg') && !lower.endsWith('.jpeg') && !lower.endsWith('.png')) {
      return null;
    }
    const format: 'jpg' | 'png' = lower.endsWith('.png') ? 'png' : 'jpg';

    if (cleanPath.startsWith('/')) {
      const localPath = path.join(process.cwd(), 'public', cleanPath);
      try {
        const buf = await fs.readFile(localPath);
        return { bytes: new Uint8Array(buf), format };
      } catch {
        if (siteOrigin) {
          const res = await fetch(`${siteOrigin}${cleanPath}`, {
            signal: AbortSignal.timeout(6000),
          });
          if (res.ok) {
            return { bytes: new Uint8Array(await res.arrayBuffer()), format };
          }
        }
      }
      return null;
    }

    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      const res = await fetch(srcUrl, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        return { bytes: new Uint8Array(await res.arrayBuffer()), format };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchSubsetTraditionalChineseFont(
  textToRender: string
): Promise<Uint8Array | null> {
  try {
    const uniqueChars = Array.from(new Set(textToRender.replace(/\s+/g, ''))).join('');
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400&text=${encodeURIComponent(
      uniqueChars.slice(0, 3500)
    )}`;

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

function wrapLineByWidth(text: string, maxCharsPerLine: number): string[] {
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
    "艾倫數位書坊 Alan's AI Press 專屬授權電子書 嚴禁未經授權公開轉載散佈或轉售 第頁 授權訂戶 數位指紋 圖解 ▲ ■",
    ...input.chapters.map((c) => `${c.title}\n${c.contentMarkdown}`),
  ].join('\n');

  const cjkFontBytes = await fetchSubsetTraditionalChineseFont(allTextSample);

  if (input.existingPdfBytes && input.existingPdfBytes.byteLength > 0) {
    const pdfDoc = await PDFDocument.load(input.existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const customFont = cjkFontBytes ? await pdfDoc.embedFont(cjkFontBytes) : null;

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
      }
    }

    return await pdfDoc.save();
  }

  // Dynamically typeset full illustrated e-book PDF with personal watermark
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const font = cjkFontBytes ? await pdfDoc.embedFont(cjkFontBytes) : helvetica;

  pdfDoc.setTitle(`${input.bookTitle} (${input.versionCode})`);
  pdfDoc.setAuthor(input.authorName);
  pdfDoc.setSubject(`Licensed to ${input.readerEmail} [${input.watermarkFingerprint}]`);
  pdfDoc.setProducer("Alan's AI Press Dynamic Illustrated Watermark Engine");

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const marginX = 52;
  const contentWidth = pageWidth - marginX * 2;

  const drawWatermarkChrome = (
    page: ReturnType<typeof pdfDoc.addPage>,
    pageNumber: number
  ) => {
    if (cjkFontBytes) {
      page.drawText(
        `艾倫數位書坊 Alan's AI Press ｜ ${input.bookTitle} (${input.versionCode})`,
        {
          x: marginX,
          y: pageHeight - 34,
          size: 8.5,
          font,
          color: rgb(0.42, 0.45, 0.52),
        }
      );
      page.drawText(
        `授權訂戶：${input.readerEmail} ｜ 數位指紋：${input.watermarkFingerprint} ｜ 嚴禁未經授權公開轉載散佈`,
        {
          x: marginX,
          y: 24,
          size: 8,
          font,
          color: rgb(0.45, 0.45, 0.5),
        }
      );
      page.drawText(`第 ${pageNumber} 頁`, {
        x: pageWidth - marginX - 42,
        y: 24,
        size: 8,
        font,
        color: rgb(0.45, 0.45, 0.5),
      });
      page.drawText(
        `專屬授權：${input.readerEmail} [${input.watermarkFingerprint}]`,
        {
          x: 88,
          y: 260,
          size: 19,
          font,
          color: rgb(0.35, 0.38, 0.55),
          rotate: degrees(34),
          opacity: 0.09,
        }
      );
    } else {
      page.drawText(
        `Licensed to: ${input.readerEmail} | Fingerprint: ${input.watermarkFingerprint} | Page ${pageNumber}`,
        {
          x: marginX,
          y: 24,
          size: 8.5,
          font: helvetica,
          color: rgb(0.45, 0.45, 0.5),
        }
      );
    }
  };

  // Cover Page
  let pageCount = 1;
  const cover = pdfDoc.addPage([pageWidth, pageHeight]);
  cover.drawRectangle({
    x: 0,
    y: pageHeight - 245,
    width: pageWidth,
    height: 245,
    color: rgb(0.09, 0.11, 0.24),
  });

  if (cjkFontBytes) {
    cover.drawText("艾倫數位書坊 ALAN'S AI PRESS · 全彩圖解實戰電子書", {
      x: marginX,
      y: pageHeight - 72,
      size: 10.5,
      font,
      color: rgb(0.72, 0.78, 0.98),
    });
    const titleLines = wrapLineByWidth(input.bookTitle, 34);
    let ty = pageHeight - 116;
    for (const tl of titleLines) {
      cover.drawText(tl, {
        x: marginX,
        y: ty,
        size: 22,
        font,
        color: rgb(1, 1, 1),
      });
      ty -= 31;
    }
    const subLines = wrapLineByWidth(input.bookSubtitle, 56);
    for (const sl of subLines) {
      cover.drawText(sl, {
        x: marginX,
        y: ty - 2,
        size: 11.5,
        font,
        color: rgb(0.84, 0.88, 0.96),
      });
      ty -= 18;
    }

    // Embed Cover Illustration if present
    let coverArtBottomY = pageHeight - 270;
    if (input.coverImageUrl) {
      const imgData = await loadImageBytes(input.coverImageUrl, input.siteOrigin);
      if (imgData) {
        const embedded =
          imgData.format === 'png'
            ? await pdfDoc.embedPng(imgData.bytes)
            : await pdfDoc.embedJpg(imgData.bytes);
        const drawH = (contentWidth * embedded.height) / embedded.width;
        const clampedH = Math.min(drawH, 265);
        cover.drawImage(embedded, {
          x: marginX,
          y: pageHeight - 265 - clampedH,
          width: contentWidth,
          height: clampedH,
        });
        coverArtBottomY = pageHeight - 285 - clampedH;
      }
    }

    cover.drawText(`發行版本：${input.versionCode}　｜　作者：${input.authorName}`, {
      x: marginX,
      y: Math.max(265, coverArtBottomY - 12),
      size: 11.5,
      font,
      color: rgb(0.18, 0.2, 0.26),
    });

    cover.drawRectangle({
      x: marginX,
      y: 95,
      width: contentWidth,
      height: 140,
      borderColor: rgb(0.3, 0.36, 0.72),
      borderWidth: 1,
      color: rgb(0.96, 0.97, 1),
    });
    cover.drawText('個人專屬數位版權與動態浮水印憑證', {
      x: marginX + 18,
      y: 208,
      size: 11.5,
      font,
      color: rgb(0.16, 0.2, 0.48),
    });
    cover.drawText(`授權帳號：${input.readerEmail}`, {
      x: marginX + 18,
      y: 182,
      size: 10,
      font,
      color: rgb(0.2, 0.22, 0.28),
    });
    cover.drawText(`數位浮水印指紋：${input.watermarkFingerprint}`, {
      x: marginX + 18,
      y: 161,
      size: 10,
      font,
      color: rgb(0.2, 0.22, 0.28),
    });
    cover.drawText(`簽發時間：${input.downloadedAtIso}`, {
      x: marginX + 18,
      y: 140,
      size: 9.5,
      font,
      color: rgb(0.35, 0.38, 0.44),
    });
    cover.drawText(
      '本電子書檔案僅供購買本人離線閱讀使用，每頁均內嵌個人授權編號，請勿公開上傳或轉散佈。',
      {
        x: marginX + 18,
        y: 114,
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
  }
  drawWatermarkChrome(cover, pageCount);

  if (cjkFontBytes) {
    for (const ch of input.chapters) {
      pageCount += 1;
      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      drawWatermarkChrome(page, pageCount);
      let cursorY = pageHeight - 78;

      const chHeaderLines = wrapLineByWidth(ch.title, 44);
      for (const hl of chHeaderLines) {
        page.drawText(hl, {
          x: marginX,
          y: cursorY,
          size: 16,
          font,
          color: rgb(0.12, 0.16, 0.38),
        });
        cursorY -= 25;
      }
      cursorY -= 8;

      const mdLines = ch.contentMarkdown.split('\n');
      let inCode = false;

      for (const raw of mdLines) {
        const trimmed = raw.trim();
        if (trimmed.startsWith('```')) {
          inCode = !inCode;
          continue;
        }

        // Render embedded JPG/PNG illustrations inside PDF!
        const imgMatch = !inCode ? trimmed.match(/^!\[(.*?)\]\((.*?)\)$/) : null;
        if (imgMatch) {
          const [, caption, imgSrc] = imgMatch;
          const imgData = await loadImageBytes(imgSrc, input.siteOrigin);
          if (imgData) {
            const embedded =
              imgData.format === 'png'
                ? await pdfDoc.embedPng(imgData.bytes)
                : await pdfDoc.embedJpg(imgData.bytes);
            const targetH = Math.min(
              235,
              (contentWidth * embedded.height) / embedded.width
            );
            if (cursorY - targetH - 28 < 62) {
              pageCount += 1;
              page = pdfDoc.addPage([pageWidth, pageHeight]);
              drawWatermarkChrome(page, pageCount);
              cursorY = pageHeight - 72;
            }
            page.drawImage(embedded, {
              x: marginX,
              y: cursorY - targetH,
              width: contentWidth,
              height: targetH,
            });
            cursorY -= targetH + 14;
            if (caption) {
              page.drawText(`▲ ${caption.slice(0, 48)}`, {
                x: marginX,
                y: cursorY,
                size: 8.5,
                font,
                color: rgb(0.38, 0.42, 0.5),
              });
              cursorY -= 18;
            }
            continue;
          } else if (caption) {
            // SVG diagram caption reference in PDF
            if (cursorY < 80) {
              pageCount += 1;
              page = pdfDoc.addPage([pageWidth, pageHeight]);
              drawWatermarkChrome(page, pageCount);
              cursorY = pageHeight - 72;
            }
            page.drawText(`【全彩視覺圖表】${caption}`, {
              x: marginX,
              y: cursorY,
              size: 10,
              font,
              color: rgb(0.22, 0.26, 0.62),
            });
            cursorY -= 20;
            continue;
          }
        }

        // Skip Markdown table separator lines
        if (/^\|?[\s:-]+\|/.test(trimmed)) {
          continue;
        }

        const cleanedLine = inCode
          ? `  ${raw}`
          : trimmed
              .replace(/^#{1,6}\s+/, '■ ')
              .replace(/^>\s+/, '▎ ')
              .replace(/\*\*(.*?)\*\*/g, '$1')
              .replace(/`([^`]+)`/g, '$1')
              .replace(/^\|/, '')
              .replace(/\|$/, '')
              .replace(/\|/g, ' ｜ ');

        const isHeading = cleanedLine.startsWith('■ ');
        const isQuote = cleanedLine.startsWith('▎ ');
        const wrapped = wrapLineByWidth(cleanedLine, isHeading ? 54 : 62);

        for (const wLine of wrapped) {
          if (cursorY < 66) {
            pageCount += 1;
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            drawWatermarkChrome(page, pageCount);
            cursorY = pageHeight - 72;
          }
          if (wLine.length > 0) {
            page.drawText(wLine, {
              x: marginX,
              y: cursorY,
              size: isHeading ? 12.5 : 10,
              font,
              color: isHeading
                ? rgb(0.14, 0.2, 0.48)
                : isQuote
                  ? rgb(0.18, 0.32, 0.55)
                  : rgb(0.18, 0.2, 0.24),
            });
          }
          cursorY -= isHeading ? 21 : 17;
        }
      }
    }
  }

  return await pdfDoc.save();
}
