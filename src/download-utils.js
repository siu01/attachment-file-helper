function cleanSegment(value, fallback) {
  const cleaned = String(value || "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();

  if (!cleaned || cleaned === "." || cleaned === "..") return fallback;
  return cleaned.slice(0, 80);
}

export function sanitizeFolderName(value) {
  return cleanSegment(value, "添付ファイル");
}

export function getUrlFilename(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const filename = decodeURIComponent(url.pathname.split("/").pop() || "");
    return filename && filename !== "download" ? filename : "";
  } catch {
    return "";
  }
}

export function getDownloadFilename(rawUrl, suggestedName, index = 1) {
  const suggested = cleanSegment(suggestedName, "");
  const urlFilename = cleanSegment(getUrlFilename(rawUrl), "");
  const genericName = /^(添付ファイル|ダウンロード|download)$/i.test(suggested);
  let filename = genericName ? "" : suggested;

  if (!filename) filename = urlFilename;

  const extension = urlFilename.match(/\.[a-z0-9]{1,8}$/i)?.[0] || "";
  if (filename && extension && !/\.[a-z0-9]{1,8}$/i.test(filename)) {
    filename += extension;
  }

  return cleanSegment(filename, `attachment-${index}`);
}

export function buildDownloadPath(folderName, rawUrl, suggestedName, index = 1) {
  return `添付ファイルかんたん操作/${sanitizeFolderName(folderName)}/${getDownloadFilename(rawUrl, suggestedName, index)}`;
}
