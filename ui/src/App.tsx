import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./Header";
import Posts from "./Posts";
import Home from "./Home";
import { CanvasBackground, GlobalStyle } from "./components/Styled";
import OceanDemoCanvas from "./OceanDemoCanvas";
import { Vector3 } from "three";



const App: React.FC = () => (
  <>
    <GlobalStyle />
    <CanvasBackground>
      <OceanDemoCanvas camera={new Vector3(488.401,62.471,-80.716)} />
    </CanvasBackground>
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/posts" element={<Posts />} />
      </Routes>
    </Router>
  </>
);

export default App;
