const OPENABLE_PROTOCOLS = new Set(["http:", "https:", "ftp:", "file:"]);
const DOWNLOADABLE_PROTOCOLS = new Set(["http:", "https:", "ftp:"]);

const ATTACHMENT_EXTENSIONS = [
  "7z", "csv", "doc", "docx", "gif", "gz", "jpeg", "jpg", "json", "mov",
  "mp3", "mp4", "pdf", "png", "ppt", "pptx", "rar", "svg", "tar", "txt",
  "webm", "webp", "xls", "xlsx", "xml", "zip"
];

const ATTACHMENT_EXTENSION_PATTERN = new RegExp(
  `\\.(${ATTACHMENT_EXTENSIONS.join("|")})(?:$|[?#])`,
  "i"
);

export function normalizeUrl(rawValue, baseUrl = undefined) {
  if (typeof rawValue !== "string") return null;

  const value = rawValue.trim();
  if (!value) return null;

  try {
    return new URL(value, baseUrl).href;
  } catch {
    return null;
  }
}

export function isOpenableUrl(rawValue) {
  const normalized = normalizeUrl(rawValue);
  if (!normalized) return false;

  try {
    return OPENABLE_PROTOCOLS.has(new URL(normalized).protocol);
  } catch {
    return false;
  }
}

export function isDownloadableUrl(rawValue) {
  const normalized = normalizeUrl(rawValue);
  if (!normalized) return false;

  try {
    return DOWNLOADABLE_PROTOCOLS.has(new URL(normalized).protocol);
  } catch {
    return false;
  }
}

export function extractUrlFromText(rawValue) {
  if (typeof rawValue !== "string") return null;

  const match = rawValue.match(/https?:\/\/[^\s<>"'`]+/i);
  return match ? normalizeUrl(match[0].replace(/[),.;!?、。）」』】]+$/u, "")) : null;
}

export function looksLikeAttachment(rawUrl, label = "", hasDownloadAttribute = false) {
  if (hasDownloadAttribute) return true;

  const url = normalizeUrl(rawUrl);
  const text = String(label || "");
  return ATTACHMENT_EXTENSION_PATTERN.test(url || "") ||
    ATTACHMENT_EXTENSION_PATTERN.test(text) ||
    /(添付|ファイル|ダウンロード|download|attachment)/i.test(text);
}

export function getDisplayName(rawUrl, label = "") {
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

export function isLikelyUrl(rawValue) {
  return Boolean(extractUrlFromText(rawValue) || normalizeUrl(rawValue));
}
