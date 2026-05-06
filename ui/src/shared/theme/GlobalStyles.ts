import styled, { createGlobalStyle } from "styled-components";
import fantasqueSansMono from "../../assets/fonts/FantasqueSansMono-Regular.woff2";
import mega from "../../assets/fonts/MegatransRounded-Regular.otf";
import { backgroundColor, darkgrey, neon, primary, secondary } from "./colors";

// ——— global styles ———
export const GlobalStyle = createGlobalStyle`
  :root, [data-theme="dark"] {
    --color-bg: #010101;
    --color-primary: #0aa;
    --color-accent: #099aaa;
    --color-lightgrey: #B0B3C6;
    --color-darkgrey: rgba(13, 155, 125, 0.4);
    --color-neon: #15aa14;
    --color-secondary: #748B55;
    --color-bluish: rgba(0, 128, 255, 1);
    --color-header-glow: rgba(0, 220, 200, 0.6);
    --color-header-glow-far: rgba(0, 200, 200, 0.3);
    --color-header-mobile-shadow: rgba(0, 0, 0, 0.38);
    --color-header-gradient-top: color-mix(in srgb, var(--color-primary) 88%, white);
    --color-header-gradient-bottom: color-mix(in srgb, var(--color-primary) 88%, black);
    --color-search-outline: rgba(0, 220, 200, 0.8);
    --color-search-outline-focus: rgba(0, 255, 220, 1);
    --color-dropdown-bg: rgba(0, 0, 0, 0.1);
    --color-divider: rgba(255, 255, 255, 0.1);
    --color-comment-bg: rgba(255, 255, 255, 0.02);
    --color-comment-bg-hover: rgba(255, 255, 255, 0.04);
    --color-comment-border: rgba(255, 255, 255, 0.1);
    --color-comment-border-hover: rgba(255, 255, 255, 0.15);
    --color-md-h1-border: rgba(0, 255, 255, 0.2);
    --color-md-h2-border: rgba(0, 255, 255, 0.1);
    --color-md-link: #4A7BA7;
    --color-md-link-hover: #3D5E8C;
    --color-md-blockquote-border: rgba(255, 255, 255, 0.2);
    --color-md-blockquote-bg: rgba(255, 255, 255, 0.02);
    --color-md-blockquote-text: rgba(255, 255, 255, 0.6);
    --color-md-table-bg: rgba(255, 255, 255, 0.02);
    --color-md-table-border: rgba(255, 255, 255, 0.1);
    --color-md-th-bg: rgba(255, 255, 255, 0.05);
    --color-md-tr-hover: rgba(255, 255, 255, 0.03);
    --color-md-hr: rgba(255, 255, 255, 0.1);
    --color-md-code-bg: rgba(18, 20, 20, 0.72);
    --color-md-code-border: rgba(190, 190, 190, 0.08);
    --color-md-code-glass-highlight: rgba(20, 20, 20, 0.2);
    --color-md-code-inset: rgba(200, 200, 200, 0.01);
    --color-md-code-shadow: rgba(200, 200, 200, 0.09);
    --color-md-code-text: #8E878E;
    --color-md-code-comment: #5E6466;
    --color-md-code-function: #6588A1;
    --color-md-code-keyword: #6DA7A0;
    --color-md-code-number: #6588A1;
    --color-md-code-operator: #6588A1;
    --color-md-code-property: #6588A1;
    --color-md-code-punctuation: #3F684E;
    --color-md-code-string: #68685E;
    --color-md-code-tag: #867EA9;
    --color-md-code-attribute: #6DA7A0;
    --color-md-code-builtin: #6588A1;
    --color-md-code-deleted: #B06E6E;
    --color-md-code-entity: #6DA7A0;
    --color-md-code-inserted: #68685E;
    --color-md-code-namespace: #6588A1;
    --color-md-code-regex: #6DA7A0;
    --color-md-code-type: #68685E;
    --color-md-code-variable: #8E878E;
    --color-btn-bg: rgba(0, 0, 0, 0.5);
    --color-btn-bg-hover: rgba(0, 0, 0, 0.7);
    --color-btn-border: rgba(255, 255, 255, 0.15);
    --color-input-bg: rgba(255, 255, 255, 0.05);
    --color-input-bg-focus: rgba(255, 255, 255, 0.08);
    --color-input-border: rgba(255, 255, 255, 0.15);
    --color-input-border-secondary: rgba(255, 255, 255, 0.2);
    --color-cube-bg-start: #222;
    --color-cube-bg-end: #444;
    --color-cube-accent: #099;
    --color-sidebar-bg: rgba(0, 0, 0, 0.35);
    --color-sidebar-link: #088;
    --color-sidebar-glow-near: #088;
    --color-sidebar-glow-far: rgba(40, 0, 255, 0.18);
    --color-sidebar-hover-bg: rgba(255, 255, 255, 0.05);
    --color-sidebar-active-bg: rgba(0, 255, 255, 0.07);
    --color-filter-text: #8E878E;
    --color-filter-text-hover: #6DA7A0;
    --color-filter-icon: #6DA7A0;
    --color-filter-icon-active: #D0B96A;
    --color-filter-dropdown-bg: rgba(18, 24, 26, 0.72);
    --color-filter-border: rgba(109, 167, 160, 0.34);
    --color-filter-hover-bg: rgba(109, 167, 160, 0.11);
    --color-filter-divider: rgba(104, 104, 94, 0.28);
  }

  [data-theme="light"] {
    --color-bg: #f1f1f1;
    --color-primary: #0aa;
    --color-accent: #005f5f;
    --color-lightgrey: #1c1f2e;
    --color-darkgrey: rgba(0, 100, 90, 0.75);
    --color-neon: #0a7a09;
    --color-secondary: #4a5a35;
    --color-bluish: rgba(0, 80, 200, 1);
    --color-header-glow: rgba(210, 250, 250, 0.055);
    --color-header-glow-far: rgba(130, 205, 205, 0.008);
    --color-header-mobile-shadow: rgba(150, 210, 215, 0.035);
    --color-header-gradient-top: color-mix(in srgb, var(--color-primary) 80%, white);
    --color-header-gradient-bottom: color-mix(in srgb, var(--color-primary) 68%, white);
    --color-search-outline: rgba(0, 200, 200, 0.7);
    --color-search-outline-focus: rgba(0, 120, 140, 1);
    --color-dropdown-bg: rgba(255, 255, 255, 0.1);
    --color-divider: rgba(0, 0, 0, 0.1);
    --color-comment-bg: rgba(0, 0, 0, 0.04);
    --color-comment-bg-hover: rgba(0, 0, 0, 0.07);
    --color-comment-border: rgba(0, 0, 0, 0.15);
    --color-comment-border-hover: rgba(0, 0, 0, 0.25);
    --color-md-h1-border: rgba(0, 100, 120, 0.35);
    --color-md-h2-border: rgba(0, 100, 120, 0.2);
    --color-md-link: #1a6b8a;
    --color-md-link-hover: #0f4f6a;
    --color-md-blockquote-border: rgba(0, 0, 0, 0.2);
    --color-md-blockquote-bg: rgba(0, 0, 0, 0.04);
    --color-md-blockquote-text: rgba(0, 0, 0, 0.6);
    --color-md-table-bg: rgba(0, 0, 0, 0.02);
    --color-md-table-border: rgba(0, 0, 0, 0.1);
    --color-md-th-bg: rgba(0, 0, 0, 0.05);
    --color-md-tr-hover: rgba(0, 0, 0, 0.03);
    --color-md-hr: rgba(0, 0, 0, 0.1);
    --color-md-code-bg: rgba(220, 220, 220, 0.22);
    --color-md-code-border: rgba(222, 222, 222, 0.5);
    --color-md-code-glass-highlight: rgba(255, 255, 255, 0.1);
    --color-md-code-inset: rgba(255, 255, 255, 0.1);
    --color-md-code-shadow: rgba(250, 250, 250, 0.1);
    --color-md-code-text: #696469;
    --color-md-code-comment: #74797a;
    --color-md-code-function: #52738a;
    --color-md-code-keyword: #507e79;
    --color-md-code-number: #52738a;
    --color-md-code-operator: #52738a;
    --color-md-code-property: #52738a;
    --color-md-code-punctuation: #637568;
    --color-md-code-string: #666750;
    --color-md-code-tag: #756d8c;
    --color-md-code-attribute: #507e79;
    --color-md-code-builtin: #52738a;
    --color-md-code-deleted: #986363;
    --color-md-code-entity: #507e79;
    --color-md-code-inserted: #666750;
    --color-md-code-namespace: #52738a;
    --color-md-code-regex: #507e79;
    --color-md-code-type: #666750;
    --color-md-code-variable: #696469;
    --color-btn-bg: rgba(255, 255, 255, 0.5);
    --color-btn-bg-hover: rgba(255, 255, 255, 0.75);
    --color-btn-border: rgba(0, 0, 0, 0.15);
    --color-input-bg: rgba(0, 0, 0, 0.05);
    --color-input-bg-focus: rgba(0, 0, 0, 0.09);
    --color-input-border: rgba(0, 0, 0, 0.2);
    --color-input-border-secondary: rgba(0, 0, 0, 0.25);
    --color-cube-bg-start: #f8f8f8;
    --color-cube-bg-end: #ffffff;
    --color-cube-accent: #0ff;
    --color-sidebar-bg: rgba(255, 255, 255, 0.25);
    --color-sidebar-link: #00caca;
    --color-sidebar-glow-near: transparent;
    --color-sidebar-glow-far: transparent;
    --color-sidebar-hover-bg: rgba(0, 0, 0, 0.07);
    --color-sidebar-active-bg: rgba(0, 80, 80, 0.1);
    --color-filter-text: #007a7a;
    --color-filter-text-hover: #005f5f;
    --color-filter-icon: #007a7a;
    --color-filter-icon-active: #007a7a;
    --color-filter-dropdown-bg: rgba(255, 255, 255, 0.1);
    --color-filter-border: rgba(0, 122, 122, 0.35);
    --color-filter-hover-bg: rgba(128, 128, 128, 0.08);
    --color-filter-divider: var(--color-divider);
  }

  @font-face {
    font-family: 'mega';
    src: url(${mega}) format('opentype');
    font-display: block;
    font-weight: normal;
    font-style: normal;
  }

  @font-face {
    font-family: 'Fantasque Sans Mono';
    src: url(${fantasqueSansMono}) format('woff2');
    font-display: swap;
    font-weight: 400 500;
    font-style: normal;
  }

  @keyframes headerLayerWarmup {
    from {
      transform: translate3d(0, 0, 0) scale(1.0001);
    }
    to {
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  html {
    height: 100%;
    margin: 0;
    padding: 0;
    background: ${backgroundColor};
    font-family: 'mega', sans-serif;
    overflow: auto;
  }

  /* Hide overflow only on posts/about/detail page */
  html.posts-page,
  html.about-page,
  html.detail-page {
    overflow: hidden;
  }


  /* Hide scrollbar on body and html only (not all elements) */
  html::-webkit-scrollbar,
  body::-webkit-scrollbar {
    width: 0px;
    height: 0px;
    background: transparent;
  }

  html::-webkit-scrollbar-track,
  body::-webkit-scrollbar-track {
    background: transparent;
  }

  html::-webkit-scrollbar-thumb,
  body::-webkit-scrollbar-thumb {
    background: transparent;
  }

  html::-webkit-scrollbar-thumb:hover,
  body::-webkit-scrollbar-thumb:hover {
    background: transparent;
  }

  /* For Firefox */
  html,
  body {
    scrollbar-width: none;
  }

  /* For IE and Edge */
  html,
  body {
    -ms-overflow-style: none;
  }
`;

