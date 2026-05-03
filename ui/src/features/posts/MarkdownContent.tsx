import React from 'react';
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  font-size: 1.125rem;
  line-height: 1.8;
  color: ${lightgrey};

  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    color: ${accent};
    font-family: 'mega', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-weight: 600;
    margin: 2.5rem 0 1rem 0;
    line-height: 1.3;
    text-align: left;
  }

  h1 {
    font-size: 2.25rem;
    border-bottom: 2px solid var(--color-md-h1-border);
    padding-bottom: 0.5rem;
    margin-top: 0;
    margin-bottom: 1.5rem;
  }

  h2 {
    font-size: 1.875rem;
    border-bottom: 1px solid var(--color-md-h2-border);
    padding-bottom: 0.5rem;
  }

  h3 {
    font-size: 1.5rem;
  }

  h4 {
    font-size: 1.25rem;
  }

  /* Paragraphs */
  p {
    margin: 1.5rem 0;
    text-align: left;
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
    }
  }

  /* Lists */
  ul, ol {
    margin: 1.5rem 0;
    padding-left: 2rem;
    text-align: left;
  }

  li {
    margin: 0.75rem 0;
    line-height: 1.6;
  }

  /* Blockquotes */
  blockquote {
    border-left: 4px solid var(--color-md-blockquote-border);
    padding: 1rem 1.5rem;
    margin: 2rem 0;
    background: var(--color-md-blockquote-bg);
    border-radius: 0 8px 8px 0;
    font-style: italic;
    color: var(--color-md-blockquote-text);

    p:first-child {
      margin-top: 0;
    }

    p:last-child {
      margin-bottom: 0;
    }
  }

  /* Code */
  code {
    color: var(--color-md-code-text);
    font-family: 'Fantasque Sans Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
    font-weight: 500;
    padding: 0.2em 0.4em;
    border-radius: 4px;
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
    border-top: 1px solid var(--color-md-hr);
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
    color: ${lightgrey};
    font-weight: 600;
  }

  em {
    color: ${lightgrey};
    font-style: italic;
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
      margin: 0 0 1rem 0;
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
      margin: 0 0 0.75rem 0;
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
`;

interface MarkdownContentProps {
  content: string;
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
  margin: 2rem 0;
  background: var(--color-md-code-bg);
  backdrop-filter: blur(24px) saturate(145%);
  -webkit-backdrop-filter: blur(24px) saturate(145%);
  border: 1px solid var(--color-md-code-border);
  border-radius: 8px;
  box-shadow:
    inset 0 1px 0 var(--color-md-code-inset),
    0 10px 26px var(--color-md-code-shadow);
  overflow: hidden;

  code {
    padding: 0 !important;
    border-radius: 0 !important;
  }

  pre {
    background: transparent !important;
    color: ${lightgrey};
    padding: 1.5rem !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    font-size: 1rem !important;
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
    border-radius: 4px;

    pre {
      padding: 0.75rem !important;
      font-size: 0.9rem !important;
    }
  }
`;

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

  return (
    <CodeBlockWrapper>
      <SyntaxHighlighter
        codeTagProps={{ className: `language-${languageClassName}` }}
        customStyle={{}}
        language={normalizedLanguage}
        PreTag="pre"
        style={{}}
        useInlineStyles={false}
      >
        {children}
      </SyntaxHighlighter>
    </CodeBlockWrapper>
  );
});

export const MarkdownContent = React.memo(function MarkdownContent({ content }: MarkdownContentProps) {
  const markdownComponents = React.useMemo(
    () => ({
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
    [],
  );

  return (
    <MarkdownWrapper>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </MarkdownWrapper>
  );
});
