import React, { useState, useEffect, useLayoutEffect } from "react";
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
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    z-index: auto;
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
    margin-top: 0.75rem;
    height: calc(100vh - 5.25rem);
    overflow-y: auto;
    padding-bottom: 1rem;
  }

  @media (max-width: 480px) {
    margin-top: 0.25rem;
    height: calc(100vh - 4.5rem);
    padding-bottom: 0.75rem;
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
      ? "rgba(1, 1, 1, 0.66)"
      : "rgba(230, 230, 230, 0.68)"};
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-radius: 8px;
  padding: clamp(1.4rem, 3vw, 2.4rem);
  overflow-y: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }

  box-shadow: ${({ $isDark }) =>
    $isDark
      ? "0 0 0 1px rgba(0, 220, 200, 0.06)"
      : "0 0 0 1px rgba(0, 120, 120, 0.08)"};
  border: 1px solid
    ${({ $isDark }) =>
      $isDark ? "var(--color-md-blockquote-border)" : "rgba(0, 0, 0, 0.12)"};

  @media (max-width: 768px) {
    position: relative;
    top: auto;
    left: auto;
    transform: none;
    width: min(520px, calc(100vw - 5rem));
    max-height: none;
    border-radius: 12px;
    margin: 0 auto;
  }

  @media (max-width: 480px) {
    width: min(360px, calc(100vw - 2rem));
    padding: 0.95rem;
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
  font-family: var(--font-family);
  line-height: 1.8;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
  margin: 0 auto;
  padding: 0.5rem 0;
  box-sizing: border-box;

  @media (max-width: 768px) {
    gap: 0.85rem;
    justify-content: flex-start;
    padding: 0.25rem 0;
    min-height: auto;
  }

  @media (max-width: 480px) {
    gap: 0.6rem;
    padding: 0;
  }
`;

const RoleLabel = styled.div<{ $isDark: boolean }>`
  color: ${({ $isDark }) =>
    $isDark
      ? "color-mix(in srgb, var(--color-accent) 65%, black)"
      : "var(--color-accent)"};
  font-family: var(--font-family-display);
  font-size: 1.22rem;
  font-weight: 700;
  line-height: 1.3;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.9;
  padding: 0;
  margin: 0 0 0.4rem 0;
`;

const LeadText = styled.p<{ $isDark: boolean }>`
  color: var(--color-readable-lightgrey);
  font-size: 1.125rem;
  line-height: 1.8;
  text-align: left;
  max-width: 620px;
  margin: 1.2rem 0;

  @media (max-width: 768px) {
    font-size: 0.98rem;
    line-height: 1.55;
    max-width: 38ch;
  }

  @media (max-width: 480px) {
    font-size: 0.92rem;
    max-width: 31ch;
    line-height: 1.45;
    margin: 0.7rem 0;
  }
`;

const BodyText = styled.p<{ $isDark: boolean }>`
  font-size: 1.125rem;
  line-height: 1.8;
  color: var(--color-readable-lightgrey);
  text-align: left;
  max-width: 600px;
  margin: 1.2rem 0;

  @media (max-width: 768px) {
    font-size: 0.92rem;
    line-height: 1.6;
    max-width: 36ch;
  }

  @media (max-width: 480px) {
    max-width: 30ch;
    line-height: 1.45;
    margin: 0.7rem 0;
  }
`;

const FocusList = styled.ul<{ $isDark: boolean }>`
  display: block;
  list-style: disc;
  padding-left: 2rem;
  margin: 1.5rem 0;
  max-width: 620px;
  text-align: left;

  li {
    color: var(--color-readable-lightgrey);
    padding: 0;
    font-size: 1.05rem;
    line-height: 1.6;
    margin: 0.5rem 0;
    white-space: normal;
  }

  li::marker {
    color: var(--color-primary);
  }

  @media (max-width: 480px) {
    padding-left: 1.25rem;
    margin: 0.85rem 0;

    li {
      font-size: 0.9rem;
      margin: 0.3rem 0;
    }
  }
`;

const CodeSnippet = styled.div<{ $isDark: boolean }>`
  background: ${({ $isDark }) =>
    $isDark ? "var(--color-md-code-bg)" : "rgba(255, 255, 255, 0.72)"};
  border: 1px solid var(--color-md-code-border);
  border-radius: 8px;
  padding: 1rem;
  margin: 1.5rem 0 0;
  max-width: 500px;
  min-width: 0;
  width: 100%;
  min-height: 180px;
  height: 180px;
  font-family: var(--font-family-mono);
  font-size: 0.95rem;
  color: var(--color-md-code-text);
  text-align: left;
  display: flex;
  align-items: flex-start;
  box-sizing: border-box;
  box-shadow:
    inset 0 1px 0 var(--color-md-code-glass-highlight),
    0 0 0 1px var(--color-md-code-inset),
    0 18px 40px rgba(0, 0, 0, 0.16);

  @media (max-width: 768px) {
    padding: 0.85rem;
    min-height: 120px;
    height: 120px;
    font-size: 0.72rem;
    margin: 0.75rem auto 0;
  }

  @media (max-width: 480px) {
    padding: 0.6rem;
    min-height: 84px;
    height: 84px;
    font-size: 0.66rem;
    margin-top: 0.4rem;
  }
`;

const Cursor = styled.span<{ $isDark: boolean }>`
  animation: blink 1s step-end infinite;
  color: var(--color-primary);
`;

const codeLines = [
  "const work = {",
  "  focus: 'reliable web systems',",
  "  stack: ['React', 'Go', 'C#', 'SQL'],",
  "  priority: 'clear, maintainable code',",
  "};",
];

const fullCode = codeLines.join("\n");

const AnimatedCodeSnippet = React.memo(function AnimatedCodeSnippet({ isDark }: { isDark: boolean }) {
  const [displayedCode, setDisplayedCode] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);

  useEffect(() => {
    if (currentIndex >= fullCode.length) return;

    const typingSpeed = isMobile ? 20 : 30;
    const timeout = setTimeout(() => {
      setDisplayedCode(fullCode.slice(0, currentIndex + 1));
      setCurrentIndex(currentIndex + 1);
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [currentIndex, isMobile]);

  return (
    <CodeSnippet $isDark={isDark}>
      <pre style={{ margin: 0, fontFamily: "inherit" }}>
        {displayedCode}
        {currentIndex < fullCode.length && (
          <Cursor $isDark={isDark}>|</Cursor>
        )}
      </pre>
    </CodeSnippet>
  );
});

const About: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useLayoutEffect(() => {
    document.documentElement.classList.add("about-page");
    return () => document.documentElement.classList.remove("about-page");
  }, []);

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
                exploring, UI to Go/C# services, deployment,
                caching, Compilers, GPU rendering, AI, and observability.
              </BodyText>

              <FocusList $isDark={isDark} aria-label="Areas of focus">
                <li>Frontend systems</li>
                <li>API design</li>
                <li>Cloud operations</li>
              </FocusList>

              <AnimatedCodeSnippet isDark={isDark} />
            </AboutSection>
          </ContentBox>
        </FixedContent>
      </Page>
    </>
  );
};

export default About;