// ——— layout & background ———
export const CanvasBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
`;

export const Page = styled.div`
  position: relative;
  z-index: 15;
  pointer-events: none;

  /* Re-enable pointer events for all children */
  & > * {
    pointer-events: auto;
  }
`;

export const Header = styled.header`
  position: relative;
  overflow: visible;
  text-align: center;
  padding-top: 2.5rem;
  pointer-events: none;
  isolation: isolate;
  contain: layout paint style;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  will-change: transform;

  h1 {
    display: inline-block;
    font-family: "mega", "Arial Black", sans-serif;
    font-weight: 400;
    font-size: clamp(2rem, 5vw, 2.6rem);
    letter-spacing: 0.1em;
    line-height: 0.95;
    margin: 1rem 0;
    color: var(--color-primary);
    transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
    will-change: transform;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
    animation: headerLayerWarmup 1ms linear both;

    text-shadow:
      0 -0.3px 0 var(--color-header-gradient-top),
      0 0.65px 0 var(--color-header-glow),
      0 0.85px 0 var(--color-header-gradient-bottom),
      0 1.1px 0 var(--color-header-glow-far);
  }

  @media (max-width: 768px) {
    padding-top: 2rem;

    h1 {
      font-size: 1.9rem;
      letter-spacing: 0;
      line-height: 1;
      margin: 0.65rem 0;
      text-wrap: balance;
      text-shadow:
        0 0.65px 0 var(--color-header-glow),
        0 0.9px 3px var(--color-header-glow-far);
    }
  }

  @media (max-width: 480px) {
    padding-top: 1.5rem;

    h1 {
      font-size: 1.65rem;
      letter-spacing: 0;
      line-height: 1.05;
      margin: 0.45rem 0;
      max-width: 95vw;
      text-shadow:
        0 0.45px 0 var(--color-header-glow),
        0 0.7px 2px var(--color-header-glow-far);
    }
  }

  @media (max-width: 360px) {
    padding-top: 1rem;

    h1 {
      font-size: 1.42rem;
      letter-spacing: 0;
      line-height: 1.08;
      margin: 0.35rem 0;
      text-shadow:
        0 0.35px 0 var(--color-header-glow),
        0 0.55px 1.5px var(--color-header-glow-far);
    }
  }

  [data-theme="light"] & {
    @media (max-width: 768px) {
      h1 {
        text-shadow:
          0 0.55px 0 var(--color-header-glow),
          0 0.8px 2.5px var(--color-header-glow-far);
      }
    }
  }
