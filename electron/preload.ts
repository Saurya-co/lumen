/**
 * Lumen — preload script.
 * Exposes a small, safe `lumen` API on window for the renderer to talk to
 * the native shell (navigate the study view, register shortcuts, etc.).
 * No Node integration is exposed — everything goes through ipcRenderer.
 *
 * SECURITY: The onShortcut function validates that the requested channel
 * starts with "shortcut:" — no other IPC channel can be listened to
 * from the renderer. This prevents a compromised renderer from eavesdropping
 * on internal main-process IPC traffic.
 */
import { contextBridge, ipcRenderer } from "electron";

// SECURITY: Only allow listening to channels that start with this prefix.
// This prevents a malicious renderer from subscribing to arbitrary IPC
// channels and receiving privileged data.
const SHORTCUT_CHANNEL_PREFIX = "shortcut:";

contextBridge.exposeInMainWorld("lumen", {
  studyNavigate: (url: string) => ipcRenderer.invoke("study:navigate", url),
  studyReload: () => ipcRenderer.invoke("study:reload"),
  studyBack: () => ipcRenderer.invoke("study:back"),
  studyForward: () => ipcRenderer.invoke("study:forward"),
  studyGetState: () => ipcRenderer.invoke("study:getState"),
  // Show/hide the native study view so renderer overlays (command center,
  // navigate, settings…) aren't hidden behind the webpage.
  studySetVisible: (visible: boolean) => ipcRenderer.invoke("study:setVisible", visible),

  // Local PDF import — OS picker filtered to .pdf only, plus a validated
  // loader for previously-imported files.
  pdfPick: () => ipcRenderer.invoke("pdf:pick"),
  pdfOpen: (fileUrl: string) => ipcRenderer.invoke("pdf:open", fileUrl),

  // Listen for native accelerator triggers from main.
  // SECURITY: channel must start with "shortcut:" — rejects all other
  // channels to prevent IPC eavesdropping.
  onShortcut: (channel: string, cb: () => void) => {
    if (typeof channel !== "string" || !channel.startsWith(SHORTCUT_CHANNEL_PREFIX)) {
      console.warn(`[LumenPreload] Rejected onShortcut for channel: ${channel}`);
      return () => {}; // no-op unsub
    }
    const handler = () => {
      try {
        cb();
      } catch (err) {
        console.error(`[LumenPreload] handler threw for ${channel}:`, err);
      }
    };
    console.log(`[LumenPreload] listening: ${channel}`);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  isNative: () => true,
});
