import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PreferencesProvider } from "./preferences";
import { initPwa } from "./pwa";
import "./styles.css";
import "./themes.css";

initPwa();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PreferencesProvider>
      <App />
    </PreferencesProvider>
  </React.StrictMode>,
);
