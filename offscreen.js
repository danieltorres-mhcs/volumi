const captures = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target !== "volumi-offscreen") return;

  if (message.type === "APPLY_VOLUME") {
    applyVolume(message).then(
      () => sendResponse({ ok: true }),
      (error) => sendResponse({ ok: false, error: error?.message || "Audio processing failed." })
    );
    return true;
  }

  if (message.type === "STOP_TAB") {
    stopCapture(message.tabId);
    sendResponse({ ok: true });
  }
});

async function applyVolume({ tabId, streamId, volume }) {
  let capture = captures.get(tabId);

  if (!capture) {
    if (!streamId) throw new Error("Audio capture has not been initialized. Reload the tab and try again.");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const gain = audioContext.createGain();
    source.connect(gain);
    gain.connect(audioContext.destination);

    capture = { stream, audioContext, source, gain };
    captures.set(tabId, capture);
  }

  if (capture.audioContext.state === "suspended") {
    await capture.audioContext.resume();
  }
  capture.gain.gain.value = Math.max(0, Math.min(1000, Number(volume))) / 100;
}

function stopCapture(tabId) {
  const capture = captures.get(tabId);
  if (!capture) return;
  capture.stream.getTracks().forEach((track) => track.stop());
  capture.audioContext.close().catch(() => {});
  captures.delete(tabId);
}
