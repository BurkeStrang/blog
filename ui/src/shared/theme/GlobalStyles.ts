import styled, { createGlobalStyle, keyframes } from "styled-components";
import mega from "../../assets/fonts/MegatransRounded-Regular.otf";
// import SortIcon from "@mui/icons-material/Sort";
import {
  backgroundColor,
  darkgrey,
  neon,
  primary,
  secondary,
} from "./colors";

// ——— global styles ———
export const GlobalStyle = createGlobalStyle`
  @font-face {
    font-family: 'mega';
    src: url(${mega}) format('opentype');
    font-display: swap;
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
  padding-top: 2rem;

  h1 {
    position: relative;
    color: ${primary}; /* e.g. #0ff */
    font-size: clamp(2rem, 6vw, 3rem);
    letter-spacing: 0.1em;
    height: clamp(2rem, 6vw, 3rem);
    margin: 1rem 0;
    height: 3rem;

    /* sharp cyan stroke */
    -webkit-text-stroke: 1px rgba(0, 255, 255, 0.8);

    /* neon glow layers: cyan close in, then purple further out */
    text-shadow:
      /* cyan glows */
      0 0 3px rgba(0, 255, 255, 0.8),
      0 0 5px rgba(0, 255, 255, 0.6),
      0 0 10px rgba(0, 255, 255, 0.4),
      0 0 20px rgba(0, 255, 255, 0.2),
      /* purple outer glow */ 0 0 20px rgba(0, 0, 255, 0.8),
      0 0 30px rgba(0, 0, 255, 0.3),
      0 0 40px rgba(0, 0, 255, 0.2);
  }

  @media (max-height: 800px) {
    padding-top: 1rem;
    
    h1 {
      font-size: clamp(1.8rem, 5.5vw, 2.5rem);
      height: 2.5rem;
      margin: 0.75rem 0;
    }
  }

  @media (max-height: 600px) {
    padding-top: 0.5rem;
    
    h1 {
      font-size: clamp(1.4rem, 4.5vw, 1.8rem);
      height: 1.8rem;
      margin: 0.5rem 0;
    }
  }

  @media (max-height: 450px) {
    padding-top: 0.5rem;
    
    h1 {
      font-size: clamp(1rem, 3.5vw, 1.2rem);
      height: 1.2rem;
      margin: 0.25rem 0;
    }
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
  transform: translateX(-50%);
  height: auto;
  pointer-events: none;
  z-index: -1;
  animation: ${drift} 40s ease-in-out infinite;

  @media (max-height: 1600px) {
    width: 130%;
    top: -100vh;
    left: 50%;
  }
  @media (max-height: 1024px) {
    width: 130%;
    top: -100vh;
    left: 50%;
  }

  @media (max-height: 600px) {
    width: 110%;
    top: -100vh;
    left: 60%;
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
  font-family: 'mega', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;

  &:hover {
    color: ${secondary};
    border-color: ${secondary};
    background: rgba(255, 255, 255, 0.05);
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

  &:hover {
    color: ${secondary};
  }
`;

export const FilterButton = styled.button`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${darkgrey};
  background: transparent;
  border: none;
  padding: 0.3rem;
  font-family: 'mega', sans-serif;
  font-size: 0.8rem;
  transition: all 0.2s ease;

  &:hover {
    color: ${secondary};
    background: rgba(255, 255, 255, 0.05);
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
`;

export const FilterDropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(${p => p.$isOpen ? '55px' : '0'});
  min-width: 200px;
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid ${darkgrey};
  border-radius: 8px 8px 8px 8px;
  opacity: ${p => p.$isOpen ? 1 : 0};
  visibility: ${p => p.$isOpen ? 'visible' : 'hidden'};
  transition: all 0.2s ease;
  z-index: 100;
  backdrop-filter: blur(8px);
`;

export const FilterOption = styled.button`
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: ${darkgrey};
  font-family: 'mega', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    color: ${secondary};
    background: rgba(255, 255, 255, 0.05);
  }

  &:first-child {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

export const SearchBar = styled.div`
  position: absolute;
  color: ${darkgrey};
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 0;

  @media (max-height: 800px) {
    padding: 1.5rem 0;
  }

  @media (max-height: 600px) {
    padding: 0.75rem 0;
  }

  @media (max-height: 450px) {
    padding: 0.25rem 0;
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
  outline: solid 2px ${darkgrey};
  overflow: hidden;
  transition: width 0.3s ease;

  &:hover,
  &:focus-within {
    width: 300px;
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
`;

export const SearchInput = styled.input`
  flex: 1;
  height: 100%;
  padding: 0 0.75rem;
  padding-right: 2rem; /* room for clear button */
  border: none;
  font-size: 1rem;
  background: transparent;
  color: ${darkgrey};
  font-family: "mega", sans-serif;

  &::placeholder {
    color: ${darkgrey};
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
  color: ${darkgrey};
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
