const slider = document.querySelector("#volume");
const valueLabel = document.querySelector("#volume-value");
const titleEl = document.querySelector("#tab-title");
const urlEl = document.querySelector("#tab-url");
const favicon = document.querySelector("#favicon");
const resetButton = document.querySelector("#reset");
const statusEl = document.querySelector("#status");
const noteEl = document.querySelector("#note");
const maxVolumeToggle = document.querySelector("#max-volume-toggle");
const decimalToggle = document.querySelector("#decimal-toggle");
const rangeLabels = document.querySelector("#range-labels");

let activeTabId = null;
let debounceTimer = null;
let maxVolumeEnabled = false;
let decimalEnabled = false;
let currentVolume = 100;

function maxVolume() { return maxVolumeEnabled ? 1000 : 200; }
function stepSize() { return decimalEnabled ? 0.01 : 1; }
function formatVolume(value) {
  const n = Number(value);
  return decimalEnabled ? n.toFixed(2) : String(Math.round(n));
}
function showStatus(message) {
  statusEl.textContent = message;
}
function setValue(value) {
  const n = Math.max(0, Math.min(maxVolume(), Number(value) || 0));
  currentVolume = decimalEnabled ? Math.round(n * 100) / 100 : Math.round(n);
  slider.max = String(maxVolume());
  slider.step = String(stepSize());
  slider.value = String(currentVolume);
  valueLabel.textContent = formatVolume(currentVolume);
  rangeLabels.innerHTML = `<span>0</span><span>${maxVolume() === 1000 ? 500 : 100}</span><span>${maxVolume()}</span>`;
}

async function loadCurrentTab() {
  const settings = await chrome.storage.local.get(["volumi:max-volume", "volumi:decimal-volume"]);
  maxVolumeEnabled = Boolean(settings["volumi:max-volume"]);
  decimalEnabled = Boolean(settings["volumi:decimal-volume"]);
  maxVolumeToggle.checked = maxVolumeEnabled;
  decimalToggle.checked = decimalEnabled;
  setValue(100);

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || tab.id == null) {
    titleEl.textContent = "No active tab found";
    slider.disabled = true;
    resetButton.disabled = true;
    maxVolumeToggle.disabled = true;
    decimalToggle.disabled = true;
    return;
  }
  activeTabId = tab.id;
  titleEl.textContent = tab.title || "Untitled tab";
  urlEl.textContent = tab.url || "";
  urlEl.title = tab.url || "";
  if (tab.favIconUrl) {
    favicon.src = tab.favIconUrl;
    favicon.hidden = false;
    favicon.onerror = () => { favicon.hidden = true; };
  }

  const stored = await chrome.storage.local.get(`volume:${activeTabId}`);
  setValue(stored[`volume:${activeTabId}`] ?? 100);

  if (!tab.url || !/^https?:/i.test(tab.url)) {
    slider.disabled = true;
    resetButton.disabled = true;
    maxVolumeToggle.disabled = true;
    decimalToggle.disabled = true;
  }
}

slider.addEventListener("input", () => {
  setValue(slider.value);
  showStatus("Applying…");
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyVolume, 80);
});

maxVolumeToggle.addEventListener("change", async () => {
  const previous = currentVolume;
  maxVolumeEnabled = maxVolumeToggle.checked;
  await chrome.storage.local.set({ "volumi:max-volume": maxVolumeEnabled });
  setValue(previous);
  showStatus(maxVolumeEnabled ? "Limit raised to 1000%" : "Limit set to 200%");
  if (currentVolume !== previous) await applyVolume();
});

decimalToggle.addEventListener("change", async () => {
  const previous = currentVolume;
  decimalEnabled = decimalToggle.checked;
  await chrome.storage.local.set({ "volumi:decimal-volume": decimalEnabled });
  setValue(previous);
  showStatus(decimalEnabled ? "Decimal steps enabled" : "Whole-number steps enabled");
  if (currentVolume !== previous) await applyVolume();
});

resetButton.addEventListener("click", async () => {
  setValue(100);
  await applyVolume();
});

async function applyVolume() {
  if (activeTabId == null) return;
  const volume = Number(slider.value);
  try {
    const result = await chrome.runtime.sendMessage({
      type: "SET_TAB_VOLUME",
      tabId: activeTabId,
      volume
    });
    if (result?.ok) {
      await chrome.storage.local.set({ [`volume:${activeTabId}`]: volume });
      showStatus("Applied");
    } else {
      showStatus("Can't control this tab");
      if (noteEl) noteEl.textContent = result?.error || "Try reloading the tab, then set the volume again.";
    }
  } catch {
    showStatus("Try reloading the tab");
    if (noteEl) noteEl.textContent = "Reload the tab and try again. Some pages cannot be captured by extensions.";
  }
}

loadCurrentTab().catch(() => {
  titleEl.textContent = "Could not read current tab";
  showStatus("Try reopening Volumi");
});
