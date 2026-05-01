import React, { Suspense, lazy } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styled from 'styled-components';
import { accent, lightgrey } from '../../shared/theme/colors';
import { useTheme } from '../../shared/contexts/ThemeContext';

// Start loading immediately when this module is imported, not on first render
const codeBlockPromise = Promise.all([
  import('react-syntax-highlighter'),
  import('react-syntax-highlighter/dist/esm/styles/prism/material-dark'),
  import('react-syntax-highlighter/dist/esm/styles/prism/material-light'),
]);

const LazyCodeBlock = lazy(() =>
  codeBlockPromise.then(([{ Prism }, { default: dark }, { default: materialLight }]) => {
    function CodeHighlighter({ language, children, isDark }: { language: string; children: string; isDark: boolean }) {
      return (
        <Prism style={isDark ? dark : materialLight} language={language} PreTag="div">
          {children}
        </Prism>
      );
    }
    return { default: CodeHighlighter };
  })
);

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
    font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
    padding: 0.2em 0.4em;
    border-radius: 4px;
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

const CodeBlockWrapper = styled.div`
  margin: 2rem 0;

  code {
    padding: 0 !important;
    border-radius: 0 !important;
  }

  pre, & > div {
    padding: 1.5rem !important;
    border-radius: 8px !important;
    border: 1px solid var(--color-comment-border) !important;
    font-size: 0.9rem !important;
    overflow-x: auto !important;
    max-width: 100%;
  }

  @media (max-width: 768px) {
    margin: 1.5rem 0;

    pre, & > div {
      padding: 1.25rem !important;
      font-size: 0.85rem !important;
    }
  }

  @media (max-width: 480px) {
    margin: 1.25rem 0;

    pre, & > div {
      padding: 1rem !important;
      font-size: 0.825rem !important;
      border-radius: 6px !important;
    }
  }

  @media (max-width: 390px) {
    margin: 1rem 0;

    pre, & > div {
      padding: 0.75rem !important;
      font-size: 0.8rem !important;
      border-radius: 4px !important;
    }
  }
`;

export const MarkdownContent = React.memo(function MarkdownContent({ content }: MarkdownContentProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const markdownComponents = React.useMemo(
    () => ({
      code(props: {
        children?: React.ReactNode;
        className?: string;
      }) {
        const { children, className } = props;
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : 'text';
        const isInline = !className;

        return !isInline ? (
          <CodeBlockWrapper>
            <Suspense fallback={<pre><code>{String(children).replace(/\n$/, '')}</code></pre>}>
              <LazyCodeBlock language={language} isDark={isDark}>
                {String(children).replace(/\n$/, '')}
              </LazyCodeBlock>
            </Suspense>
          </CodeBlockWrapper>
        ) : (
          <code className={className}>
            {children}
          </code>
        );
      },
    }),
    [isDark],
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
