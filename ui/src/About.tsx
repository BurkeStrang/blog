import React from "react";
import cloudImg from "./textures/darkcloud.png";
import { Page, Header, Content, Cloud } from "./components/Styled";

const About: React.FC = () => (
  <>
    <Page>
      <Header>
        <Cloud src={cloudImg} alt="" />
        <h1>ABOUT ME</h1>
      </Header>
      <Content></Content>
    </Page>
  </>
);

export default About;
