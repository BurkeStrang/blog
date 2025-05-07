import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./Header";
import Posts from "./Posts";
import Home from "./Home";
import { GlobalStyle } from "./components/Styled";

const App: React.FC = () => (
  <>
    <GlobalStyle />
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
