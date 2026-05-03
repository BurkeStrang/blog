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
  box-sizing: border-box;

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
    width: min(520px, calc(100vw - 5rem));
    max-height: calc(100vh - 10rem);
    border-radius: 12px;
  }

  @media (max-width: 480px) {
    width: min(360px, calc(100vw - 3rem));
    max-height: calc(100vh - 8rem);
    padding: 1.1rem;
    border-radius: 10px;
  }

  @media (max-width: 360px) {
    width: calc(100vw - 2.5rem);
    padding: 0.9rem;
  }
`;

const AboutSection = styled.section`
  max-width: 680px;
  min-height: 100%;
  line-height: 1.65;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 0 auto;
  padding: 0.5rem;
  box-sizing: border-box;

  @media (max-width: 768px) {
    gap: 0.85rem;
    justify-content: flex-start;
    padding: 0.25rem 0;
  }
`;

const RoleLabel = styled.div<{ $isDark: boolean }>`
  color: ${({ $isDark }) => ($isDark ? "#7ff" : "#006f6f")};
  font-size: 0.82rem;
  line-height: 1.3;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0;
  opacity: 0.9;
`;

const LeadText = styled.p<{ $isDark: boolean }>`
  color: ${({ $isDark }) => ($isDark ? "#f3f7f7" : "#152626")};
  font-size: 1.08rem;
  line-height: 1.65;
  text-align: center;
  max-width: 620px;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 0.98rem;
    line-height: 1.55;
    max-width: 38ch;
  }

  @media (max-width: 480px) {
    font-size: 0.92rem;
    max-width: 31ch;
  }
`;

const BodyText = styled.p<{ $isDark: boolean }>`
  font-size: 0.95rem;
  line-height: 1.7;
  color: ${({ $isDark }) => ($isDark ? "#d5dddd" : "#263838")};
  text-align: center;
  max-width: 600px;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 0.86rem;
    line-height: 1.6;
    max-width: 36ch;
  }

  @media (max-width: 480px) {
    max-width: 30ch;
  }
`;

const FocusList = styled.ul<{ $isDark: boolean }>`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  list-style: none;
  padding: 0;
  margin: 0.25rem 0;
  max-width: 620px;

  li {
    color: ${({ $isDark }) => ($isDark ? "#dcf8f8" : "#143333")};
    background: ${({ $isDark }) =>
      $isDark ? "rgba(0, 255, 255, 0.08)" : "rgba(0, 122, 122, 0.08)"};
    border: 1px solid
      ${({ $isDark }) =>
        $isDark ? "rgba(0, 255, 255, 0.2)" : "rgba(0, 122, 122, 0.2)"};
    border-radius: 8px;
    padding: 0.45rem 0.65rem;
    font-size: 0.78rem;
    line-height: 1.2;
    white-space: nowrap;
  }

  @media (max-width: 480px) {
    gap: 0.4rem;

    li {
      font-size: 0.72rem;
      padding: 0.4rem 0.55rem;
    }
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
  font-size: 0.88rem;
  color: ${({ $isDark }) => ($isDark ? "#0ff" : "#007a7a")};
  text-align: left;
  display: flex;
  align-items: flex-start;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 0.85rem;
    min-height: auto;
    font-size: 0.72rem;
    margin: 0.75rem auto 0;
  }

  @media (max-width: 480px) {
    padding: 0.6rem;
    min-height: 100px;
    font-size: 0.66rem;
  }
`;

const Cursor = styled.span<{ $isDark: boolean }>`
  animation: blink 1s step-end infinite;
  color: ${({ $isDark }) => ($isDark ? "#0ff" : "#007a7a")};
`;

const About: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const codeLines = [
    "const work = {",
    "  focus: 'reliable web systems',",
    "  stack: ['React', 'Go', 'Three.js'],",
    "  priority: 'clear, maintainable code',",
    "};",
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
            <AboutSection>
              <RoleLabel $isDark={isDark}>Software Developer</RoleLabel>

              <LeadText $isDark={isDark}>
                I build interactive web experiences and backend services with a
                focus on performance, reliability, and readable systems.
              </LeadText>

              <BodyText $isDark={isDark}>
                This site is where I document the engineering work I am
                exploring, from Three.js interfaces to Go services, deployment,
                caching, and observability.
              </BodyText>

              <FocusList $isDark={isDark} aria-label="Areas of focus">
                <li>Frontend systems</li>
                <li>API design</li>
                <li>3D web interfaces</li>
                <li>Cloud operations</li>
              </FocusList>

              <CodeSnippet $isDark={isDark}>
                <pre style={{ margin: 0, fontFamily: "inherit" }}>
                  {displayedCode}
                  {currentIndex < fullCode.length && (
                    <Cursor $isDark={isDark}>|</Cursor>
                  )}
                </pre>
              </CodeSnippet>
            </AboutSection>
          </ContentBox>
        </FixedContent>
      </Page>
    </>
  );
};

export default About;
