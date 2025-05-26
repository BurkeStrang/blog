import styled, { createGlobalStyle, keyframes } from "styled-components";
import mega from "../fonts/MegatransRounded-Regular.otf";
import SortIcon from "@mui/icons-material/Sort";

// ——— constants ———
export const neon = "#15aa14";
export const darkgrey = "#686D8C";
export const lightgrey = "#B0B3C6";
export const backgroundColor = "#000";
export const primary = "#0ff";
export const secondary = "#404040";

export const bluish = "rgba(0, 128, 255, 1)";

// ——— global styles ———
export const GlobalStyle = createGlobalStyle`
  @font-face {
    font-family: 'mega';
    src: url(${mega}) format('opentype');
  }

  html {
    height: 100%;
    margin: 0;
    padding: 0;
    background: ${backgroundColor};
    font-family: 'mega', sans-serif;
    overflow: hidden;
  }


  /* Custom Scrollbar */
  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
    padding: 0.5rem;
  }

  ::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: transparent;
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
`;

export const Header = styled.header`
  position: relative;
  overflow: visible;
  text-align: center;
  padding: 1rem 0;

  h1 {
    position: relative;
    color: ${primary}; /* e.g. #0ff */
    font-size: 3rem;
    letter-spacing: 0.1em;
    margin: 0;
    height: 3rem;

    /* sharp cyan stroke */
    -webkit-text-stroke: 1px rgba(0,255,255,0.8);

    /* neon glow layers: cyan close in, then purple further out */
    text-shadow:
      /* cyan glows */
      0 0 3px   rgba(0,255,255,0.8),
      0 0 5px   rgba(0,255,255,0.6),
      0 0 10px  rgba(0,255,255,0.4),
      0 0 20px  rgba(0,255,255,0.2),
      /* purple outer glow */
      0 0 20px  rgba(0,0,255,0.8),
      0 0 30px  rgba(0,0,255,0.3),
      0 0 40px  rgba(0,0,255,0.2);
  }
`;

const drift = keyframes`
  0% {
    transform: translateX(-60%) translateY(1px);
    filter: blur(2px);
  }
  50% {
    transform: translateX(-61%) translateY(8px);
    filter: blur(3px);
  }
  100% {
    transform: translateX(-60%) translateY(2px);
    filter: blur(2px);
  }
`;

export const Cloud = styled.img`
  position: absolute;
  top: -110vh; /* tweak as needed */
  left: 60%;
  transform: translateX(-50%);
  width: 140%; /* oversized so it extends past edges */
  height: auto;
  pointer-events: none; /* so it never blocks clicks */
  z-index: -1; /* sit behind the <h1> */
  animation: ${drift} 40s ease-in-out infinite;
`;

export const SortButton = styled(SortIcon)`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  top: 8rem;
  cursor: pointer;
  color: ${backgroundColor};

  &:hover {
    color: ${secondary};
  }
`;

export const SortDirectionButton = styled.div<{ isUp$: boolean }>`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  top: 8.8rem;
  cursor: pointer;
  scale: 0.8;
  color: ${backgroundColor};

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
  padding: 2rem 0;
`;

export const SearchContainer = styled.div`
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  width: 200px;
  height: 32px;
  border-radius: 15px;
  outline: solid 2px ${backgroundColor};
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
  color: ${lightgrey};
  font-family: "mega", sans-serif;

  &::placeholder {
    color: ${lightgrey};
    opacity: 0.8;
  }

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
  color: ${backgroundColor};
  opacity: 0.6;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

export const Content = styled.main`
  margin: 2rem 2rem 0 2rem;
  padding: 2rem 2rem 0 2rem;
  color: ${backgroundColor};
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
