import App from "./app.tsx";

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

// biome-ignore lint/style/noNonNullAssertion: ok
ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

// Use contextBridge
window.ipcRenderer.on("main-process-message", (_event, message) => {
	console.log(message);
});
