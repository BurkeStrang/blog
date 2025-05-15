import React from "react";
import cloudImg from "./textures/darkcloud.png";
import wispyCloudUrl from "./textures/cloud.png";
import { Page, Header, Content, WispyCloud, Cloud } from "./components/Styled";

// this will just be an about
const About: React.FC = () => (
  <>
    <Page>
      <Header>
        <Cloud src={cloudImg} alt="" />
        <WispyCloud src={wispyCloudUrl} alt="wispy cloud layer" />
        <h1>About Me</h1>
      </Header>
      <Content></Content>
    </Page>
  </>
);

export default About;