`;

export const SortButton = styled.button`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  top: 12rem;
  cursor: pointer;
  color: ${darkgrey};
  background: transparent;
  border: 2px solid ${darkgrey};
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-family: "mega", sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
  pointer-events: auto;

  &:hover {
    color: ${secondary};
    border-color: ${secondary};
    background: rgba(255, 255, 255, 0.05);
  }

  @media (max-width: 768px) {
    top: 10rem;
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    letter-spacing: 0.3px;
  }

  @media (max-width: 480px) {
    top: 9rem;
    padding: 0.4rem 0.8rem;
    font-size: 0.7rem;
    letter-spacing: 0.2px;
  }

  @media (max-width: 320px) {
    top: 7rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.65rem;
    letter-spacing: 0.1px;
  }
`;

export const SortDirectionButton = styled.div<{ $isUp: boolean }>`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  top: 12.8rem;
  cursor: pointer;
  scale: 0.8;
  color: ${darkgrey};
  pointer-events: auto;

  &:hover {
    color: ${secondary};
  }

  @media (max-width: 768px) {
    top: 10.6rem;
    scale: 0.75;
  }

  @media (max-width: 480px) {
    top: 8.5rem;
    scale: 0.7;
  }

  @media (max-width: 320px) {
    top: 7.4rem;
    scale: 0.65;
  }
