import styled, { createGlobalStyle } from "styled-components";
// import raceSportFont from "../fonts/RaceSport.ttf";
// import alphacorasa from "../fonts/Alphacorsa Personal Use.ttf";
import tourner from "../fonts/Tourner.ttf";
// import miste from "../fonts/miste.ttf";
import donne from "../fonts/Donne.otf";

// ——— constants ———
export const neon = "#15aa14";
export const darkgrey = "#686D8C";
export const lightgrey = "#B0B3C6";
export const backgroundColor = "#000";

// ——— global styles ———
export const GlobalStyle = createGlobalStyle`
  @font-face {
    font-family: 'Tourner';
    src: url(${tourner}) format('truetype');
  }

  @font-face {
    font-family: 'donne';
    src: url(${donne}) format('opentype');
  }

  html {
    height: 100%;
    margin: 0;
    padding: 0;
    background: ${backgroundColor};
    font-family: 'Tourner', monospace;
    color: #fff;
    overflow: hidden;
  }


  /* Custom Scrollbar */
  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    background: ${backgroundColor};
    padding: 0.5rem;
  }

  ::-webkit-scrollbar-thumb {
    background: ${darkgrey};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${neon};
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
  pointer-events: none;
`;

export const Page = styled.div`
  position: relative;
  z-index: 1;
  max-height: 80vh;
  overflow-y: auto;
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
  margin: 2rem 2rem 0 2rem;
  padding: 2rem 2rem 0 2rem;
  color: ${darkgrey};
`;

// ——— post card ———
export const PostCard = styled.article`
  border: 4px solid ${darkgrey};
  background: ${backgroundColor};
  padding: 8rem;
  margin-bottom: 2rem;

  h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: ${darkgrey};
  }

  div {
    color: ${darkgrey};
    line-height: 1.6;
    font-face: bold;
    font-size: 1.5rem;
    font-family: "donne", monospace;
    overflow-y: auto;
    padding: 50px;
    margin: 50px;
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
