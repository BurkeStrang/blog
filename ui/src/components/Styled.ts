import styled, { createGlobalStyle, keyframes } from "styled-components";
// import raceSportFont from "../fonts/RaceSport.ttf";
// import alphacorasa from "../fonts/Alphacorsa Personal Use.ttf";
import tourner from "../fonts/Tourner.ttf";
// import miste from "../fonts/miste.ttf";
import donne from "../fonts/Donne.otf";
import ragestu from "../fonts/Ragestu.otf";
import mega from "../fonts/MegatransRounded-Regular.otf"
import SortIcon from "@mui/icons-material/Sort";

// ——— constants ———
export const neon = "#15aa14";
export const darkgrey = "#686D8C";
export const lightgrey = "#B0B3C6";
export const backgroundColor = "#000";
export const primary = "#0077cc";
export const secondary = "#404040";

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

  @font-face {
    font-family: 'ragestu';
    src: url(${ragestu}) format('opentype');
  }

  
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
`;

export const Header = styled.header`
  position: relative;
  overflow: visible;
  text-align: center;
  padding: 1rem 0;

  h1 {
    position: relative;
    color: ${primary}; /* this should be a bright hue, like #0ff */
    font-size: 3rem;
    letter-spacing: 0.1em;
    margin: 0;
    height: 3rem;

    /* outline stroke (optional, for sharper edges) */
    -webkit-text-stroke: 1px rgba(0,255,255,0.8);

    /* multiple glowy shadows to simulate a neon tube */
    text-shadow:
      /* small tight glow */
      0 0 3px rgba(0,255,255,0.8),
      /* medium glow */
      0 0 5px rgba(0,255,255,0.6),
      /* wide glow */
      0 0 10px rgba(0,255,255,0.4),
      /* extra-wide glow */
      0 0 20px rgba(0,255,255,0.2);
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
  top: -900px; /* tweak as needed */
  left: 60%;
  transform: translateX(-50%);
  width: 150%; /* oversized so it extends past edges */
  height: auto;
  pointer-events: none; /* so it never blocks clicks */
  z-index: -1; /* sit behind the <h1> */
  animation: ${drift} 50s ease-in-out infinite;
`;

// new twirl animation for wispy clouds
const twirl = keyframes`
  0%   { transform: translate(-50%, 0) rotate(0deg)   ; opacity: 0.6; filter: blur(1px); }
  50%  { transform: translate(-50%, 2px) rotate(180deg); opacity: 0.4; filter: blur(1.5px); }
  100% { transform: translate(-50%, 0) rotate(360deg) ; opacity: 0.6; filter: blur(1px); }
`;

export const WispyCloud = styled.img`
  position: absolute;
  top: -830px; /* slightly offset so layers don’t perfectly overlap */
  left: 45%;
  width: 170%; /* a bit larger or smaller for variation */
  pointer-events: none;
  z-index: -2; /* behind the base cloud */
  transform: translateX(-50%);
  opacity: 0.6; /* make them more ethereal */
  animation: ${twirl} 60s linear infinite;
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

export const SortDirectionButton = styled.div<{ isUp: boolean }>`
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
  color: ${backgroundColor};

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