`;

export const FilterButton = styled.button`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-filter-icon);
  background: transparent;
  border: none;
  padding: 0.3rem;
  font-family: "mega", sans-serif;
  font-size: 0.8rem;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
  pointer-events: auto;
  backface-visibility: hidden;
  will-change: color, background-color;

  &:hover {
    color: var(--color-filter-text-hover);
    background: var(--color-filter-hover-bg);
  }

  @media (max-height: 800px) {
    top: 2.5rem;
    padding: 0.25rem;
  }

  @media (max-height: 600px) {
    top: 2rem;
    padding: 0.2rem;
  }

  @media (max-height: 450px) {
    top: 1.5rem;
    padding: 0.15rem;
  }

  @media (max-width: 768px) {
    top: 1.5rem;
    padding: 0.25rem;
    font-size: 0.75rem;
  }

  @media (max-width: 480px) {
    top: 1.5rem;
    padding: 0.2rem;
    font-size: 0.7rem;
  }
`;

export const FilterDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(0);
  min-width: 240px;
  background: var(--color-filter-dropdown-bg);
  border: 2px solid var(--color-filter-border);
  border-radius: 8px 8px 8px 8px;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.2s ease,
    visibility 0.2s ease,
    transform 0.2s ease,
    top 0.2s ease;
  z-index: 100;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  contain: paint;
  isolation: isolate;
  backface-visibility: hidden;
  will-change: opacity, transform;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 12px 28px rgba(0, 0, 0, 0.18);
  top: 0;
  pointer-events: auto;

  &[data-open="true"] {
    opacity: 1;
    visibility: visible;
    top: 1rem;
    transform: translateX(-50%) translateY(55px);
  }

  @media (max-width: 768px) {
    min-width: 200px;

    &[data-open="true"] {
      transform: translateX(-50%) translateY(45px);
    }
  }

  @media (max-width: 480px) {
    min-width: 180px;

    &[data-open="true"] {
      transform: translateX(-50%) translateY(35px);
    }
  }

  @media (max-width: 320px) {
    min-width: 160px;

    &[data-open="true"] {
      transform: translateX(-50%) translateY(30px);
    }
  }
`;

