const ATTACHMENT_EXTENSION_PATTERN = /\.(7z|csv|doc|docx|gif|gz|jpeg|jpg|json|mov|mp3|mp4|pdf|png|ppt|pptx|rar|svg|tar|txt|webm|webp|xls|xlsx|xml|zip)(?:$|[?#])/i;

function normalizeUrl(rawValue, baseUrl = undefined) {
  if (typeof rawValue !== "string" || !rawValue.trim()) return null;
  try {
    return new URL(rawValue.trim(), baseUrl).href;
  } catch {
    return null;
  }
}

function looksLikeAttachment(rawUrl, label = "", hasDownloadAttribute = false) {
  if (hasDownloadAttribute) return true;
  const text = String(label || "");
  return ATTACHMENT_EXTENSION_PATTERN.test(rawUrl || "") ||
    ATTACHMENT_EXTENSION_PATTERN.test(text) ||
    /(添付|ファイル|ダウンロード|download|attachment)/i.test(text);
}

function getDisplayName(rawUrl, label = "") {
  const cleanLabel = String(label || "").replace(/\s+/g, " ").trim();
  if (cleanLabel) return cleanLabel.slice(0, 120);
  try {
    const url = new URL(rawUrl);
    const filename = decodeURIComponent(url.pathname.split("/").pop() || "");
    return filename || url.hostname;
  } catch {
    return "添付ファイル";
  }
}

function textForElement(element) {
  return [
    element.textContent,
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.getAttribute("download")
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function collectAttachments() {
  const results = [];
  const seen = new Set();

  for (const link of document.querySelectorAll("a[href]")) {
    const url = normalizeUrl(link.href, location.href);
    if (!url || seen.has(url)) continue;

    const label = textForElement(link);
    if (!looksLikeAttachment(url, label, link.hasAttribute("download"))) continue;

    seen.add(url);
    results.push({
      url,
      name: getDisplayName(url, label),
      kind: "link"
    });
  }

  for (const element of document.querySelectorAll("img[src], video[src], audio[src]")) {
    const url = normalizeUrl(element.currentSrc || element.src, location.href);
    if (!url || seen.has(url)) continue;

    const label = textForElement(element);
    if (!looksLikeAttachment(url, label, false)) continue;

    seen.add(url);
    results.push({
      url,
      name: getDisplayName(url, label),
      kind: element.tagName.toLowerCase()
    });
  }

  return results.slice(0, 100);
}

function showMessage(message) {
  const existing = document.getElementById("attachment-helper-toast");
  existing?.remove();

  const toast = document.createElement("div");
  toast.id = "attachment-helper-toast";
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    zIndex: "2147483647",
    top: "16px",
    right: "16px",
    padding: "10px 14px",
    borderRadius: "8px",
    background: "#1f2937",
    color: "#fff",
    font: "14px/1.4 -apple-system, BlinkMacSystemFont, sans-serif",
    boxShadow: "0 4px 16px rgba(0, 0, 0, .25)"
  });
  document.documentElement.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "scanAttachments") {
    sendResponse({ attachments: collectAttachments(), pageTitle: document.title });
    return true;
  }

  if (message?.type === "showMessage") {
    showMessage(message.message);
  }

  return undefined;
});
