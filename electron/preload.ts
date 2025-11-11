import { contextBridge, ipcRenderer } from "electron";

// Expose IPC renderer to the renderer process
contextBridge.exposeInMainWorld("ipcRenderer", {
	invoke(channel: string, ...args: unknown[]) {
		return ipcRenderer.invoke(channel, ...args);
	},
	on(channel: string, listener: (...args: unknown[]) => void) {
		ipcRenderer.on(channel, (_event, ...args) => listener(...args));
		return () => ipcRenderer.removeListener(channel, listener);
	},
	send(channel: string, ...args: unknown[]) {
		return ipcRenderer.send(channel, ...args);
	},
});
