import fs from 'fs/promises';
import path from 'path';
import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  type PDFFont,
  type PDFPage,
  type RGB,
} from 'pdf-lib';
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

const TRUETYPE_UA = 'Mozilla/5.0 (Linux; U; Android 2.2) AppleWebKit/533.1';
const SHARD_SIZE = 320;

interface FontShard {
  chars: Set<string>;
  font: PDFFont;
}

function sanitizeForPdfFont(input: string): string {
  return input
    .replace(/💡/g, '【觀念】')
    .replace(/🔥/g, '【重點】')
    .replace(/⚠️?/g, '【注意】')
    .replace(/✅/g, '[V] ')
    .replace(/❌/g, '[X] ')
    .replace(/⭐/g, '★')
    .replace(/📋|🎁|👉|🙌|😊/g, '▶ ')
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[\uFE00-\uFE0F\u200D]/g, '');
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
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            return { bytes: new Uint8Array(await res.arrayBuffer()), format };
          }
        }
      }
      return null;
    }

    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      const res = await fetch(srcUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        return { bytes: new Uint8Array(await res.arrayBuffer()), format };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchSingleTtfShard(uniqueChunk: string): Promise<Uint8Array | null> {
  try {
    if (!uniqueChunk) return null;
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400&text=${encodeURIComponent(
      uniqueChunk
    )}`;

    const cssRes = await fetch(cssUrl, {
      headers: { 'User-Agent': TRUETYPE_UA },
      signal: AbortSignal.timeout(5000),
    });

    if (!cssRes.ok) return null;
    const cssText = await cssRes.text();
    const match = cssText.match(/src:\s*url\((https:\/\/[^)]+)\)/);
    if (!match?.[1]) return null;

    const fontRes = await fetch(match[1], {
      signal: AbortSignal.timeout(5000),
    });
    if (!fontRes.ok) return null;

    return new Uint8Array(await fontRes.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Splits ALL unique characters in the book into <=320-char TrueType shards so ZERO characters are ever dropped or rendered as ☒!
 */
async function buildCompleteFontShards(
  pdfDoc: PDFDocument,
  fullTextCorpus: string
): Promise<FontShard[]> {
  const safe = sanitizeForPdfFont(fullTextCorpus).replace(/\s+/g, '');
  // Include space explicitly in every shard so word spacing works seamlessly
  const allUnique = Array.from(new Set(safe));
  const chunks: string[] = [];
  for (let i = 0; i < allUnique.length; i += SHARD_SIZE) {
    chunks.push(' ' + allUnique.slice(i, i + SHARD_SIZE).join(''));
  }

  const rawBuffers = await Promise.all(chunks.map((c) => fetchSingleTtfShard(c)));
  const shards: FontShard[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const bytes = rawBuffers[i];
    if (bytes) {
      const embedded = await pdfDoc.embedFont(bytes);
      shards.push({
        chars: new Set(Array.from(chunks[i])),
        font: embedded,
      });
    }
  }
  return shards;
}

function drawShardedLine(
  page: PDFPage,
  text: string,
  opts: {
    x: number;
    y: number;
    size: number;
    color: RGB;
    shards: FontShard[];
    fallbackFont: PDFFont;
    opacity?: number;
    rotateDegrees?: number;
  }
) {
  if (!text) return;
  if (opts.shards.length === 0) {
    try {
      page.drawText(text, {
        x: opts.x,
        y: opts.y,
        size: opts.size,
        font: opts.fallbackFont,
        color: opts.color,
        opacity: opts.opacity,
        rotate: opts.rotateDegrees ? degrees(opts.rotateDegrees) : undefined,
      });
    } catch {
      // Ignore unencodable fallback chars
    }
    return;
  }

  // Group adjacent characters that share the same shard font
  let cursorX = opts.x;
  let currentFont: PDFFont | null = null;
  let run = '';

  const flushRun = () => {
    if (!run || !currentFont) return;
    try {
      page.drawText(run, {
        x: cursorX,
        y: opts.y,
        size: opts.size,
        font: currentFont,
        color: opts.color,
        opacity: opts.opacity,
        rotate: opts.rotateDegrees ? degrees(opts.rotateDegrees) : undefined,
      });
      if (!opts.rotateDegrees) {
        cursorX += currentFont.widthOfTextAtSize(run, opts.size);
      }
    } catch {
      // Skip unmapped glyph safely
    }
    run = '';
  };

  for (const ch of text) {
    const matchedShard = opts.shards.find((s) => s.chars.has(ch));
    const targetFont = matchedShard ? matchedShard.font : opts.shards[0].font;
    if (currentFont && targetFont !== currentFont) {
      flushRun();
    }
    currentFont = targetFont;
    run += ch;
  }
  flushRun();
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
  const cleanTitle = sanitizeForPdfFont(input.bookTitle);
  const cleanSubtitle = sanitizeForPdfFont(input.bookSubtitle);
  const cleanAuthor = sanitizeForPdfFont(input.authorName);

  const zhFooterStamp = `授權予：${input.readerEmail} ｜ 數位指紋：${input.watermarkFingerprint} ｜ 艾倫數位書坊防盜版保護`;
  const zhDiagStamp = `專屬授權：${input.readerEmail} [${input.watermarkFingerprint}]`;

  // Case A: Stamp personal watermark onto magazine-grade / author-uploaded master PDF
  if (input.existingPdfBytes && input.existingPdfBytes.byteLength > 0) {
    const pdfDoc = await PDFDocument.load(input.existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const stampShards = await buildCompleteFontShards(
      pdfDoc,
      `${zhFooterStamp}${zhDiagStamp}`
    );
    const stampFont = stampShards[0]?.font ?? null;

    const pages = pdfDoc.getPages();
    const asciiStamp = `Licensed to: ${input.readerEmail} | ID: ${input.watermarkFingerprint} | Alan's AI Press`;

    for (const page of pages) {
      const { width, height } = page.getSize();
      if (stampFont) {
        page.drawText(zhFooterStamp, {
          x: 42,
          y: 18,
          size: 8.5,
          font: stampFont,
          color: rgb(0.42, 0.44, 0.5),
          opacity: 0.88,
        });
        page.drawText(zhDiagStamp, {
          x: width * 0.14,
          y: height * 0.34,
          size: 18,
          font: stampFont,
          color: rgb(0.52, 0.54, 0.62),
          rotate: degrees(32),
          opacity: 0.12,
        });
      } else {
        page.drawText(asciiStamp, {
          x: 42,
          y: 18,
          size: 8.5,
          font: helvetica,
          color: rgb(0.42, 0.44, 0.5),
          opacity: 0.88,
        });
      }
    }

    return await pdfDoc.save();
  }

  // Case B: Dynamic full-book sharded TTF typesetting (zero dropped characters!)
  const sanitizedChapters = input.chapters.map((c) => ({
    ...c,
    title: sanitizeForPdfFont(c.title),
    contentMarkdown: sanitizeForPdfFont(c.contentMarkdown),
  }));

  const fullCorpus = [
    cleanTitle,
    cleanSubtitle,
    input.versionCode,
    cleanAuthor,
    zhFooterStamp,
    zhDiagStamp,
    input.downloadedAtIso,
    "艾倫數位書坊 ALAN'S AI PRESS · 全彩圖解實戰電子書 發行版本：作者：個人專屬數位版權與動態浮水印憑證 授權帳號：數位浮水印指紋：簽發時間：本電子書檔案僅供購買本人離線閱讀使用，每頁均內嵌個人授權編號，請勿公開上傳或轉散佈。第頁【全彩視覺圖表】【觀念】【重點】【注意】★▶▲■▎｜，。！？；：「」『』（）—～・0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz()[]+-*/%:.,!?~@#&_=",
    ...sanitizedChapters.map((c) => `${c.title}\n${c.contentMarkdown}`),
  ].join('\n');

  const imageUrls = new Set<string>();
  if (input.coverImageUrl) imageUrls.add(input.coverImageUrl);
  for (const ch of sanitizedChapters) {
    for (const line of ch.contentMarkdown.split('\n')) {
      const m = line.trim().match(/^!\[.*?\]\((.*?)\)$/);
      if (m?.[1]) imageUrls.add(m[1]);
    }
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const [shards, loadedImagesEntries] = await Promise.all([
    buildCompleteFontShards(pdfDoc, fullCorpus),
    Promise.all(
      Array.from(imageUrls).map(async (u) => {
        const res = await loadImageBytes(u, input.siteOrigin);
        return [u, res] as const;
      })
    ),
  ]);

  const imageCache = new Map(loadedImagesEntries);

  pdfDoc.setTitle(`${cleanTitle} (${input.versionCode})`);
  pdfDoc.setAuthor(cleanAuthor);
  pdfDoc.setSubject(`Licensed to ${input.readerEmail} [${input.watermarkFingerprint}]`);
  pdfDoc.setProducer("Alan's AI Press Dynamic Sharded Watermark Engine");

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 52;
  const contentWidth = pageWidth - marginX * 2;

  const drawWatermarkChrome = (page: PDFPage, pageNumber: number) => {
    drawShardedLine(
      page,
      `艾倫數位書坊 Alan's AI Press ｜ ${cleanTitle} (${input.versionCode})`,
      {
        x: marginX,
        y: pageHeight - 34,
        size: 8.5,
        color: rgb(0.42, 0.45, 0.52),
        shards,
        fallbackFont: helvetica,
      }
    );
    drawShardedLine(page, zhFooterStamp, {
      x: marginX,
      y: 24,
      size: 8,
      color: rgb(0.45, 0.45, 0.5),
      shards,
      fallbackFont: helvetica,
    });
    drawShardedLine(page, `第 ${pageNumber} 頁`, {
      x: pageWidth - marginX - 42,
      y: 24,
      size: 8,
      color: rgb(0.45, 0.45, 0.5),
      shards,
      fallbackFont: helvetica,
    });
    if (shards[0]) {
      try {
        page.drawText(zhDiagStamp, {
          x: 88,
          y: 260,
          size: 18,
          font: shards[0].font,
          color: rgb(0.35, 0.38, 0.55),
          rotate: degrees(34),
          opacity: 0.09,
        });
      } catch {
        // Ignore diagonal stamp fallback
      }
    }
  };

  let pageCount = 1;
  const cover = pdfDoc.addPage([pageWidth, pageHeight]);
  cover.drawRectangle({
    x: 0,
    y: pageHeight - 245,
    width: pageWidth,
    height: 245,
    color: rgb(0.09, 0.11, 0.24),
  });

  drawShardedLine(cover, "艾倫數位書坊 ALAN'S AI PRESS · 全彩圖解實戰電子書", {
    x: marginX,
    y: pageHeight - 72,
    size: 10.5,
    color: rgb(0.72, 0.78, 0.98),
    shards,
    fallbackFont: helvetica,
  });

  let ty = pageHeight - 116;
  for (const tl of wrapLineByWidth(cleanTitle, 34)) {
    drawShardedLine(cover, tl, {
      x: marginX,
      y: ty,
      size: 22,
      color: rgb(1, 1, 1),
      shards,
      fallbackFont: helvetica,
    });
    ty -= 31;
  }
  for (const sl of wrapLineByWidth(cleanSubtitle, 56)) {
    drawShardedLine(cover, sl, {
      x: marginX,
      y: ty - 2,
      size: 11.5,
      color: rgb(0.84, 0.88, 0.96),
      shards,
      fallbackFont: helvetica,
    });
    ty -= 18;
  }

  let coverArtBottomY = pageHeight - 270;
  if (input.coverImageUrl) {
    const imgData = imageCache.get(input.coverImageUrl) ?? null;
    if (imgData) {
      const embedded =
        imgData.format === 'png'
          ? await pdfDoc.embedPng(imgData.bytes)
          : await pdfDoc.embedJpg(imgData.bytes);
      const clampedH = Math.min(265, (contentWidth * embedded.height) / embedded.width);
      cover.drawImage(embedded, {
        x: marginX,
        y: pageHeight - 265 - clampedH,
        width: contentWidth,
        height: clampedH,
      });
      coverArtBottomY = pageHeight - 285 - clampedH;
    }
  }

  drawShardedLine(
    cover,
    `發行版本：${input.versionCode}　｜　作者：${cleanAuthor}`,
    {
      x: marginX,
      y: Math.max(265, coverArtBottomY - 12),
      size: 11.5,
      color: rgb(0.18, 0.2, 0.26),
      shards,
      fallbackFont: helvetica,
    }
  );

  cover.drawRectangle({
    x: marginX,
    y: 95,
    width: contentWidth,
    height: 140,
    borderColor: rgb(0.3, 0.36, 0.72),
    borderWidth: 1,
    color: rgb(0.96, 0.97, 1),
  });
  drawShardedLine(cover, '個人專屬數位版權與動態浮水印憑證', {
    x: marginX + 18,
    y: 208,
    size: 11.5,
    color: rgb(0.16, 0.2, 0.48),
    shards,
    fallbackFont: helvetica,
  });
  drawShardedLine(cover, `授權帳號：${input.readerEmail}`, {
    x: marginX + 18,
    y: 182,
    size: 10,
    color: rgb(0.2, 0.22, 0.28),
    shards,
    fallbackFont: helvetica,
  });
  drawShardedLine(cover, `數位浮水印指紋：${input.watermarkFingerprint}`, {
    x: marginX + 18,
    y: 161,
    size: 10,
    color: rgb(0.2, 0.22, 0.28),
    shards,
    fallbackFont: helvetica,
  });
  drawShardedLine(cover, `簽發時間：${input.downloadedAtIso}`, {
    x: marginX + 18,
    y: 140,
    size: 9.5,
    color: rgb(0.35, 0.38, 0.44),
    shards,
    fallbackFont: helvetica,
  });
  drawShardedLine(
    cover,
    '本電子書檔案僅供購買本人離線閱讀使用，每頁均內嵌個人授權編號，請勿公開上傳或轉散佈。',
    {
      x: marginX + 18,
      y: 114,
      size: 8.5,
      color: rgb(0.42, 0.22, 0.22),
      shards,
      fallbackFont: helvetica,
    }
  );
  drawWatermarkChrome(cover, pageCount);

  for (const ch of sanitizedChapters) {
    pageCount += 1;
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    drawWatermarkChrome(page, pageCount);
    let cursorY = pageHeight - 78;

    for (const hl of wrapLineByWidth(ch.title, 44)) {
      drawShardedLine(page, hl, {
        x: marginX,
        y: cursorY,
        size: 16,
        color: rgb(0.12, 0.16, 0.38),
        shards,
        fallbackFont: helvetica,
      });
      cursorY -= 25;
    }
    cursorY -= 8;

    let inCode = false;
    for (const raw of ch.contentMarkdown.split('\n')) {
      const trimmed = raw.trim();
      if (trimmed.startsWith('```')) {
        inCode = !inCode;
        continue;
      }

      const imgMatch = !inCode ? trimmed.match(/^!\[(.*?)\]\((.*?)\)$/) : null;
      if (imgMatch) {
        const [, caption, imgSrc] = imgMatch;
        const imgData = imageCache.get(imgSrc) ?? null;
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
            drawShardedLine(page, `▲ ${caption.slice(0, 48)}`, {
              x: marginX,
              y: cursorY,
              size: 8.5,
              color: rgb(0.38, 0.42, 0.5),
              shards,
              fallbackFont: helvetica,
            });
            cursorY -= 18;
          }
          continue;
        }
      }

      if (/^\|?[\s:-]+\|/.test(trimmed)) continue;

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

      for (const wLine of wrapLineByWidth(cleanedLine, isHeading ? 54 : 62)) {
        if (cursorY < 66) {
          pageCount += 1;
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          drawWatermarkChrome(page, pageCount);
          cursorY = pageHeight - 72;
        }
        if (wLine.length > 0) {
          drawShardedLine(page, wLine, {
            x: marginX,
            y: cursorY,
            size: isHeading ? 12.5 : 10,
            color: isHeading
              ? rgb(0.14, 0.2, 0.48)
              : isQuote
                ? rgb(0.18, 0.32, 0.55)
                : rgb(0.18, 0.2, 0.24),
            shards,
            fallbackFont: helvetica,
          });
        }
        cursorY -= isHeading ? 21 : 17;
      }
    }
  }

  return await pdfDoc.save();
}
