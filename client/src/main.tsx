// Polyfill for getRandomValues in browser (for some libraries that expect it)
if (typeof window !== "undefined" && (!window.crypto || !window.crypto.getRandomValues)) {
	// @ts-ignore
	window.crypto = require("crypto").webcrypto;
}
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
