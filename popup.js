const statusElement = document.querySelector("#status");
const listElement = document.querySelector("#attachment-list");
const pageLabelElement = document.querySelector("#page-label");
const refreshButton = document.querySelector("#refresh");
const bulkActionsElement = document.querySelector("#bulk-actions");
const folderNameInput = document.querySelector("#folder-name");
const saveAllButton = document.querySelector("#save-all");
const classroomToolsElement = document.querySelector("#classroom-tools");
const pageSearchInput = document.querySelector("#page-search");
const findPageButton = document.querySelector("#find-page");
const saveClassroomPageButton = document.querySelector("#save-classroom-page");
const savedPagesElement = document.querySelector("#saved-pages");

let activeTab = null;
let currentAttachments = [];

function isClassroomUrl(url) {
  return /^https:\/\/classroom\.google\.com\//i.test(url || "");
}

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

function sendFindRequest() {
  const query = pageSearchInput.value.trim();
  if (!query || !activeTab?.id) return;

  chrome.tabs.sendMessage(activeTab.id, { type: "findInPage", query }, (response) => {
    if (chrome.runtime.lastError || !response?.found) {
      setStatus(`「${query}」は見つかりませんでした`);
      return;
    }
    setStatus(`「${query}」を見つけました。検索ボタンで次の場所へ移動できます`);
  });
}

function renderSavedPages(bookmarks) {
  savedPagesElement.replaceChildren();
  if (!bookmarks.length) return;

  for (const bookmark of bookmarks.slice(0, 8)) {
    const row = document.createElement("div");
    row.className = "saved-page";
    const title = document.createElement("div");
    title.className = "saved-page-title";
    title.textContent = bookmark.title;

    const actions = document.createElement("div");
    actions.className = "saved-page-actions";
    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.textContent = "開く";
    openButton.addEventListener("click", () => sendAction("open-new", bookmark.url, openButton));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", () => {
      chrome.runtime.sendMessage(
        { type: "deleteClassroomBookmark", url: bookmark.url },
        (response) => {
          if (chrome.runtime.lastError || !response?.ok) return;
          loadSavedPages();
        }
      );
    });
    actions.append(openButton, deleteButton);
    row.append(title, actions);
    savedPagesElement.append(row);
  }
}

function loadSavedPages() {
  chrome.storage.local.get({ classroomBookmarks: [] }, (result) => {
    renderSavedPages(result.classroomBookmarks || []);
  });
}

function saveClassroomPage() {
  if (!activeTab?.url) return;
  saveClassroomPageButton.disabled = true;
  chrome.runtime.sendMessage(
    {
      type: "saveClassroomBookmark",
      bookmark: { url: activeTab.url, title: pageLabelElement.textContent }
    },
    (response) => {
      saveClassroomPageButton.disabled = false;
      if (chrome.runtime.lastError || !response?.ok) {
        setStatus(response?.error || "ページを保存できませんでした");
        return;
      }
      setStatus("Classroom ページを保存しました");
      loadSavedPages();
    }
  );
}

async function loadAttachments() {
  refreshButton.disabled = true;
  setStatus("読み込み中…");

  try {
    [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id) throw new Error("現在のタブを取得できませんでした。");

    const classroomPage = isClassroomUrl(activeTab.url);
    classroomToolsElement.hidden = !classroomPage;
    if (classroomPage) loadSavedPages();

    const response = await chrome.tabs.sendMessage(activeTab.id, { type: "scanAttachments" });
    pageLabelElement.textContent = response.pageTitle || activeTab.url || "現在のページ";
    folderNameInput.value = response.pageTitle || "添付ファイル";
    renderAttachments(response.attachments || []);
  } catch {
    pageLabelElement.textContent = "このページを読み取れません";
    folderNameInput.value = "添付ファイル";
    currentAttachments = [];
    bulkActionsElement.hidden = true;
    classroomToolsElement.hidden = true;
    setStatus("このページでは一覧表示できません。リンクを右クリックして操作してください。");
    listElement.replaceChildren();
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadAttachments);
saveAllButton.addEventListener("click", saveAllAttachments);
findPageButton.addEventListener("click", sendFindRequest);
pageSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") sendFindRequest();
});
saveClassroomPageButton.addEventListener("click", saveClassroomPage);
loadAttachments();
