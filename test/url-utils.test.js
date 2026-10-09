import test from "node:test";
import assert from "node:assert/strict";
import {
  extractUrlFromText,
  getDisplayName,
  isDownloadableUrl,
  isOpenableUrl,
  looksLikeAttachment,
  normalizeUrl
} from "../src/url-utils.js";
import {
  buildDownloadPath,
  getDownloadFilename,
  sanitizeFolderName
} from "../src/download-utils.js";

test("normalizes relative URLs when a base is supplied", () => {
  assert.equal(
    normalizeUrl("../files/report.pdf", "https://example.com/docs/page"),
    "https://example.com/files/report.pdf"
  );
});

test("supports browser opening and download protocol checks", () => {
  assert.equal(isOpenableUrl("https://example.com/report.pdf"), true);
  assert.equal(isOpenableUrl("javascript:alert(1)"), false);
  assert.equal(isDownloadableUrl("https://example.com/report.pdf"), true);
  assert.equal(isDownloadableUrl("file:///tmp/report.pdf"), false);
});

test("extracts a URL from selected text", () => {
  assert.equal(
    extractUrlFromText("資料はこちら https://example.com/a.pdf。"),
    "https://example.com/a.pdf"
  );
});

test("detects attachment-like links", () => {
  assert.equal(looksLikeAttachment("https://example.com/a.pdf"), true);
  assert.equal(looksLikeAttachment("https://example.com/download?id=1", "添付ファイル"), true);
  assert.equal(looksLikeAttachment("https://example.com/about", "会社概要"), false);
});

test("prefers a human-readable label for display names", () => {
  assert.equal(getDisplayName("https://example.com/a.pdf", "  仕様書  "), "仕様書");
  assert.equal(getDisplayName("https://example.com/a%20file.pdf"), "a file.pdf");
});

test("builds safe download paths inside a page folder", () => {
  assert.equal(sanitizeFolderName("授業 / 第1回"), "授業 - 第1回");
  assert.equal(
    buildDownloadPath("第1回 / 課題", "https://example.com/report.pdf", "レポート", 1),
    "添付ファイルかんたん操作/第1回 - 課題/レポート.pdf"
  );
  assert.equal(
    getDownloadFilename("https://example.com/photo.jpg", "ダウンロード", 2),
    "photo.jpg"
  );
});
