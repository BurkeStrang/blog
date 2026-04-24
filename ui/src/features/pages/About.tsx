import React, { useState, useEffect } from "react";
import { Page, Header, Content } from "../../shared/theme/GlobalStyles";
import { useTheme } from "../../shared/contexts/ThemeContext";
import styled from "styled-components";

const FixedHeader = styled(Header)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: transparent;
  backdrop-filter: none;
  border-bottom: none;

  @media (max-width: 768px) {
    padding-top: 1.5rem;
  }

  @media (max-width: 480px) {
    padding-top: 1rem;
  }
`;

const FixedContent = styled(Content)`
  margin-top: 8rem;
  height: calc(100vh - 8rem);
  overflow: hidden;

  @media (max-width: 768px) {
    margin-top: 6rem;
    height: calc(100vh - 6rem);
  }
`;

const float = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    25% { transform: translateY(-10px) rotate(5deg); }
    75% { transform: translateY(-5px) rotate(-5deg); }
  }
`;

const glowDark = `
  @keyframes glowDark {
    0%, 100% { box-shadow: 0 0 2px rgba(0, 255, 255, 0.15), 0 0 4px rgba(0, 255, 255, 0.08); }
    50% { box-shadow: 0 0 4px rgba(0, 255, 255, 0.2), 0 0 6px rgba(0, 255, 255, 0.12); }
  }
`;

const glowLight = `
  @keyframes glowLight {
    0%, 100% { box-shadow: 0 0 2px rgba(0, 122, 122, 0.2), 0 0 4px rgba(0, 122, 122, 0.1); }
    50% { box-shadow: 0 0 4px rgba(0, 122, 122, 0.3), 0 0 6px rgba(0, 122, 122, 0.15); }
  }
`;

const blink = `
  @keyframes blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
`;

const ContentBox = styled.div<{ $isDark: boolean }>`
  ${float}
  ${glowDark}
  ${glowLight}
  ${blink}

  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(940px, calc(100vw - 8rem));
  max-height: calc(100vh - 6rem);

  background: ${({ $isDark }) =>
    $isDark
      ? "linear-gradient(135deg, rgba(26, 35, 50, 0.55) 0%, rgba(45, 74, 90, 0.65) 50%, rgba(30, 58, 66, 0.55) 100%)"
      : "linear-gradient(135deg, rgba(240, 248, 250, 0.6) 0%, rgba(220, 240, 245, 0.7) 50%, rgba(230, 245, 248, 0.6) 100%)"};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 1.5rem;
  overflow-y: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }

  box-shadow: ${({ $isDark }) =>
    $isDark
      ? "0 8px 32px rgba(0, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
      : "0 8px 32px rgba(0, 122, 122, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)"};
  border: 1px solid
    ${({ $isDark }) =>
      $isDark ? "rgba(0, 255, 255, 0.3)" : "rgba(0, 122, 122, 0.3)"};
  animation: ${({ $isDark }) => ($isDark ? "glowDark" : "glowLight")} 2s
    ease-in-out infinite;

  @media (max-width: 768px) {
    width: calc(100vw - 6rem);
    max-height: calc(100vh - 10rem);
  }

  @media (max-width: 480px) {
    width: calc(100vw - 2rem);
    max-height: calc(100vh - 8rem);
    padding: 1rem;
  }
`;

const CoffeeIcon = styled.div`
  font-size: clamp(3rem, 8vw, 5rem);
  animation: float 3s ease-in-out infinite;
  margin-bottom: 1rem;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));

  @media (max-width: 768px) {
    font-size: clamp(1.5rem, 10vw, 3.5rem);
    margin-bottom: 0.75rem;
  }
`;

const CodeSnippet = styled.div<{ $isDark: boolean }>`
  background: ${({ $isDark }) =>
    $isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.06)"};
  border: 1px solid
    ${({ $isDark }) =>
      $isDark ? "rgba(0, 255, 255, 0.3)" : "rgba(0, 122, 122, 0.3)"};
  border-radius: 8px;
  padding: 1rem;
  margin: 1.5rem auto;
  max-width: 500px;
  min-width: 0;
  width: 100%;
  min-height: 150px;
  font-size: clamp(0.75rem, 2vw, 0.9rem);
  color: ${({ $isDark }) => ($isDark ? "#0ff" : "#007a7a")};
  text-align: left;
  display: flex;
  align-items: flex-start;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 1rem;
    min-height: auto;
    font-size: 0.6rem;
    margin: 1rem auto;
  }

  @media (max-width: 480px) {
    padding: 0.6rem;
    min-height: 100px;
    font-size: 0.65rem;
  }
`;

const BodyText = styled.p<{ $isDark: boolean }>`
  font-size: clamp(0.85rem, 2.5vw, 1.1rem);
  color: ${({ $isDark }) => ($isDark ? "#e0e0e0" : "#1a2a2a")};
  text-align: center;
  max-width: 500px;
  margin-bottom: 1rem;
  padding: 0 1rem;
`;

const Cursor = styled.span<{ $isDark: boolean }>`
  animation: blink 1s step-end infinite;
  color: ${({ $isDark }) => ($isDark ? "#0ff" : "#007a7a")};
`;

const About: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const codeLines = [
    "while (coffee.available) {",
    "  code();",
    "  learn();",
    "  writeAboutIt();",
    "}",
    "// TODO: Add sleep functionality",
  ];

  const fullCode = codeLines.join("\n");
  const [displayedCode, setDisplayedCode] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("about-page");
    return () => document.documentElement.classList.remove("about-page");
  }, []);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);

  useEffect(() => {
    if (currentIndex < fullCode.length) {
      const typingSpeed = isMobile ? 20 : 30;
      const timeout = setTimeout(() => {
        setDisplayedCode(fullCode.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, typingSpeed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, fullCode, isMobile]);

  return (
    <>
      <Page style={{ overflow: "hidden" }}>
        <FixedHeader>
          <h1>ABOUT ME</h1>
        </FixedHeader>
        <FixedContent>
          <ContentBox $isDark={isDark}>
            <section
              style={{
                maxWidth: "100%",
                lineHeight: "1.8",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                padding: "0.5rem",
              }}
            >
              <CoffeeIcon>☕</CoffeeIcon>

              <BodyText $isDark={isDark}>
                Developer. Coffee-dependent. Amateur sleep schedule.
              </BodyText>

              <BodyText $isDark={isDark} style={{ overflow: "hidden" }}>
                Too tired to overthink. Just tired enough to ship.
              </BodyText>

              <CodeSnippet $isDark={isDark}>
                <pre style={{ margin: 0, fontFamily: "inherit" }}>
                  {displayedCode}
                  {currentIndex < fullCode.length && (
                    <Cursor $isDark={isDark}>|</Cursor>
                  )}
                </pre>
              </CodeSnippet>
            </section>
          </ContentBox>
        </FixedContent>
      </Page>
    </>
  );
};

export default About;
