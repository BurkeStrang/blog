import styled, { createGlobalStyle } from "styled-components";

// ——— global styles ———
export const GlobalStyle = createGlobalStyle`
  html, body, #root {
    height: 100%;
    margin: 0;
    padding: 0;
    background: #000;
    color: #fff;
    font-family: 'Courier New', monospace;
    overflow: hidden;
  }
`;

// ——— constants ———
export const neon = "#15aa14";
export const darkgrey = "#686D8C";

// ——— layout & background ———
export const CanvasBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
  pointer-events: none;
`;

export const Page = styled.div`
  position: relative;
  z-index: 1;
`;

export const Header = styled.header`
  text-align: center;
  padding: 2rem 0;

  h1 {
    color: ${darkgrey};
    font-size: 3rem;
    letter-spacing: 0.1em;
    margin: 0;
  }
`;

export const Content = styled.main`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 0;
  color: ${darkgrey};
`;

// ——— post card ———
export const PostCard = styled.article`
  border: 4px solid ${darkgrey};
  background: #000;
  padding: 2rem;
  margin-bottom: 2rem;

  h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 2rem;
    color: ${darkgrey};
  }

  div {
    color: ${darkgrey};
    line-height: 1.6;
  }
`;
