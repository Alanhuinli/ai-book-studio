import React from 'react';

export function MarkdownArticle({
  content,
  theme = 'light',
  fontSize = 'base',
}: {
  content: string;
  theme?: 'light' | 'sepia' | 'dark';
  fontSize?: 'sm' | 'base' | 'lg';
}) {
  const lines = content.trim().split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let tableBuffer: string[] = [];

  const textClass =
    fontSize === 'sm'
      ? 'text-[15px] leading-7'
      : fontSize === 'lg'
        ? 'text-[19px] leading-9'
        : 'text-[17px] leading-8';

  const headingColor =
    theme === 'dark'
      ? 'text-slate-100'
      : theme === 'sepia'
        ? 'text-amber-950'
        : 'text-slate-900';

  const bodyColor =
    theme === 'dark'
      ? 'text-slate-300'
      : theme === 'sepia'
        ? 'text-stone-800'
        : 'text-slate-700';

  const flushTable = (keyIdx: number) => {
    if (tableBuffer.length < 2) {
      tableBuffer = [];
      return;
    }
    const parseRow = (r: string) =>
      r
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim());

    const headers = parseRow(tableBuffer[0]);
    const bodyRows = tableBuffer
      .slice(1)
      .filter((r) => !/^\|?[\s:-]+\|/.test(r.trim()))
      .map(parseRow);

    elements.push(
      <div
        key={`tbl-${keyIdx}`}
        className="my-6 overflow-x-auto rounded-2xl border border-slate-200/80 shadow-xs"
      >
        <table className="w-full text-left text-sm">
          <thead
            className={
              theme === 'dark'
                ? 'bg-indigo-950/80 text-indigo-200'
                : 'bg-indigo-600 text-white'
            }
          >
            <tr>
              {headers.map((h, hi) => (
                <th key={hi} className="px-4 py-3 font-bold">
                  {renderInlineBold(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className={
              theme === 'dark'
                ? 'divide-y divide-slate-800 bg-slate-900 text-slate-200'
                : theme === 'sepia'
                  ? 'divide-y divide-amber-200/70 bg-[#fffaf0] text-stone-800'
                  : 'divide-y divide-slate-100 bg-white text-slate-700'
            }
          >
            {bodyRows.map((row, ri) => (
              <tr
                key={ri}
                className={
                  theme === 'dark'
                    ? 'even:bg-slate-800/50'
                    : theme === 'sepia'
                      ? 'even:bg-amber-50/50'
                      : 'even:bg-slate-50/70'
                }
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-4 py-3 leading-relaxed ${
                      ci === 0 ? 'font-semibold' : ''
                    }`}
                  >
                    {renderInlineBold(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  };

  lines.forEach((line, idx) => {
    if (line.trim().startsWith('```')) {
      flushTable(idx);
      if (inCodeBlock) {
        elements.push(
          <div
            key={`code-${idx}`}
            className="my-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-md"
          >
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-indigo-300">
              <span>📋 AI 實戰提示詞 ／ 結構範本</span>
              <span className="text-[11px] text-slate-400">直接套用框架</span>
            </div>
            <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-slate-100">
              <code>{codeLines.join('\n')}</code>
            </pre>
          </div>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    const trimmed = line.trim();

    // Markdown Table Detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableBuffer.push(trimmed);
      return;
    } else if (tableBuffer.length > 0) {
      flushTable(idx);
    }

    if (!trimmed) {
      elements.push(<div key={`sp-${idx}`} className="h-2.5" />);
      return;
    }

    // Markdown Image Detection: ![alt](src)
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      const [, altText, srcUrl] = imgMatch;
      elements.push(
        <figure
          key={`img-${idx}`}
          className="my-7 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950/5 shadow-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={srcUrl}
            alt={altText}
            loading="lazy"
            className="w-full object-cover"
          />
          {altText && (
            <figcaption
              className={`border-t px-4 py-2.5 text-center text-xs font-medium ${
                theme === 'dark'
                  ? 'border-slate-800 bg-slate-900 text-slate-400'
                  : theme === 'sepia'
                    ? 'border-amber-200/70 bg-amber-50/60 text-amber-900'
                    : 'border-slate-100 bg-slate-50 text-slate-600'
              }`}
            >
              ▲ {altText}
            </figcaption>
          )}
        </figure>
      );
      return;
    }

    // Callout / Blockquote Detection: > ...
    if (trimmed.startsWith('> ')) {
      const quoteBody = trimmed.slice(2).trim();
      const isWarning = quoteBody.startsWith('⚠️');
      const isTip = quoteBody.startsWith('💡') || quoteBody.startsWith('🔥');
      const boxStyle =
        theme === 'dark'
          ? isWarning
            ? 'border-amber-500 bg-amber-950/30 text-amber-100'
            : 'border-indigo-400 bg-indigo-950/40 text-indigo-100'
          : isWarning
            ? 'border-amber-500 bg-amber-50/90 text-amber-950'
            : isTip
              ? 'border-indigo-500 bg-indigo-50/80 text-indigo-950'
              : 'border-emerald-500 bg-emerald-50/80 text-emerald-950';

      elements.push(
        <blockquote
          key={`bq-${idx}`}
          className={`my-5 rounded-r-2xl border-l-4 px-5 py-4 text-sm leading-7 font-medium shadow-2xs ${boxStyle}`}
        >
          {renderInlineBold(quoteBody)}
        </blockquote>
      );
      return;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${idx}`}
          className={`mt-2 mb-5 text-2xl font-extrabold tracking-tight sm:text-3xl ${headingColor}`}
        >
          {renderInlineBold(trimmed.slice(2))}
        </h1>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${idx}`}
          className={`mt-9 mb-4 border-l-4 border-indigo-600 pl-3.5 text-xl font-bold ${headingColor}`}
        >
          {renderInlineBold(trimmed.slice(3))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${idx}`}
          className={`mt-6 mb-2 text-lg font-bold ${headingColor}`}
        >
          {renderInlineBold(trimmed.slice(4))}
        </h3>
      );
      return;
    }

    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      elements.push(
        <div
          key={`li-${idx}`}
          className={`my-2 flex items-start gap-2.5 pl-2 ${textClass} ${bodyColor}`}
        >
          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
          <span>{renderInlineBold(trimmed.replace(/^([-*]|\d+\.)\s+/, ''))}</span>
        </div>
      );
      return;
    }

    elements.push(
      <p key={`p-${idx}`} className={`my-2.5 ${textClass} ${bodyColor}`}>
        {renderInlineBold(trimmed)}
      </p>
    );
  });

  if (tableBuffer.length > 0) {
    flushTable(lines.length + 1);
  }

  return <div>{elements}</div>;
}

function renderInlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-indigo-600 dark:text-indigo-400">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[0.9em] text-indigo-900"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
