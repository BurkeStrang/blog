import React from "react";
import cloudImg from "../../assets/textures/darkcloud.avif";
import { Page, Header, Content, Cloud } from "../../shared/theme/GlobalStyles";

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
