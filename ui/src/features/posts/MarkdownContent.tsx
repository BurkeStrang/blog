import React, { useRef } from 'react';
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
import { accent, lightgrey } from '../../shared/theme/colors';

const readableAccent = `color-mix(in srgb, ${accent} 65%, black)`;
const readableLightgrey = `color-mix(in srgb, ${lightgrey} 65%, black)`;

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

const MarkdownWrapper = styled.div`
  font-family: var(--font-family);
  font-size: 1.125rem;
  line-height: 1.8;
  color: ${readableLightgrey};
  counter-reset: md-section;

  /* Keep body content at a readable line length inside the wide frame */
  & > * {
    max-width: 72ch;
  }

  /* Headings — modern bold display sans */
  && h1, && h2, && h3, && h4, && h5, && h6 {
    font-family: var(--font-family-display);
    color: ${readableLightgrey};
    text-align: left;
    text-wrap: balance;
  }

  /* Inside any heading: *italic* and **bold** become the cyan accent (no italic).
     Lets you write \`# Types Are Just *Vibes*  We Made Structural\` to get a
     stacked, two-color title without leaving markdown. */
  && h1 em, && h2 em, && h3 em, && h4 em, && h5 em, && h6 em,
  && h1 strong, && h2 strong, && h3 strong, && h4 strong, && h5 strong, && h6 strong {
    font-style: normal;
    font-weight: inherit;
    color: var(--color-primary);
    background: none;
  }

  /* H1 — massive display, tight tracking, uppercase */
  && h1 {
    font-size: clamp(2.8rem, 8vw, 5.5rem);
    font-weight: 800;
    letter-spacing: -0.06em;
    line-height: 0.9;
    margin: 0.6rem 0 0.5rem 0;
    text-transform: uppercase;
    max-width: 14ch;
  }

  && h1 br { line-height: 0; }

  /* H2 — section break with auto-numbered "0X /" prefix in mono cyan */
  && h2 {
    font-size: clamp(1.6rem, 3.4vw, 2.4rem);
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 1.05;
    margin: 3.5rem 0 0.7rem 0;
    padding-top: 1.6rem;
    border-top: 1px solid var(--color-md-h2-border);
  }

  && h2::before {
    counter-increment: md-section;
    content: counter(md-section, decimal-leading-zero) ' / ';
    color: var(--color-primary);
    font-family: var(--font-family-mono);
    font-size: 0.42em;
    font-weight: 500;
    letter-spacing: 0;
    text-transform: lowercase;
    vertical-align: 0.35em;
    margin-right: 0.3em;
  }

  /* Optional kicker accent: H2 strong as a leading uppercase mono accent
     (e.g. \`## **Section** Title here\` puts a small caps tag before the title) */

  /* H3 — accent color, smaller */
  && h3 {
    font-size: 1.22rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.3;
    margin: 2rem 0 0.4rem 0;
    color: ${readableAccent};
  }

  && h4 {
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: -0.005em;
    line-height: 1.3;
    margin: 1.6rem 0 0.5rem 0;
    color: ${readableAccent};
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Paragraphs */
  p {
    margin: 1.2rem 0;
    text-align: left;
  }

  /* Strong with cyan highlighter underline */
  strong {
    font-weight: 700;
    color: ${readableLightgrey};
    background: linear-gradient(
      180deg,
      transparent 60%,
      rgba(0, 220, 200, 0.18) 60%
    );
  }

  /* Links */
  a {
    color: var(--color-md-link);
    text-decoration: none;
    border-bottom: 1px solid var(--color-md-link);
    transition: all 0.2s ease;

    &:hover {
      color: var(--color-md-link-hover);
      border-bottom-color: var(--color-md-link-hover);
      text-shadow: 0 0 18px rgba(0, 220, 200, 0.35);
    }
  }

  /* Lists */
  ul, ol {
    margin: 1.5rem 0;
    padding-left: 2rem;
    text-align: left;
  }

  li {
    margin: 0.5rem 0;
    line-height: 1.6;
  }

  li::marker {
    color: var(--color-primary);
  }

  /* Blockquote as NOTE callout */
  blockquote {
    position: relative;
    padding: 1.1rem 1.2rem 1rem 1.3rem;
    margin: 2rem 0;
    background:
      radial-gradient(circle at 8px 8px, rgba(0, 220, 200, 0.08) 2px, transparent 2px),
      linear-gradient(180deg, rgba(0, 220, 200, 0.06), rgba(0, 220, 200, 0.025));
    background-size: 16px 16px;
    border: 1px solid var(--color-md-blockquote-border);
    border-radius: 16px;
    box-shadow: 0 0 0 1px rgba(0, 220, 200, 0.06);
    font-style: normal;
    color: ${readableLightgrey};

    &::before {
      content: 'NOTE';
      position: absolute;
      top: -0.85rem;
      left: 1rem;
      padding: 0.2rem 0.55rem;
      font-family: var(--font-family);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--color-bg);
      background: var(--color-primary);
      border: 2px solid #000;
      border-radius: 999px;
      box-shadow: 3px 3px 0 #000;
    }

    p:first-child { margin-top: 0; }
    p:last-child { margin-bottom: 0; }
  }

  /* Inline code with cyan tint + border */
  code {
    color: var(--color-primary);
    font-family: var(--font-family-mono);
    font-size: 0.88em;
    font-weight: 500;
    padding: 0.16em 0.4em;
    border-radius: 5px;
    background: rgba(0, 220, 200, 0.07);
    border: 1px solid rgba(0, 220, 200, 0.16);
  }

  .comment,
  .prolog,
  .doctype,
  .cdata,
  .token-comment {
    color: var(--color-md-code-comment);
    font-style: italic;
  }

  .function,
  .function-name,
  .token-function {
    color: var(--color-md-code-function);
  }

  .atrule,
  .important,
  .keyword,
  .token-keyword {
    color: var(--color-md-code-keyword);
  }

  .builtin {
    color: var(--color-md-code-builtin);
  }

  .boolean,
  .constant,
  .number,
  .unit,
  .token-number {
    color: var(--color-md-code-number);
  }

  .punctuation,
  .token-punctuation {
    color: var(--color-md-code-punctuation);
  }

  .operator,
  .token-operator {
    color: var(--color-md-code-operator);
  }

  .attr-name,
  .property,
  .symbol,
  .token-property {
    color: var(--color-md-code-property);
  }

  .attr-value,
  .char,
  .string,
  .template-string,
  .token-string {
    color: var(--color-md-code-string);
  }

  .regex {
    color: var(--color-md-code-regex);
  }

  .class-name,
  .maybe-class-name {
    color: var(--color-md-code-type);
  }

  .attr-name {
    color: var(--color-md-code-attribute);
  }

  .namespace {
    color: var(--color-md-code-namespace);
  }

  .parameter,
  .variable {
    color: var(--color-md-code-variable);
  }

  .deleted {
    color: var(--color-md-code-deleted);
  }

  .inserted {
    color: var(--color-md-code-inserted);
  }

  .entity,
  .url {
    color: var(--color-md-code-entity);
  }

  .selector,
  .tag,
  .token-tag {
    color: var(--color-md-code-tag);
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 2rem 0;
    background: var(--color-md-table-bg);
    border-radius: 8px;
    overflow: hidden;
  }

  th, td {
    padding: 0.75rem 1rem;
    text-align: left;
    border: 1px solid var(--color-md-table-border);
  }

  th {
    background: var(--color-md-th-bg);
    color: var(--color-md-code-text);
    font-weight: 600;
  }

  tr:hover {
    background: var(--color-md-tr-hover);
  }

  /* Horizontal Rule */
  hr {
    border: none;
    border-top: 2px solid var(--color-md-hr);
    margin: 3rem 0;
  }

  /* Images */
  img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 2rem 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  /* Strong and Emphasis */
  strong {
    color: ${readableLightgrey};
    font-weight: 600;
  }

  em {
    color: ${readableLightgrey};
    font-style: italic;
  }

  && h1 *, && h2 *, && h3 *, && h4 *, && h5 *, && h6 * {
    color: inherit;
    border-bottom-color: currentColor;
  }

  /* Responsive */
  @media (max-width: 768px) {
    font-size: 1rem;
    line-height: 1.7;

    h1 {
      font-size: 1.75rem;
      margin-bottom: 1.25rem;
    }

    h2 {
      font-size: 1.5rem;
    }

    h3 {
      font-size: 1.25rem;
    }

    ul, ol {
      padding-left: 1.5rem;
    }

    blockquote {
      padding: 0.75rem 1rem;
      margin: 1.5rem 0;
    }
  }

  @media (max-width: 480px) {
    font-size: 1rem;
    line-height: 1.65;

    h1 {
      font-size: 1.5rem;
      margin: 1rem 0;
    }

    h2 {
      font-size: 1.375rem;
      margin: 1.75rem 0 0.75rem 0;
    }

    h3 {
      font-size: 1.25rem;
      margin: 1.5rem 0 0.75rem 0;
    }

    h4 {
      font-size: 1.125rem;
    }

    ul, ol {
      padding-left: 1.25rem;
      margin: 1.25rem 0;
    }

    li {
      margin: 0.5rem 0;
    }

    blockquote {
      padding: 0.75rem 1rem;
      margin: 1.25rem 0;
    }

    table {
      font-size: 0.9rem;
      margin: 1.5rem 0;
    }

    th, td {
      padding: 0.5rem 0.75rem;
    }
  }

  @media (max-width: 390px) {
    font-size: 0.95rem;
    line-height: 1.6;

    h1 {
      font-size: 1.375rem;
      margin: 0.75rem 0;
    }

    h2 {
      font-size: 1.25rem;
      margin: 1.5rem 0 0.75rem 0;
    }

    h3 {
      font-size: 1.125rem;
      margin: 1.25rem 0 0.5rem 0;
    }

    h4 {
      font-size: 1.0625rem;
    }

    ul, ol {
      padding-left: 1rem;
      margin: 1rem 0;
    }

    li {
      margin: 0.4rem 0;
    }

    blockquote {
      padding: 0.5rem 0.75rem;
      margin: 1rem 0;
      font-size: 0.9rem;
    }

    table {
      font-size: 0.85rem;
      margin: 1.25rem 0;
    }

    th, td {
      padding: 0.4rem 0.5rem;
    }

    img {
      margin: 1.5rem 0;
    }
  }

  /* Scroll-reveal: PostDetail tags direct children with [data-reveal] on
     mount, then [data-revealed] when each enters the Article viewport. */
  & > [data-reveal] {
    opacity: 0;
    transform: translateY(18px);
    filter: blur(6px);
    transition:
      opacity 600ms ease,
      transform 600ms ease,
      filter 600ms ease;
    will-change: opacity, transform, filter;
  }

  & > [data-reveal][data-revealed] {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }

  @media (prefers-reduced-motion: reduce) {
    & > [data-reveal] {
      opacity: 1;
      transform: none;
      filter: none;
      transition: none;
    }
  }
`;

