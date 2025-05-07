import React from "react";
import { Page, Header, Content, CanvasBackground } from "./components/Styled";
import OceanDemoCanvas from "./OceanDemoCanvas";
import { Vector3 } from "three";

const Home: React.FC = () => (
  <>
    <CanvasBackground>
      <OceanDemoCanvas camera={new Vector3(0, 0, 0)} />,
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
