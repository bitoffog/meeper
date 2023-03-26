/*
 * This content script is injected programmatically because
 * MAIN world injection does not work properly via manifest
 * https://bugs.chromium.org/p/chromium/issues/detail?id=634381
 */
export async function registerContentScript() {
  try {
    await chrome.scripting.registerContentScripts([
      {
        id: "content-main",
        matches: ["*://meet.google.com/*-*-*"],
        js: ["scripts/content.js"],
        runAt: "document_start",
        allFrames: true,
        ["world" as any]: "MAIN",
      },
    ]);
  } catch (err) {
    /**
     * An error occurs when app-init.js is reloaded. Attempts to avoid the duplicate script error:
     * 1. registeringContentScripts inside runtime.onInstalled - This caused a race condition
     *    in which the provider might not be loaded in time.
     * 2. await chrome.scripting.getRegisteredContentScripts() to check for an existing
     *    content script before registering - The provider is not loaded on time.
     */
    console.warn("Dropped attempt to register content content script.", err);
  }
}
