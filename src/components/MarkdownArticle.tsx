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

  lines.forEach((line, idx) => {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${idx}`}
            className="my-5 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm leading-relaxed text-slate-100 shadow-inner"
          >
            <code>{codeLines.join('\n')}</code>
          </pre>
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
    if (!trimmed) {
      elements.push(<div key={`sp-${idx}`} className="h-3" />);
      return;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${idx}`}
          className={`mt-2 mb-5 text-2xl font-bold tracking-tight sm:text-3xl ${headingColor}`}
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
          className={`mt-8 mb-3 border-l-4 border-indigo-600 pl-3 text-xl font-bold ${headingColor}`}
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
          className={`mt-6 mb-2 text-lg font-semibold ${headingColor}`}
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
          className={`my-1.5 flex items-start gap-2.5 pl-2 ${textClass} ${bodyColor}`}
        >
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
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

  return <div>{elements}</div>;
}

function renderInlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-indigo-600 dark:text-indigo-400">
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
