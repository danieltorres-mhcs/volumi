let creatingOffscreen;
const activeTabs = new Set();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "SET_TAB_VOLUME" || !Number.isInteger(message.tabId)) return;

  handleVolume(message.tabId, Number(message.volume))
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({
      ok: false,
      error: error?.message || "Unable to change volume on this tab."
    }));

  return true;
});

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL("offscreen.html");
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  });
  if (contexts.length > 0) return;

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  creatingOffscreen = chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA", "AUDIO_PLAYBACK"],
    justification: "Process captured tab audio and apply the selected volume gain."
  });

  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

async function handleVolume(tabId, volumePercent) {
  const volume = Math.max(0, Math.min(1000, Number(volumePercent)));
  const streamId = activeTabs.has(tabId)
    ? null
    : await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });

  await ensureOffscreenDocument();

  const response = await chrome.runtime.sendMessage({
    target: "volumi-offscreen",
    type: "APPLY_VOLUME",
    tabId,
    streamId,
    volume
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Audio processing could not start.");
  }
  activeTabs.add(tabId);
}

chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
  chrome.runtime.sendMessage({
    target: "volumi-offscreen",
    type: "STOP_TAB",
    tabId
  }).catch(() => {});
});
