import React, { useState, useEffect, useLayoutEffect } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import { Page, Header, Content } from "../../shared/theme/GlobalStyles";
import { tokens } from "../../shared/theme";
import { useTheme } from "../../shared/contexts/ThemeContext";
import styled from "styled-components";

SyntaxHighlighter.registerLanguage("javascript", javascript);

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
  top: 47%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(820px, calc(100vw - 12rem));
  max-height: calc(100vh - 6rem);
  box-sizing: border-box;

  background: ${({ $isDark }) =>
    $isDark
      ? "rgba(1, 1, 1, 0.66)"
      : "rgba(230, 230, 230, 0.68)"};
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-radius: 8px;
  padding: clamp(1.15rem, 3vw, 2.8rem);
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
      $isDark ? tokens.md.blockquote.border : "rgba(0, 0, 0, 0.12)"};

  @media (max-width: 768px) {
    position: relative;
    top: auto;
    left: auto;
    transform: none;
    width: 100%;
    max-width: 520px;
    max-height: none;
    border-radius: 12px;
    margin: 0 auto;
  }

  @media (max-width: 480px) {
    max-width: 360px;
    padding: 0.8rem;
    border-radius: 10px;
  }

  @media (max-width: 360px) {
    max-width: none;
    padding: 0.75rem;
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
  padding: 0.4rem 0;
  box-sizing: border-box;

  @media (max-width: 768px) {
    gap: 0.4rem;
    justify-content: flex-start;
    padding: 0.15rem 0;
    min-height: auto;
  }

  @media (max-width: 480px) {
    gap: 0.3rem;
    padding: 0;
  }

  /* Landscape phones and short laptop windows — tightest layout. */
  @media (max-height: 500px) {
    gap: 0.25rem;
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
  margin: 0 0 0.3rem 0;
`;

const LeadText = styled.p<{ $isDark: boolean }>`
  color: var(--color-readable-lightgrey);
  font-size: 1.125rem;
  line-height: 1.8;
  text-align: left;
  max-width: 620px;
  margin: 1rem 0;

  @media (max-width: 768px) {
    font-size: 0.95rem;
    line-height: 1.5;
    max-width: 38ch;
    margin: 0.4rem 0;
  }

  @media (max-width: 480px) {
    font-size: 0.88rem;
    max-width: 31ch;
    line-height: 1.4;
    margin: 0.3rem 0;
  }

  @media (max-height: 500px) {
    font-size: 0.85rem;
    line-height: 1.35;
    margin: 0.2rem 0;
  }
`;

const BodyText = styled.p<{ $isDark: boolean }>`
  font-size: 1.125rem;
  line-height: 1.8;
  color: var(--color-readable-lightgrey);
  text-align: left;
  max-width: 600px;
  margin: 1rem 0;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    line-height: 1.5;
    max-width: 36ch;
    margin: 0.35rem 0;
  }

  @media (max-width: 480px) {
    font-size: 0.85rem;
    max-width: 30ch;
    line-height: 1.4;
    margin: 0.3rem 0;
  }

  @media (max-height: 500px) {
    font-size: 0.82rem;
    line-height: 1.35;
    margin: 0.2rem 0;
  }
`;

const FocusList = styled.ul<{ $isDark: boolean }>`
  display: block;
  list-style: disc;
  padding-left: 1.65rem;
  margin: 1.2rem 0;
  max-width: 620px;
  text-align: left;

  li {
    color: var(--color-readable-lightgrey);
    padding: 0;
    font-size: 1.05rem;
    line-height: 1.6;
    margin: 0.4rem 0;
    white-space: normal;
  }

  li::marker {
    color: var(--color-primary);
  }

  @media (max-width: 768px) {
    margin: 0.4rem 0;
    padding-left: 1.4rem;

    li {
      font-size: 0.9rem;
      line-height: 1.45;
      margin: 0.2rem 0;
    }
  }

  @media (max-width: 480px) {
    padding-left: 1rem;
    margin: 0.3rem 0;

    li {
      font-size: 0.85rem;
      margin: 0.15rem 0;
    }
  }

  @media (max-height: 500px) {
    margin: 0.2rem 0;

    li {
      font-size: 0.8rem;
      line-height: 1.35;
      margin: 0.1rem 0;
    }
  }
`;

const CodeSnippet = styled.div`
  position: relative;
  background: ${tokens.md.code.bg};
  backdrop-filter: blur(24px) saturate(145%);
  -webkit-backdrop-filter: blur(24px) saturate(145%);
  border-radius: 12px;
  box-shadow: 0 10px 26px ${tokens.md.code.shadow};
  padding: 1.6rem 1.2rem 1.2rem;
  margin: 0.4rem 0 0;
  max-width: 440px;
  min-width: 0;
  width: 100%;
  min-height: 170px;
  font-family: var(--font-family-mono);
  font-size: 0.95rem;
  line-height: 1.6;
  color: ${tokens.md.code.text};
  text-align: left;
  display: flex;
  align-items: flex-start;
  box-sizing: border-box;

  pre {
    width: 100%;
    min-width: 0;
    line-height: inherit;
    white-space: pre;
    overflow-x: auto;
  }

  .comment, .prolog, .doctype, .cdata, .token-comment {
    color: ${tokens.md.code.comment};
    font-style: italic;
  }
  .function, .function-name, .token-function {
    color: ${tokens.md.code.function};
  }
  .keyword, .atrule, .important, .token-keyword {
    color: ${tokens.md.code.keyword};
  }
  .builtin { color: ${tokens.md.code.builtin}; }
  .boolean, .constant, .number, .unit, .token-number {
    color: ${tokens.md.code.number};
  }
  .punctuation, .token-punctuation {
    color: ${tokens.md.code.punctuation};
  }
  .operator, .token-operator {
    color: ${tokens.md.code.operator};
  }
  .property, .attr-name, .symbol, .token-property {
    color: ${tokens.md.code.property};
  }
  .string, .attr-value, .char, .template-string, .token-string {
    color: ${tokens.md.code.string};
  }
  .class-name, .maybe-class-name {
    color: ${tokens.md.code.type};
  }
  .selector, .tag, .token-tag {
    color: ${tokens.md.code.tag};
  }
  .parameter, .variable {
    color: ${tokens.md.code.variable};
  }

  @media (max-width: 768px) {
    padding: 1.2rem 1rem 0.85rem;
    min-height: 0;
    font-size: 0.76rem;
    line-height: 1.4;
    margin: 0.2rem auto 0;
  }

  @media (max-width: 480px) {
    padding: 1.1rem 0.85rem 0.7rem;
    min-height: 0;
    font-size: 0.6rem;
    line-height: 1.35;
    margin-top: 0.15rem;
    border-radius: 6px;
  }

  @media (max-width: 390px) {
    padding: 0.95rem 0.7rem 0.6rem;
    border-radius: 8px;
  }

  @media (max-height: 500px) {
    padding: 1rem 0.85rem 0.65rem;
    min-height: 0;
    font-size: 0.7rem;
    line-height: 1.3;
    margin-top: 0.1rem;
  }
`;

const CodeTabRow = styled.div`
  position: absolute;
  top: calc(-1.7rem + 1px);
  right: 1.25rem;
  display: inline-flex;
  align-items: flex-end;
  z-index: 2;
`;

const CodeTabFlare = styled.div<{ $side: "left" | "right" }>`
  width: 12px;
  height: 12px;
  margin-bottom: -4px;
  background: ${tokens.md.code.bg};
  ${({ $side }) =>
    $side === "left"
      ? `margin-right: -3px;
         -webkit-mask: radial-gradient(circle at 0 0, transparent 8px, black 8.5px);
         mask: radial-gradient(circle at 0 0, transparent 8px, black 8.5px);`
      : `margin-left: -3px;
         -webkit-mask: radial-gradient(circle at 100% 0, transparent 8px, black 8.5px);
         mask: radial-gradient(circle at 100% 0, transparent 8px, black 8.5px);`}
`;

const CodeTab = styled.div`
  height: 1.7rem;
  padding: 0 1.6rem;
  display: flex;
  align-items: center;
  background: ${tokens.md.code.bg};
  border-radius: 8px 8px 0 0;
  font-family: var(--font-family-mono);
  font-size: 0.72rem;
  color: rgba(176, 179, 198, 0.75);
  text-transform: uppercase;
  letter-spacing: 0.06em;
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
    <CodeSnippet>
      <CodeTabRow>
        <CodeTabFlare $side="left" />
        <CodeTab>wk</CodeTab>
        <CodeTabFlare $side="right" />
      </CodeTabRow>
      <pre style={{ margin: 0, fontFamily: "inherit" }}>
        <SyntaxHighlighter
          language="javascript"
          useInlineStyles={false}
          PreTag="span"
          CodeTag="span"
        >
          {displayedCode || " "}
        </SyntaxHighlighter>
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
          <h1>ABOUTME</h1>
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
