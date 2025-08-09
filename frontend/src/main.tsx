import { Provider } from "@/components/ui/provider";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@fontsource-variable/doto/index.css";
import "@fontsource/audiowide/index.css";
import "@fontsource-variable/space-grotesk/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider>
      <App />
    </Provider>
  </React.StrictMode>
);