interface MarkdownContentProps {
  content: string;
  metadataAfterH1?: React.ReactNode;
}

const languageAliases: Record<string, string> = {
  'c#': 'csharp',
  'c++': 'cpp',
  cs: 'csharp',
  cxx: 'cpp',
  javascript: 'typescript',
  js: 'typescript',
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

const CodeBlockWrapper = styled.div`
  position: relative;
  margin: 2.5rem 0 2rem 0;
  background: var(--color-md-code-bg);
  backdrop-filter: blur(24px) saturate(145%);
  -webkit-backdrop-filter: blur(24px) saturate(145%);
  border-radius: 12px;
  box-shadow: 0 10px 26px var(--color-md-code-shadow);
  font-family: var(--font-family-mono);

  /* Line number gutter from react-syntax-highlighter */
  .linenumber {
    display: inline-block;
    min-width: 2em;
    padding-right: 1.2em;
    text-align: right;
    color: var(--color-md-code-comment);
    opacity: 0.55;
    user-select: none;
  }

  code {
    padding: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    border: 0 !important;
    color: inherit !important;
  }

  pre {
    background: transparent !important;
    color: ${lightgrey};
    padding: 1.2rem !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    font-size: 0.95rem !important;
    line-height: 1.6;
    overflow-x: auto !important;
    max-width: 100%;
    white-space: pre;
  }

  .comment,
  .prolog,
  .doctype,
  .cdata,
  .token-comment {
    color: var(--color-md-code-comment);
    font-style: italic;
  }

  .function,
  .function-name,
  .token-function {
    color: var(--color-md-code-function);
  }

  .atrule,
  .important,
  .keyword,
  .token-keyword {
    color: var(--color-md-code-keyword);
  }

  .builtin {
    color: var(--color-md-code-builtin);
  }

  .boolean,
  .constant,
  .number,
  .unit,
  .token-number {
    color: var(--color-md-code-number);
  }

  .punctuation,
  .token-punctuation {
    color: var(--color-md-code-punctuation);
  }

  .operator,
  .token-operator {
    color: var(--color-md-code-operator);
  }

  .attr-name,
  .property,
  .symbol,
  .token-property {
    color: var(--color-md-code-property);
  }

  .attr-value,
  .char,
  .string,
  .template-string,
  .token-string {
    color: var(--color-md-code-string);
  }

  .regex {
    color: var(--color-md-code-regex);
  }

  .class-name,
  .maybe-class-name {
    color: var(--color-md-code-type);
  }

  .attr-name {
    color: var(--color-md-code-attribute);
  }

  .namespace {
    color: var(--color-md-code-namespace);
  }

  .parameter,
  .variable {
    color: var(--color-md-code-variable);
  }

  .deleted {
    color: var(--color-md-code-deleted);
  }

  .inserted {
    color: var(--color-md-code-inserted);
  }

  .entity,
  .url {
    color: var(--color-md-code-entity);
  }

  .selector,
  .tag,
  .token-tag {
    color: var(--color-md-code-tag);
  }

  @media (max-width: 768px) {
    margin: 1.5rem 0;

    pre {
      padding: 1.25rem !important;
      font-size: 0.95rem !important;
    }
  }

  @media (max-width: 480px) {
    margin: 1.25rem 0;
    border-radius: 6px;

    pre {
      padding: 1rem !important;
      font-size: 0.925rem !important;
    }
  }

  @media (max-width: 390px) {
    margin: 1rem 0;
    border-radius: 8px;

    pre {
      padding: 0.75rem !important;
      font-size: 0.9rem !important;
    }
  }
`;

/* Tab row — absolutely positioned at top-right of code block, items aligned
   to bottom so the tab and flares share the same baseline. */
const CodeBlockTabRow = styled.div`
  position: absolute;
  top: -1.7rem;
  right: 1.25rem;
  display: inline-flex;
  align-items: flex-end;
  z-index: 2;
`;

/* Each side flare is a single masked box: most of the flare is tab-bg (the
   tab visually widens at the bottom), with a small concave cutout near the
   tab's bottom corner so the curve sweeps INTO the tab area rather than out. */
const CodeBlockTabFlare = styled.div<{ $side: 'left' | 'right' }>`
  width: 12px;
  height: 12px;
  margin-bottom: -4px;
  background: var(--color-md-code-bg);
  backdrop-filter: blur(24px) saturate(145%);
  -webkit-backdrop-filter: blur(24px) saturate(145%);
  ${({ $side }) =>
    $side === 'left'
      ? `margin-right: -3px;
         -webkit-mask: radial-gradient(circle at 0 0, transparent 8px, black 8.5px);
         mask: radial-gradient(circle at 0 0, transparent 8px, black 8.5px);`
      : `margin-left: -3px;
         -webkit-mask: radial-gradient(circle at 100% 0, transparent 8px, black 8.5px);
         mask: radial-gradient(circle at 100% 0, transparent 8px, black 8.5px);`}
`;

/* The tab itself — visible filled rectangle with rounded top corners. */
const CodeBlockTab = styled.div`
  height: 1.7rem;
  padding: 0 0.95rem;
  display: flex;
  align-items: center;
  background: var(--color-md-code-bg);
  backdrop-filter: blur(24px) saturate(145%);
  -webkit-backdrop-filter: blur(24px) saturate(145%);
  border-radius: 8px 8px 0 0;
  font-family: var(--font-family-mono);
  font-size: 0.72rem;
  color: rgba(176, 179, 198, 0.75);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

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

  return (
    <CodeBlockWrapper>
      <CodeBlockTabRow>
        <CodeBlockTabFlare $side="left" />
        <CodeBlockTab>{tabLabel}</CodeBlockTab>
        <CodeBlockTabFlare $side="right" />
      </CodeBlockTabRow>
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
          color: 'var(--color-md-code-comment)',
          opacity: 0.55,
          userSelect: 'none',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </CodeBlockWrapper>
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
    <MarkdownWrapper className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </MarkdownWrapper>
  );
});
