import React, { useCallback, useRef, useState } from 'react';
import { compressToEncodedURIComponent } from 'lz-string';
import ReactMarkdown from 'react-markdown';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import remarkGfm from 'remark-gfm';
import styled from 'styled-components';
import { tokens } from '../../../shared/theme';
import './markdown.css';

SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('html', markup);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('markup', markup);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);

interface MarkdownContentProps {
  content: string;
  metadataAfterH1?: React.ReactNode;
}

const languageAliases: Record<string, string> = {
  'c#': 'csharp',
  'c++': 'cpp',
  cs: 'csharp',
  cxx: 'cpp',
  javascript: 'javascript',
  js: 'javascript',
  jsx: 'typescript',
  htm: 'html',
  ts: 'typescript',
  tsx: 'typescript',
  shell: 'bash',
  sh: 'bash',
  zsh: 'bash',
};

const getNormalizedLanguage = (rawLanguage: string) => {
  const normalizedLanguage = rawLanguage.toLowerCase();
  return languageAliases[normalizedLanguage] ?? normalizedLanguage;
};

const looksLikeInlineCss = (code: string) => (
  /(?:^|[;{\s])[-A-Za-z]+:\s*[^;{}]+;?$/.test(code)
  || /^[#.][A-Za-z_-][\w-]*(?:\s*\{.*\})?$/.test(code)
  || /\{[^}]*[-A-Za-z]+:\s*[^}]+}/.test(code)
);

/* The flare is the only piece with a runtime-conditional style (mirrored
   mask based on which side it's on). Keeping it in styled-components keeps
   markdown.css free of $side branching. */
const CodeBlockTabFlare = styled.div<{ $side: 'left' | 'right' }>`
  width: 12px;
  height: 12px;
  margin-bottom: -4px;
  background: ${tokens.md.code.bg};
  ${({ $side }) =>
    $side === 'left'
      ? `margin-right: -3px;
         -webkit-mask: radial-gradient(circle at 0 0, transparent 8px, black 8.5px);
         mask: radial-gradient(circle at 0 0, transparent 8px, black 8.5px);`
      : `margin-left: -3px;
         -webkit-mask: radial-gradient(circle at 100% 0, transparent 8px, black 8.5px);
         mask: radial-gradient(circle at 100% 0, transparent 8px, black 8.5px);`}
`;

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const RunIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
    <polygon points="6 4 20 12 6 20 6 4" />
  </svg>
);

const onecompilerLanguages: Record<string, string> = {
  javascript: 'javascript',
  python: 'python',
  go: 'go',
  csharp: 'csharp',
  cpp: 'cpp',
  bash: 'bash',
  html: 'html',
};

const buildRunnerUrl = (language: string, code: string): string | null => {
  if (language === 'typescript' || language === 'tsx') {
    return `https://www.typescriptlang.org/play?#code/${compressToEncodedURIComponent(code)}`;
  }
  const slug = onecompilerLanguages[language];
  return slug ? `https://onecompiler.com/${slug}` : null;
};

const runnerNeedsClipboard = (language: string): boolean => (
  language !== 'typescript' && language !== 'tsx'
);

const langDisplay: Record<string, string> = {
  typescript: 'TS',
  javascript: 'JS',
  jsx: 'JSX',
  tsx: 'TSX',
  bash: 'SH',
  python: 'PY',
  csharp: 'C#',
  cpp: 'C++',
  go: 'GO',
  css: 'CSS',
  html: 'HTML',
  markup: 'HTML',
};

const InlineCode = React.memo(function InlineCode({ children, className }: { children: React.ReactNode; className?: string }) {
  const code = String(children);

  if (!looksLikeInlineCss(code)) {
    return (
      <code className={className}>
        {children}
      </code>
    );
  }

  return (
    <code className={className}>
      <SyntaxHighlighter
        CodeTag="span"
        PreTag="span"
        customStyle={{ background: 'transparent', margin: 0, padding: 0 }}
        language="css"
        style={{}}
        useInlineStyles={false}
      >
        {code}
      </SyntaxHighlighter>
    </code>
  );
});

const CodeBlock = React.memo(function CodeBlock({ children, language }: { children: string; language: string }) {
  const normalizedLanguage = React.useMemo(() => getNormalizedLanguage(language), [language]);
  const languageClassName = normalizedLanguage.replace(/[^a-z0-9_-]/g, '-');
  const tabLabel = langDisplay[normalizedLanguage] ?? normalizedLanguage.toUpperCase();
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [children]);

  React.useEffect(() => () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
  }, []);

  const runnerUrl = React.useMemo(
    () => buildRunnerUrl(normalizedLanguage, children),
    [normalizedLanguage, children],
  );
  const handleRun = useCallback(() => {
    if (!runnerUrl) return;
    if (runnerNeedsClipboard(normalizedLanguage)) {
      void navigator.clipboard.writeText(children).catch(() => undefined);
    }
    window.open(runnerUrl, '_blank', 'noopener,noreferrer');
  }, [children, normalizedLanguage, runnerUrl]);

  return (
    <div className="code-block">
      <div className="code-block__tabs">
        <CodeBlockTabFlare $side="left" />
        <div className="code-block__tab">{tabLabel}</div>
        <CodeBlockTabFlare $side="right" />
      </div>
      <div className="code-block__buttons">
        {runnerUrl && (
          <button
            type="button"
            className="code-block__icon-btn"
            onClick={handleRun}
            aria-label={`Open ${tabLabel} runner`}
            title={`Open ${tabLabel} runner`}
          >
            <RunIcon />
          </button>
        )}
        <button
          type="button"
          className="code-block__icon-btn"
          onClick={handleCopy}
          data-active={copied}
          aria-label={copied ? 'Copied' : 'Copy code'}
          title={copied ? 'Copied' : 'Copy code'}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
      <SyntaxHighlighter
        codeTagProps={{ className: `language-${languageClassName}` }}
        customStyle={{}}
        language={normalizedLanguage}
        PreTag="pre"
        style={{}}
        useInlineStyles={false}
        showLineNumbers
        lineNumberStyle={{
          minWidth: '2em',
          paddingRight: '1.2em',
          textAlign: 'right',
          color: tokens.md.code.comment,
          opacity: 0.55,
          userSelect: 'none',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
});

export const MarkdownContent = React.memo(function MarkdownContent({ content, metadataAfterH1 }: MarkdownContentProps) {
  // Track whether the first <h1> has rendered so we can inject metadata after it.
  // Reset at the start of every render — ReactMarkdown processes the tree top-down
  // synchronously, so the h1 component callback observes a fresh counter each pass.
  const h1SeenRef = useRef(false);
  h1SeenRef.current = false;

  const markdownComponents = React.useMemo(
    () => ({
      h1(props: { children?: React.ReactNode }) {
        const { children } = props;
        const isFirst = !h1SeenRef.current;
        if (isFirst) h1SeenRef.current = true;
        return (
          <>
            <h1>{children}</h1>
            {isFirst && metadataAfterH1}
          </>
        );
      },
      code(props: {
        children?: React.ReactNode;
        className?: string;
      }) {
        const { children, className } = props;
        const match = /language-([^\s]+)/.exec(className || '');
        const language = match ? match[1] : 'text';
        const isInline = !className;
        const code = String(children).replace(/\n$/, '');

        return !isInline ? (
          <CodeBlock language={language}>
            {code}
          </CodeBlock>
        ) : (
          <InlineCode className={className}>
            {children}
          </InlineCode>
        );
      },
    }),
    [metadataAfterH1],
  );

  return (
    <div className="markdown markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
