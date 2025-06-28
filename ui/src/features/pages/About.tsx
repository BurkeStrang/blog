import React from "react";
import { Page, Header, Content, Cloud } from "../../shared/theme/GlobalStyles";
import cloudImg from "../../assets/textures/darkcloud.avif";

const About: React.FC = () => (
  <>
    <Page>
      <Header>
        <Cloud src={cloudImg} alt="" />
        <h1>ABOUT ME</h1>
      </Header>
      <Content>
        <div style={{
          background: 'linear-gradient(135deg, rgba(26, 35, 50, 0.3) 0%, rgba(45, 74, 90, 0.4) 50%, rgba(30, 58, 66, 0.3) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '1.5rem',
          margin: '1rem',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          '@media (max-width: 768px)': {
            padding: '1rem',
            margin: '0.5rem',
            borderRadius: '12px'
          }
        }}>
          <section style={{ maxWidth: '100%', lineHeight: '1.5' }}>
            <h2 style={{ 
              color: '#00ffff', 
              marginBottom: '1rem', 
              fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
              textAlign: 'center'
            }}>What I Love About Software Engineering</h2>
            
            <p style={{ 
              marginBottom: '1rem', 
              fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)', 
              color: '#e0e0e0',
              textAlign: 'center'
            }}>
              Software engineering feeds my obsession with solving puzzles and understanding systems at their deepest level. 
              Every bug is a mystery to unravel, every optimization is a puzzle to solve.
            </p>

            <p style={{ 
              marginBottom: '1.5rem', 
              fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)', 
              color: '#e0e0e0',
              textAlign: 'center'
            }}>
              I&apos;m driven by the need to understand how things work beneath the surface - from JavaScript engines 
              to rendering pipelines. The satisfaction of peeling back layers of abstraction and seeing the elegant 
              logic underneath is what keeps me coding late into the night.
            </p>

            <h2 style={{ 
              color: '#00ffff', 
              marginBottom: '1rem', 
              marginTop: '1.5rem', 
              fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
              textAlign: 'center'
            }}>What I Write About</h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '1rem', 
              marginBottom: '1rem' 
            }}>
              <div style={{ 
                background: 'rgba(0, 255, 255, 0.08)', 
                backdropFilter: 'blur(5px)',
                padding: 'clamp(0.75rem, 3vw, 1rem)', 
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 255, 0.2)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ 
                  color: '#88ddff', 
                  marginBottom: '0.5rem', 
                  fontSize: 'clamp(0.9rem, 3vw, 1rem)' 
                }}>🚀 Performance & Optimization</h3>
                <p style={{ 
                  fontSize: 'clamp(0.75rem, 2.2vw, 0.85rem)', 
                  color: '#d0d0d0', 
                  lineHeight: '1.4',
                  margin: 0
                }}>
                  Unraveling the mysteries of web performance - from V8 optimizations to rendering pipeline deep-dives.
                </p>
              </div>

              <div style={{ 
                background: 'rgba(0, 255, 255, 0.08)', 
                backdropFilter: 'blur(5px)',
                padding: 'clamp(0.75rem, 3vw, 1rem)', 
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 255, 0.2)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ 
                  color: '#88ddff', 
                  marginBottom: '0.5rem', 
                  fontSize: 'clamp(0.9rem, 3vw, 1rem)' 
                }}>🎨 Interactive 3D Web Experiences</h3>
                <p style={{ 
                  fontSize: 'clamp(0.75rem, 2.2vw, 0.85rem)', 
                  color: '#d0d0d0', 
                  lineHeight: '1.4',
                  margin: 0
                }}>
                  Exploring the depths of WebGL, Three.js, and the mathematical beauty behind 3D graphics.
                </p>
              </div>

              <div style={{ 
                background: 'rgba(0, 255, 255, 0.08)', 
                backdropFilter: 'blur(5px)',
                padding: 'clamp(0.75rem, 3vw, 1rem)', 
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 255, 0.2)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ 
                  color: '#88ddff', 
                  marginBottom: '0.5rem', 
                  fontSize: 'clamp(0.9rem, 3vw, 1rem)' 
                }}>⚡ Deep System Understanding</h3>
                <p style={{ 
                  fontSize: 'clamp(0.75rem, 2.2vw, 0.85rem)', 
                  color: '#d0d0d0', 
                  lineHeight: '1.4',
                  margin: 0
                }}>
                  Dissecting how modern frameworks work internally - from React&apos;s reconciliation to TypeScript&apos;s type system.
                </p>
              </div>

              <div style={{ 
                background: 'rgba(0, 255, 255, 0.08)', 
                backdropFilter: 'blur(5px)',
                padding: 'clamp(0.75rem, 3vw, 1rem)', 
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 255, 0.2)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ 
                  color: '#88ddff', 
                  marginBottom: '0.5rem', 
                  fontSize: 'clamp(0.9rem, 3vw, 1rem)' 
                }}>🔧 Problem-Solving Journeys</h3>
                <p style={{ 
                  fontSize: 'clamp(0.75rem, 2.2vw, 0.85rem)', 
                  color: '#d0d0d0', 
                  lineHeight: '1.4',
                  margin: 0
                }}>
                  Real debugging adventures and the detective work behind solving complex technical puzzles.
                </p>
              </div>
            </div>

            <p style={{ 
              marginTop: '1rem', 
              fontSize: 'clamp(0.8rem, 2.2vw, 0.9rem)', 
              color: '#bbb', 
              textAlign: 'center', 
              fontStyle: 'italic',
              lineHeight: '1.4'
            }}>
              Each post is a puzzle solved and shared - because the best discoveries happen when we dig deeper together.
            </p>
          </section>
        </div>
      </Content>
    </Page>
  </>
);

export default About;
