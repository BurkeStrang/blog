import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const container = document.getElementById("root")!;
const root = createRoot(container);

root.render(
  // Disabled StrictMode to prevent double rendering causing memory leaks in Three.js
  <App />,
);
