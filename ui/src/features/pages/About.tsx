import React, { useLayoutEffect } from "react";
import { Page, Header, Content } from "../../shared/theme/GlobalStyles";
import { tokens } from "../../shared/theme";
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

const ContentBox = styled.div<{ $isDark: boolean }>`
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
  max-width: 620px;
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
    justify-content: flex-start;
    padding: 0.15rem 0;
    min-height: auto;
  }

  @media (max-width: 480px) {
    padding: 0;
  }

  /* Landscape phones and short laptop windows — tightest layout. */
  @media (max-height: 500px) {
    padding: 0;
  }
`;

/* The intro is the only centered block; everything below it reads as prose. */
const Intro = styled.div`
  align-self: center;
  text-align: center;
  margin-bottom: 1.4rem;

  @media (max-width: 768px) {
    margin-bottom: 0.8rem;
  }

  @media (max-height: 500px) {
    margin-bottom: 0.5rem;
  }
`;

const Greeting = styled.h2`
  font-family: var(--font-family-display);
  font-size: clamp(1.6rem, 3.4vw, 2.3rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--color-readable-lightgrey);
  margin: 0;

  @media (max-width: 480px) {
    font-size: 1.45rem;
  }
`;

const Tagline = styled.p`
  font-size: 1rem;
  font-style: italic;
  line-height: 1.5;
  color: var(--color-accent);
  opacity: 0.9;
  margin: 0.45rem 0 0;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin-top: 0.3rem;
  }

  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
`;

const BodyText = styled.p`
  font-size: 1.125rem;
  line-height: 1.8;
  color: var(--color-readable-lightgrey);
  text-align: left;
  margin: 0 0 1rem;

  &:last-of-type {
    margin-bottom: 0;
  }

  @media (max-width: 768px) {
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 0.7rem;
  }

  @media (max-width: 480px) {
    font-size: 0.88rem;
    line-height: 1.5;
    margin-bottom: 0.6rem;
  }

  @media (max-height: 500px) {
    font-size: 0.85rem;
    line-height: 1.45;
    margin-bottom: 0.45rem;
  }
`;

const LinkRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.4rem;
  margin-top: 1.5rem;

  a {
    font-size: 0.95rem;
    color: var(--color-md-link);
    text-decoration: none;
    border-bottom: 1px solid var(--color-md-link);
    transition: color 0.2s ease, border-color 0.2s ease;
  }

  a:hover {
    color: var(--color-md-link-hover);
    border-bottom-color: var(--color-md-link-hover);
  }

  @media (max-width: 768px) {
    gap: 1.1rem;
    margin-top: 1rem;

    a {
      font-size: 0.88rem;
    }
  }

  @media (max-height: 500px) {
    margin-top: 0.6rem;
  }
`;

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
              <Intro>
                <Greeting>Hey, I&apos;m Burke!</Greeting>
                <Tagline>
                  always tinkering and thinking about how to make things work better
                </Tagline>
              </Intro>

              <BodyText>
                I build interactive web experiences and backend services, with a
                focus on performance, reliability, and systems that are still
                readable a year later.
              </BodyText>

              <BodyText>
                Day to day that means frontend systems, API design, and cloud
                operations — the whole path from a React interface down through
                services to the infrastructure they run on.
              </BodyText>

              <BodyText>
                This site is where I document the engineering work I am
                exploring: UI, deployment, caching, compilers, GPU rendering,
                AI, and observability. It runs on the same stack it writes
                about — React and Three.js on the front, .NET on the back.
              </BodyText>

              <LinkRow>
                <a
                  href="https://github.com/BurkeStrang"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
                <a
                  href="https://www.linkedin.com/in/burkestrang"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </a>
              </LinkRow>
            </AboutSection>
          </ContentBox>
        </FixedContent>
      </Page>
    </>
  );
};

export default About;
