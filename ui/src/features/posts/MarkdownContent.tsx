import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styled from 'styled-components';
import { accent, lightgrey } from '../../shared/theme/colors';

const MarkdownWrapper = styled.div`
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  font-size: 1.125rem;
  line-height: 1.8;
  color: ${lightgrey};

  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    color: ${accent};
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
    font-family: 'Fantasque Sans Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
    font-weight: 500;
    padding: 0.2em 0.4em;
    border-radius: 4px;
  }

  .token-comment {
    color: var(--color-md-code-comment);
    font-style: italic;
  }

  .token-function {
    color: var(--color-md-code-function);
  }

  .token-keyword {
    color: var(--color-md-code-keyword);
  }

  .token-number {
    color: var(--color-md-code-number);
  }

  .token-operator,
  .token-punctuation {
    color: var(--color-md-code-punctuation);
  }

  .token-property {
    color: var(--color-md-code-property);
  }

  .token-string {
    color: var(--color-md-code-string);
  }

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
    color: ${lightgrey};
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

type TokenKind = 'comment' | 'function' | 'keyword' | 'number' | 'operator' | 'property' | 'punctuation' | 'string' | 'tag';

interface HighlightToken {
  kind?: TokenKind;
  value: string;
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

const tokenPatterns: Record<string, RegExp> = {
  bash: /#.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:cd|curl|do|done|echo|elif|else|export|fi|for|function|git|go|if|in|mkdir|npm|pnpm|return|then|while)\b|\b\d+(?:\.\d+)?\b|[{}()[\];,.]|[=|&<>!-]+/g,
  css: /\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[\da-fA-F]{3,8}\b|[#.][A-Za-z_-][\w-]*|--[\w-]+|[a-z-]+(?=\s*:)|\b[A-Za-z_-][\w-]*\b|\b\d+(?:\.\d+)?(?:fr|px|rem|em|vh|vw|%|s|ms)?\b|[{}()[\];:,.]|[>+~*=|^-]+/g,
  cpp: /\/\/.*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#\s*(?:define|elif|else|endif|ifdef|ifndef|include|pragma)\b|\b(?:alignas|alignof|auto|bool|break|case|catch|char|class|const|constexpr|continue|default|delete|do|double|else|enum|explicit|extern|false|float|for|friend|if|inline|int|long|namespace|new|nullptr|operator|private|protected|public|return|short|signed|sizeof|static|struct|switch|template|this|throw|true|try|typedef|typename|union|unsigned|using|virtual|void|volatile|while)\b|\b\d+(?:\.\d+)?(?:[uUlLfF]*)\b|\b[A-Za-z_]\w*(?=\s*\()|[{}()[\];,.]|::|[-+*/%=&|^!<>~?:]+/g,
  csharp: /\/\/.*|\/\*[\s\S]*?\*\/|@"(?:""|[^"])*"|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:abstract|as|async|await|base|bool|break|case|catch|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|record|ref|required|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|var|virtual|void|volatile|while|yield)\b|\b\d+(?:\.\d+)?[mMdDfF]?\b|\b[A-Za-z_]\w*(?=\s*\()|[{}()[\];,.]|[-+*/%=&|^!<>~?:]+/g,
  go: /\/\/.*|\/\*[\s\S]*?\*\/|`[\s\S]*?`|"(?:\\.|[^"\\])*"|\b(?:break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b|\b(?:false|iota|nil|true)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*(?=\s*\()|[{}()[\];,.]|[:=+\-*/%&|^!<>]+/g,
  html: /<!--[\s\S]*?-->|<!doctype\b[^>]*>|<\/?[A-Za-z][\w:-]*|[A-Za-z_:][\w:.-]*(?=\s*=)|"(?:&quot;|[^"])*"|'(?:&#39;|[^'])*'|&[A-Za-z#\d]+;|[<>/=]|[{}()[\];,.]/gi,
  typescript: /\/\/.*|\/\*[\s\S]*?\*\/|`(?:\\[\s\S]|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:abstract|as|async|await|boolean|break|case|catch|class|const|continue|default|do|else|enum|export|extends|finally|for|from|function|if|implements|import|in|interface|let|new|null|number|of|private|protected|public|readonly|return|string|switch|this|throw|try|type|undefined|unknown|var|void|while)\b|\b(?:false|true)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*(?=\s*\()|<\/?[A-Za-z][\w.-]*|[{}()[\];,.]|[:=+\-*/%&|^!<>?]+/g,
};

