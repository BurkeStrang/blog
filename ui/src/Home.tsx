import React from "react";
import {
  Page,
  Header,
  Content,
  GlobalStyle,
  CanvasBackground,
} from "./components/Styled";
import OceanDemoCanvas from "./OceanDemoCanvas";

const Home: React.FC = () => (
  <>
    <GlobalStyle />
    <CanvasBackground>
      <OceanDemoCanvas />
    </CanvasBackground>
    <Page>
      <Header>
        <h1>Brutalist Blog</h1>
      </Header>
      <Content>
        <p>Welcome to my site!</p>
      </Content>
    </Page>
  </>
);

export default Home;