export const FilterOption = styled.button`
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: var(--color-filter-text);
  font-family: "mega", sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    color: var(--color-filter-text-hover);
    background: var(--color-filter-hover-bg);
  }

  &:first-child {
    border-bottom: 1px solid var(--color-filter-divider);
  }

  /* Enhanced styling for icon layout */
  & > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  & svg {
    vertical-align: middle;
  }

  @media (max-width: 768px) {
    padding: 0.6rem 0.8rem;
    font-size: 0.75rem;
  }

  @media (max-width: 480px) {
    padding: 0.5rem 0.6rem;
    font-size: 0.7rem;
    letter-spacing: 0.3px;
  }

  @media (max-width: 320px) {
    padding: 0.4rem 0.5rem;
    font-size: 0.65rem;
    letter-spacing: 0.2px;
  }
`;

export const SearchBar = styled.div`
  position: absolute;
  color: ${darkgrey};
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 1.5rem 0;
  pointer-events: auto;

  @media (max-height: 800px) {
    padding: 1.5rem 0;
  }

  @media (max-height: 600px) {
    padding: 0.75rem 0;
  }

  @media (max-height: 450px) {
    padding: 0.25rem 0;
  }

  @media (max-width: 768px) {
    padding: 0.75rem 0;
    gap: 0.375rem;
  }

  @media (max-width: 480px) {
    padding: 0.9rem 0;
    gap: 0.9rem;
  }

  @media (max-width: 320px) {
    padding: 0.375rem 0;
    gap: 0.125rem;
  }
`;

export const SearchContainer = styled.div`
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  width: 200px;
  height: 32px;
  border-radius: 15px;
  outline: solid 2px var(--color-search-outline);
  overflow: hidden;
  transition: width 0.3s ease;

  &:hover,
  &:focus-within {
    width: 300px;
    outline-color: var(--color-search-outline-focus);
  }

  @media (max-height: 800px) {
    width: 180px;
    height: 30px;

    &:hover,
    &:focus-within {
      width: 280px;
    }
  }

  @media (max-height: 600px) {
    width: 160px;
    height: 26px;

    &:hover,
    &:focus-within {
      width: 240px;
    }
  }

  @media (max-height: 450px) {
    width: 140px;
    height: 22px;

    &:hover,
    &:focus-within {
      width: 200px;
    }
  }

  @media (max-width: 768px) {
    width: 160px;
    height: 28px;

    &:hover,
    &:focus-within {
      width: 240px;
    }
  }

  @media (max-width: 480px) {
    width: 140px;
    height: 24px;

    &:hover,
    &:focus-within {
      width: 200px;
    }
  }

  @media (max-width: 320px) {
    width: 120px;
    height: 22px;

    &:hover,
    &:focus-within {
      width: 180px;
    }
  }
`;

