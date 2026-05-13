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
import { bluish, readableLightgrey, secondary } from '../../shared/theme/colors';

const headingH3Base = `color-mix(in srgb, ${bluish} 52%, ${secondary} 48%)`;
const headingH4Base = `color-mix(in srgb, ${secondary} 62%, ${bluish} 38%)`;
const readableH3Light = `color-mix(in srgb, ${headingH3Base} 28%, black)`;
const readableH3Dark = `color-mix(in srgb, ${headingH3Base} 34%, ${readableLightgrey})`;
const readableH4Light = `color-mix(in srgb, ${headingH4Base} 24%, black)`;
const readableH4Dark = `color-mix(in srgb, ${headingH4Base} 30%, ${readableLightgrey})`;

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

  /* Keep headers narrow so they stack/wrap predictably, but let
     everything else (paragraphs, lists, code, tables, images, etc.)
     span the full Article width on larger screens. */
  & > h1, & > h2, & > h3, & > h4, & > h5, & > h6 {
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
    color: var(--color-md-accent);
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

  /* H2 — section break with auto-numbered "0X /" prefix in mono cyan.
     Hanging-indent so wrapped lines align with the heading text rather
     than with the prefix. padding-left + negative text-indent shifts
     only the first line back over the prefix. */
  && h2 {
    font-size: clamp(1.6rem, 3.4vw, 2.4rem);
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 1.05;
    margin: 2.2rem 0 0.5em 0;
    padding-top: 1.6rem;
    padding-left: 1.5em;
    text-indent: -1.5em;
    max-width: 28ch;
  }

  && h2::before {
    counter-increment: md-section;
    content: counter(md-section, decimal-leading-zero) ' / ';
    color: var(--color-md-accent);
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
    color: ${readableH3Light};
  }

  && h4 {
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: -0.005em;
    line-height: 1.3;
    margin: 1.6rem 0 0.5rem 0;
    color: ${readableH4Light};
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  [data-theme="dark"] & h3 {
    color: ${readableH3Dark};
  }

  [data-theme="dark"] & h4 {
    color: ${readableH4Dark};
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
      var(--color-md-accent-soft-strong) 60%
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
      text-shadow: 0 0 18px var(--color-md-accent-shadow);
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
    color: var(--color-md-accent);
  }

  /* Blockquote callout */
  blockquote {
    position: relative;
    padding: 1.1rem 1.2rem 1rem 1.3rem;
    margin: 2rem 0;
    background:
      radial-gradient(circle at 8px 8px, var(--color-md-accent-soft) 2px, transparent 2px),
      linear-gradient(180deg, var(--color-md-accent-soft), rgba(0, 0, 0, 0));
    background-size: 16px 16px;
    border: 1px solid var(--color-md-blockquote-border);
    border-radius: 16px;
    box-shadow: 0 0 0 1px var(--color-md-accent-soft);
    font-style: normal;
    color: ${readableLightgrey};

    p:first-child { margin-top: 0; }
    p:last-child { margin-bottom: 0; }
  }

  /* Inline code with cyan tint + border */
  code {
    color: var(--color-md-accent);
    font-family: var(--font-family-mono);
    font-size: 0.88em;
    font-weight: 500;
    padding: 0.16em 0.4em;
    border-radius: 5px;
    background: var(--color-md-accent-soft);
    border: 1px solid var(--color-md-accent-soft-strong);
  }

  && h1 code,
  && h2 code,
  && h3 code,
  && h4 code,
  && h5 code,
  && h6 code {
    color: var(--color-md-accent);
    font-size: 0.82em;
    font-weight: inherit;
    padding: 0 0.12em 0.03em;
    border: 0;
    border-radius: 0.22em;
    background: color-mix(in srgb, var(--color-md-accent-soft) 76%, transparent);
    box-shadow: inset 0 -0.05em 0 color-mix(in srgb, var(--color-md-accent-soft-strong) 84%, transparent);
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
    margin: 2rem 0;
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

    && h2 {
      font-size: 1.5rem;
      margin: 1.6rem 0 0.5rem 0;
      padding-top: 0.6rem;
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

    hr {
      margin: 1.75rem 0;
    }
  }

  @media (max-width: 480px) {
    font-size: 1rem;
    line-height: 1.65;

    h1 {
      font-size: 1.5rem;
      margin: 1rem 0;
    }

    && h2 {
      font-size: 1.375rem;
      margin: 1.25rem 0 0.45rem 0;
      padding-top: 0.45rem;
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

    hr {
      margin: 1.25rem 0;
    }
  }

  @media (max-width: 390px) {
    font-size: 0.95rem;
    line-height: 1.6;

    h1 {
      font-size: 1.375rem;
      margin: 0.75rem 0;
    }

    && h2 {
      font-size: 1.25rem;
      margin: 1rem 0 0.4rem 0;
      padding-top: 0.35rem;
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

    hr {
      margin: 1rem 0;
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

const CodeBlockWrapper = styled.div`
  position: relative;
  margin: 3.25rem 0 2rem 0;
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
    color: var(--color-md-code-text);
    padding: 1.6rem 1.2rem 1.2rem !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    font-size: 0.95rem !important;
    line-height: 1.6;
    overflow-x: auto !important;
    max-width: 100%;

    /* Match the Article's scrollbar — slim cyan-tinted thumb */
    scrollbar-width: thin;
    scrollbar-color: var(--color-post-scrollbar-thumb) transparent;

    &::-webkit-scrollbar {
      height: 0.6rem;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background-color: var(--color-post-scrollbar-thumb);
      border-radius: 999px;
      min-width: 3rem;
    }
    &::-webkit-scrollbar-thumb:hover {
      background-color: var(--color-post-scrollbar-thumb-hover);
    }
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
    margin: 2.4rem 0 1.5rem;

    pre {
      padding: 1.5rem 1.25rem 1.25rem !important;
      font-size: 0.95rem !important;
    }
  }

  @media (max-width: 480px) {
    margin: 2.1rem 0 1.25rem;
    border-radius: 6px;

    pre {
      padding: 1.3rem 1rem 1rem !important;
      font-size: 0.925rem !important;
    }
  }

  @media (max-width: 390px) {
    margin: 1.9rem 0 1rem;
    border-radius: 8px;

    pre {
      padding: 1.1rem 0.75rem 0.75rem !important;
      font-size: 0.9rem !important;
    }
  }
`;

/* Tab row — absolutely positioned at top-right of code block, items aligned
   to bottom so the tab and flares share the same baseline. */
const CodeBlockTabRow = styled.div`
  position: absolute;
  top: calc(-1.7rem + 1px);
  right: 1.25rem;
  display: inline-flex;
  align-items: flex-end;
  z-index: 2;
`;

/* Each side flare is a single masked box: most of the flare is tab-bg (the
   tab visually widens at the bottom), with a small concave cutout near the
   tab's bottom corner so the curve sweeps INTO the tab area rather than out.
   No own backdrop-filter — they inherit the box's filtered look via the
   solid background, which avoids a visible compositing seam at the join. */
const CodeBlockTabFlare = styled.div<{ $side: 'left' | 'right' }>`
  width: 12px;
  height: 12px;
  margin-bottom: -4px;
  background: var(--color-md-code-bg);
  ${({ $side }) =>
    $side === 'left'
      ? `margin-right: -3px;
         -webkit-mask: radial-gradient(circle at 0 0, transparent 8px, black 8.5px);
         mask: radial-gradient(circle at 0 0, transparent 8px, black 8.5px);`
      : `margin-left: -3px;
         -webkit-mask: radial-gradient(circle at 100% 0, transparent 8px, black 8.5px);
         mask: radial-gradient(circle at 100% 0, transparent 8px, black 8.5px);`}
`;

/* The tab itself — visible filled rectangle with rounded top corners.
   No backdrop-filter here — the box owns the filter and the tab sits
   on top, so adding another filter creates a visible seam at the bottom. */
const CodeBlockTab = styled.div`
  height: 1.7rem;
  padding: 0 0.95rem;
  display: flex;
  align-items: center;
  background: var(--color-md-code-bg);
  border-radius: 8px 8px 0 0;
  font-family: var(--font-family-mono);
  font-size: 0.72rem;
  color: rgba(176, 179, 198, 0.75);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const CodeIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--color-md-code-text);
  cursor: pointer;
  opacity: 0.18;
  transition: opacity 0.18s ease, background 0.18s ease, border-color 0.18s ease, color 0.18s ease;

  svg {
    width: 0.95rem;
    height: 0.95rem;
    display: block;
  }

  &:hover {
    opacity: 1;
    color: var(--color-md-accent);
    background: var(--color-md-accent-soft);
    border-color: var(--color-md-accent-soft-strong);
  }

  &:focus-visible {
    opacity: 1;
    color: var(--color-md-accent);
    outline: 2px solid var(--color-md-accent);
    outline-offset: 2px;
  }

  &[data-active='true'] {
    opacity: 1;
    color: var(--color-md-accent);
  }
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

const ButtonRow = styled.div`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 2;
  display: inline-flex;
  gap: 0.25rem;
`;

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
    <CodeBlockWrapper>
      <CodeBlockTabRow>
        <CodeBlockTabFlare $side="left" />
        <CodeBlockTab>{tabLabel}</CodeBlockTab>
        <CodeBlockTabFlare $side="right" />
      </CodeBlockTabRow>
      <ButtonRow>
        {runnerUrl && (
          <CodeIconButton
            type="button"
            onClick={handleRun}
            aria-label={`Open ${tabLabel} runner`}
            title={`Open ${tabLabel} runner`}
          >
            <RunIcon />
          </CodeIconButton>
        )}
        <CodeIconButton
          type="button"
          onClick={handleCopy}
          data-active={copied}
          aria-label={copied ? 'Copied' : 'Copy code'}
          title={copied ? 'Copied' : 'Copy code'}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </CodeIconButton>
      </ButtonRow>
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
