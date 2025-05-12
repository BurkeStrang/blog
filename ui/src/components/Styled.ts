import styled, { createGlobalStyle } from "styled-components";
// import raceSportFont from "../fonts/RaceSport.ttf";
// import alphacorasa from "../fonts/Alphacorsa Personal Use.ttf";
import tourner from "../fonts/Tourner.ttf";
// import miste from "../fonts/miste.ttf";
import donne from "../fonts/Donne.otf";
import SortIcon from "@mui/icons-material/Sort";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

// ——— constants ———
export const neon = "#15aa14";
export const darkgrey = "#686D8C";
export const lightgrey = "#B0B3C6";
export const backgroundColor = "#000";
export const primary = "#1e2021";
export const secondary = "#00c0fb";

export const bluish = "rgba(0, 128, 255, 1)";

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
  max-height: 90vh;
  yoverflow: auto;
`;

export const Header = styled.header`
  position: relative;
  overflow: hidden;
  text-align: center;
  padding: 1rem 0;

  h1 {
    position: relative;
    color: ${primary};
    font-size: 3rem;
    letter-spacing: 0.1em;
    margin: 0;
    height: 4rem;
  }
`;

export const SortButton = styled(SortIcon)`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  top: 8rem;
  cursor: pointer;

  &:hover {
    color: ${secondary};
  }
`;

export const SortDirectionButton = styled.div<{ isUp: boolean }>`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  top: 8.8rem;
  cursor: pointer;
  scale: 0.8;

  &:hover {
    color: ${secondary};
  }
`;

export const SearchBar = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0;
`;

export const SearchContainer = styled.div`
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  width: 200px;
  height: 32px;
  border-radius: 15px;
  outline: solid 2px #202020;
  overflow: hidden;
  transition: width 0.3s ease;

  &:hover,
  &:focus-within {
    width: 300px;
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
  color: #202020;
  font-family: "donne", monospace;

  &:focus {
    outline: none;
  }
`;

export const ClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  color: #202020;
  opacity: 0.6;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

export const Content = styled.main`
  margin: 2rem 2rem 0 2rem;
  padding: 2rem 2rem 0 2rem;
  color: ${primary};
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
