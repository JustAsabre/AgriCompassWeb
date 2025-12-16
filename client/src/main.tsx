import { createRoot } from "react-dom/client";
import { initSentry } from "./sentry";
import App from "./App";
import "./index.css";

// Initialize Sentry before rendering the app
initSentry();

createRoot(document.getElementById("root")!).render(<App />);
