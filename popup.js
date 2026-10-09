const statusElement = document.querySelector("#status");
const listElement = document.querySelector("#attachment-list");
const pageLabelElement = document.querySelector("#page-label");
const refreshButton = document.querySelector("#refresh");
const bulkActionsElement = document.querySelector("#bulk-actions");
const folderNameInput = document.querySelector("#folder-name");
const saveAllButton = document.querySelector("#save-all");

let activeTab = null;
let currentAttachments = [];

function setStatus(message) {
  statusElement.textContent = message;
}

function shortenUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return `${url.hostname}${url.pathname}`.slice(0, 72);
  } catch {
    return rawUrl.slice(0, 72);
  }
}

function sendAction(action, url, button) {
  button.disabled = true;
  chrome.runtime.sendMessage(
    { type: "performAction", action, url, tabId: activeTab.id },
    (response) => {
      button.disabled = false;
      if (chrome.runtime.lastError || !response?.ok) {
        setStatus(response?.error || "操作に失敗しました");
        return;
      }
      if (action === "save") setStatus("保存を開始しました");
    }
  );
}

function renderAttachments(attachments) {
  currentAttachments = attachments;
  listElement.replaceChildren();
  bulkActionsElement.hidden = !attachments.length;
  if (!attachments.length) {
    setStatus("添付ファイル候補が見つかりませんでした。リンクを右クリックして操作できます。");
    return;
  }

  setStatus(`${attachments.length} 件の添付ファイル候補`);
  for (const attachment of attachments) {
    const row = document.createElement("article");
    row.className = "attachment";

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "attachment-name";
    name.textContent = attachment.name;
    const url = document.createElement("div");
    url.className = "attachment-url";
    url.textContent = shortenUrl(attachment.url);
    info.append(name, url);

    const actions = document.createElement("div");
    actions.className = "actions";
    for (const [action, label] of [
      ["open-current", "開く"],
      ["open-new", "新しいタブ"],
      ["save", "保存"]
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => sendAction(action, attachment.url, button));
      actions.append(button);
    }

    row.append(info, actions);
    listElement.append(row);
  }
}

function saveAllAttachments() {
  if (!activeTab?.id || !currentAttachments.length) return;

  saveAllButton.disabled = true;
  setStatus(`${currentAttachments.length} 件を保存中…`);
  chrome.runtime.sendMessage(
    {
      type: "saveAttachmentsToFolder",
      attachments: currentAttachments,
      folderName: folderNameInput.value || pageLabelElement.textContent,
      tabId: activeTab.id
    },
    (response) => {
      saveAllButton.disabled = false;
      if (chrome.runtime.lastError || !response?.ok) {
        setStatus(response?.error || "まとめて保存に失敗しました");
        return;
      }
      setStatus(`${response.savedCount} 件の保存を開始しました`);
    }
  );
}

async function loadAttachments() {
  refreshButton.disabled = true;
  setStatus("読み込み中…");

  try {
    [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id) throw new Error("現在のタブを取得できませんでした。");

    const response = await chrome.tabs.sendMessage(activeTab.id, { type: "scanAttachments" });
    pageLabelElement.textContent = response.pageTitle || activeTab.url || "現在のページ";
    folderNameInput.value = response.pageTitle || "添付ファイル";
    renderAttachments(response.attachments || []);
  } catch {
    pageLabelElement.textContent = "このページを読み取れません";
    folderNameInput.value = "添付ファイル";
    currentAttachments = [];
    bulkActionsElement.hidden = true;
    setStatus("このページでは一覧表示できません。リンクを右クリックして操作してください。");
    listElement.replaceChildren();
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadAttachments);
saveAllButton.addEventListener("click", saveAllAttachments);
loadAttachments();