const getTokenKind = (language: string, value: string): TokenKind => {
  if (value.startsWith('<!--')) {
    return 'comment';
  }
  if (value.startsWith('<!') || /^<\/?[A-Za-z]/.test(value)) {
    return 'tag';
  }
  if (language === 'html' && /^[A-Za-z_:][\w:.-]*$/.test(value)) {
    return 'property';
  }
  if (language === 'css' && /^#[\da-fA-F]{3,8}\b/.test(value)) {
    return 'number';
  }
  if (language === 'css' && /^[#.][A-Za-z_-]/.test(value)) {
    return 'tag';
  }
  if (value.startsWith('//') || value.startsWith('/*') || (language === 'bash' && value.startsWith('#'))) {
    return 'comment';
  }
  if (language === 'cpp' && value.startsWith('#')) {
    return 'keyword';
  }
  if (value.startsWith('"') || value.startsWith("'") || value.startsWith('`')) {
    return 'string';
  }
  if (/^(?:--[\w-]+|[a-z-]+)$/.test(value) && language === 'css' && !/^(?:auto|block|border-box|center|flex|grid|inherit|inline|none|repeat|solid|transparent|var)$/.test(value)) {
    return 'property';
  }
  if (/^\d/.test(value) || /^#[\da-fA-F]{3,8}\b/.test(value)) {
    return 'number';
  }
  if (/^[{}()[\];:,.]+$/.test(value)) {
    return 'punctuation';
  }
  if (/^[=|&<>!:+\-*/%^?~]+$/.test(value)) {
    return 'operator';
  }
  if (/^[A-Za-z_$][\w$]*$/.test(value) && !/^(?:auto|block|border-box|center|flex|grid|inherit|inline|none|repeat|solid|transparent|var)$/.test(value)) {
    return ['cpp', 'csharp', 'go', 'typescript'].includes(language) ? 'function' : 'keyword';
  }
  return 'keyword';
};

const looksLikeInlineCss = (code: string) => (
  /(?:^|[;{\s])[-A-Za-z]+:\s*[^;{}]+;?$/.test(code)
  || /^[#.][A-Za-z_-][\w-]*(?:\s*\{.*\})?$/.test(code)
  || /\{[^}]*[-A-Za-z]+:\s*[^}]+}/.test(code)
);

const highlightCode = (code: string, rawLanguage: string): HighlightToken[] => {
  const normalizedLanguage = rawLanguage.toLowerCase();
  const language = languageAliases[normalizedLanguage] ?? normalizedLanguage;
  const pattern = tokenPatterns[language];

  if (!pattern) {
    return [{ value: code }];
  }

  const tokens: HighlightToken[] = [];
  let lastIndex = 0;

  for (const match of code.matchAll(pattern)) {
    const value = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      tokens.push({ value: code.slice(lastIndex, index) });
    }

    tokens.push({ kind: getTokenKind(language, value), value });
    lastIndex = index + value.length;
  }

  if (lastIndex < code.length) {
    tokens.push({ value: code.slice(lastIndex) });
  }

  return tokens;
};

const CodeBlockWrapper = styled.div`
  margin: 2rem 0;

  code {
    padding: 0 !important;
    border-radius: 0 !important;
  }

  pre {
    background:
      linear-gradient(135deg, var(--color-md-code-glass-highlight), transparent 42%),
      var(--color-md-code-bg);
    backdrop-filter: blur(8px) saturate(120%);
    -webkit-backdrop-filter: blur(8px) saturate(120%);
    color: ${lightgrey};
    padding: 1.5rem !important;
    border-radius: 8px !important;
    border: 1px solid var(--color-md-code-border) !important;
    box-shadow:
      inset 0 1px 0 var(--color-md-code-inset),
      0 10px 26px var(--color-md-code-shadow);
    font-size: 0.9rem !important;
    line-height: 1.6;
    overflow-x: auto !important;
    max-width: 100%;
    white-space: pre;
  }

  .token-comment {
    color: var(--color-md-code-comment);
    font-style: italic;
  }

  .token-function {
    color: var(--color-md-code-function);
  }

  .token-keyword {
    color: var(--color-md-code-keyword);
  }

  .token-number {
    color: var(--color-md-code-number);
  }

  .token-operator,
  .token-punctuation {
    color: var(--color-md-code-punctuation);
  }

  .token-property {
    color: var(--color-md-code-property);
  }

  .token-string {
    color: var(--color-md-code-string);
  }

  .token-tag {
    color: var(--color-md-code-tag);
  }

  @media (max-width: 768px) {
    margin: 1.5rem 0;

    pre {
      padding: 1.25rem !important;
      font-size: 0.85rem !important;
    }
  }

  @media (max-width: 480px) {
    margin: 1.25rem 0;

    pre {
      padding: 1rem !important;
      font-size: 0.825rem !important;
      border-radius: 6px !important;
    }
  }

  @media (max-width: 390px) {
    margin: 1rem 0;

    pre {
      padding: 0.75rem !important;
      font-size: 0.8rem !important;
      border-radius: 4px !important;
    }
  }
`;

const InlineCode = React.memo(function InlineCode({ children, className }: { children: React.ReactNode; className?: string }) {
  const code = String(children);
  const tokens = React.useMemo(() => (looksLikeInlineCss(code) ? highlightCode(code, 'css') : null), [code]);

  if (!tokens) {
    return (
      <code className={className}>
        {children}
      </code>
    );
  }

  return (
    <code className={className}>
      {tokens.map((token, index) => (
        token.kind ? (
          <span className={`token-${token.kind}`} key={`${index}-${token.kind}`}>
            {token.value}
          </span>
        ) : (
          token.value
        )
      ))}
    </code>
  );
});

const CodeBlock = React.memo(function CodeBlock({ children, language }: { children: string; language: string }) {
  const normalizedLanguage = React.useMemo(() => language.toLowerCase(), [language]);
  const languageClassName = normalizedLanguage.replace(/[^a-z0-9_-]/g, '-');
  const tokens = React.useMemo(() => highlightCode(children, normalizedLanguage), [children, normalizedLanguage]);

  return (
    <CodeBlockWrapper>
      <pre className={`language-${languageClassName}`}>
        <code>
          {tokens.map((token, index) => (
            token.kind ? (
              <span className={`token-${token.kind}`} key={`${index}-${token.kind}`}>
                {token.value}
              </span>
            ) : (
              token.value
            )
          ))}
        </code>
      </pre>
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