export const SearchInput = styled.input`
  flex: 1;
  height: 100%;
  padding: 0 0.75rem;
  padding-right: 2rem; /* room for clear button */
  border: none;
  font-size: 1rem;
  background: transparent;
  color: ${primary};
  font-family: "mega", sans-serif;

  &::placeholder {
    color: ${primary};
    opacity: 0.8;
  }

  &:focus {
    outline: none;
  }

  @media (max-height: 800px) {
    font-size: 0.9rem;
    padding: 0 0.6rem;
    padding-right: 1.8rem;
  }

  @media (max-height: 600px) {
    font-size: 0.8rem;
    padding: 0 0.5rem;
    padding-right: 1.6rem;
  }

  @media (max-height: 450px) {
    font-size: 0.7rem;
    padding: 0 0.4rem;
    padding-right: 1.4rem;
  }

  @media (max-width: 768px) {
    font-size: 16px; /* Minimum 16px to prevent iOS Safari auto-zoom */
    padding: 0 0.5rem;
    padding-right: 1.6rem;
  }

  @media (max-width: 480px) {
    font-size: 16px; /* Minimum 16px to prevent iOS Safari auto-zoom */
    padding: 0 0.4rem;
    padding-right: 1.4rem;
  }

  @media (max-width: 320px) {
    font-size: 16px; /* Minimum 16px to prevent iOS Safari auto-zoom */
    padding: 0 0.3rem;
    padding-right: 1.2rem;
  }
`;

export const ClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  padding: 0.5rem;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  color: ${primary};
  opacity: 0.6;
  transition: opacity 0.2s;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    opacity: 1;
  }

  @media (max-width: 768px) {
    font-size: 1.4rem;
    padding: 0.6rem;
    right: 0.2rem;
  }

  @media (max-width: 480px) {
    font-size: 1.6rem;
    padding: 0.7rem;
    right: 0.1rem;
  }

  @media (max-width: 320px) {
    font-size: 1.5rem;
    right: 0.1rem;
  }
`;

export const Content = styled.main`
  margin: 2rem 2rem 0 2rem;
  padding: 2rem 2rem 0 2rem;
  color: ${backgroundColor};
  box-sizing: border-box;
  overflow-x: hidden;
  pointer-events: auto;

  @media (max-width: 768px) {
    margin: 1.5rem 1rem 0 1rem;
    padding: 1.5rem 1rem 0 1rem;
  }

  @media (max-width: 480px) {
    margin: 1rem 0.75rem 0 0.75rem;
    padding: 1rem 0.75rem 0 0.75rem;
  }

  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    margin: 0.5rem 0.25rem 0 0.25rem;
    padding: 0.5rem 0.25rem 0 0.25rem;
    width: calc(100vw - 0.5rem);
    max-width: calc(100vw - 0.5rem);
  }
`;

// ——— post card ———
export const PostCard = styled.article`
  max-height: 80vh;
  overflow-y: auto;
  border: 4px solid ${darkgrey};
  background: ${backgroundColor};

  h2 {
    margin-top: 0;
    color: ${darkgrey};
  }

  div {
    color: ${darkgrey};
    line-height: 1.6;
    font-face: bold;
    font-size: 1.5rem;
    font-family: "Orbitron", monospace;
    overflow-y: auto;
  }
`;

export const MinimalButton = styled.button`
  margin-left: auto;
  display: block;
  background: transparent;
  border: 1px solid ${darkgrey};
  padding: 0.5rem 1rem;
  font-size: 1rem;
  font-family: "tourner", monospace;
  color: ${darkgrey};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  backdrop-filter: blur(4px);

  &:hover {
    border-color: ${neon};
    color: ${neon};
    background-color: ${backgroundColor};
  }

  &:active {
    transform: scale(0.97);
  }
`;
