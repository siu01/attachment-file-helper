import {
  extractUrlFromText,
  isDownloadableUrl,
  isOpenableUrl,
  normalizeUrl
} from "./src/url-utils.js";

const MENU_ROOT = "attachment-helper-root";
const MENU_ACTIONS = {
  openCurrent: "attachment-open-current",
  openNew: "attachment-open-new",
  save: "attachment-save"
};

function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ROOT,
      title: "添付ファイルを操作",
      contexts: ["link", "image", "video", "audio", "selection"]
    });

    chrome.contextMenus.create({
      id: MENU_ACTIONS.openCurrent,
      parentId: MENU_ROOT,
      title: "このタブで開く",
      contexts: ["link", "image", "video", "audio", "selection"]
    });

    chrome.contextMenus.create({
      id: MENU_ACTIONS.openNew,
      parentId: MENU_ROOT,
      title: "新しいタブで開く",
      contexts: ["link", "image", "video", "audio", "selection"]
    });

    chrome.contextMenus.create({
      id: MENU_ACTIONS.save,
      parentId: MENU_ROOT,
      title: "保存する",
      contexts: ["link", "image", "video", "audio", "selection"]
    });
  });
}

function getTargetUrl(info) {
  const directUrl = info.linkUrl || info.srcUrl;
  if (directUrl) return normalizeUrl(directUrl);
  return extractUrlFromText(info.selectionText || "");
}

function notify(tabId, message) {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, { type: "showMessage", message }, () => {
    // The page may not allow content scripts (for example chrome:// pages).
    void chrome.runtime.lastError;
  });
}

async function openInCurrentTab(tabId, url) {
  if (!tabId || !isOpenableUrl(url)) {
    throw new Error("この URL はブラウザで開けません。");
  }
  await chrome.tabs.update(tabId, { url });
}

async function openInNewTab(tabId, url) {
  if (!isOpenableUrl(url)) {
    throw new Error("この URL はブラウザで開けません。");
  }
  await chrome.tabs.create({ url, openerTabId: tabId });
}

async function saveFile(url, tabId) {
  if (!isDownloadableUrl(url)) {
    throw new Error("この URL は直接保存できません。ページ内のダウンロードボタンをお試しください。");
  }

  await chrome.downloads.download({
    url,
    conflictAction: "uniquify",
    saveAs: false
  });
  notify(tabId, "保存を開始しました");
}

async function performAction(action, url, tabId) {
  if (!url) throw new Error("対象の URL を取得できませんでした。");

  switch (action) {
    case "open-current":
      return openInCurrentTab(tabId, url);
    case "open-new":
      return openInNewTab(tabId, url);
    case "save":
      return saveFile(url, tabId);
    default:
      throw new Error("未対応の操作です。");
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!Object.values(MENU_ACTIONS).includes(info.menuItemId)) return;

  const url = getTargetUrl(info);
  performAction(info.menuItemId.replace("attachment-", ""), url, tab?.id)
    .catch((error) => notify(tab?.id, error.message));
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "performAction") return undefined;

  performAction(message.action, message.url, message.tabId || sender.tab?.id)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

chrome.runtime.onInstalled.addListener(createContextMenus);
chrome.runtime.onStartup.addListener(createContextMenus);
createContextMenus();
