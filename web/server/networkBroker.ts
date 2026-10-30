import { createHash } from "node:crypto";
import type { PersistentMemory } from "./persistentMemory";

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;

type NetworkLedger = Pick<PersistentMemory, "appendEvidenceLedgerEvent">;

export type NetworkApproval = {
  ownerApproved: true;
  projectId: string;
  requestId: string;
  approvalId: string;
  ledger: NetworkLedger;
};

export type NetworkFailure = {
  ok: false;
  status?: number;
  reason: string;
};

export type NetworkFetchSuccess = {
  ok: true;
  status: number;
  contentType: string;
  body: string;
  sha256: string;
  fetchedAt: string;
};

export type NetworkFetchResult = NetworkFetchSuccess | NetworkFailure;

export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export type WebSearchResponse = {
  ok: true;
  results: WebSearchResult[];
  fetchedAt: string;
  sha256: string;
} | NetworkFailure;

export async function fetchUrl(url: string, approval?: NetworkApproval): Promise<NetworkFetchResult> {
  const fetchedAt = new Date().toISOString();
  if (!approval?.ownerApproved || !approval.projectId.trim() || !approval.requestId.trim() || !approval.approvalId.trim() || !approval.ledger) return { ok: false, reason: "NETWORK_OWNER_APPROVAL_REQUIRED" };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    approval.ledger.appendEvidenceLedgerEvent({ projectId: approval.projectId, requestId: approval.requestId, approvalId: approval.approvalId, eventType: "network_fetch_failed", actor: "kaz.network-broker", payload: { url, status: null, sha256: null, reason: "INVALID_URL" }, occurredAt: fetchedAt });
    return { ok: false, reason: "INVALID_URL" };
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const isPrivateIpv4 = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|0\.)/.test(hostname);
  const isPrivateIpv6 = hostname === "::1" || hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe80:");
  if (parsed.protocol !== "https:") {
    approval.ledger.appendEvidenceLedgerEvent({ projectId: approval.projectId, requestId: approval.requestId, approvalId: approval.approvalId, eventType: "network_fetch_failed", actor: "kaz.network-broker", payload: { url, status: null, sha256: null, reason: "HTTPS_ONLY" }, occurredAt: fetchedAt });
    return { ok: false, reason: "HTTPS_ONLY" };
  }
  if (hostname === "localhost" || isPrivateIpv4 || isPrivateIpv6) {
    approval.ledger.appendEvidenceLedgerEvent({ projectId: approval.projectId, requestId: approval.requestId, approvalId: approval.approvalId, eventType: "network_fetch_failed", actor: "kaz.network-broker", payload: { url, status: null, sha256: null, reason: "PRIVATE_OR_LOOPBACK_HOST" }, occurredAt: fetchedAt });
    return { ok: false, reason: "PRIVATE_OR_LOOPBACK_HOST" };
  }
  if (parsed.username || parsed.password) {
    approval.ledger.appendEvidenceLedgerEvent({ projectId: approval.projectId, requestId: approval.requestId, approvalId: approval.approvalId, eventType: "network_fetch_failed", actor: "kaz.network-broker", payload: { url, status: null, sha256: null, reason: "CREDENTIALS_IN_URL_FORBIDDEN" }, occurredAt: fetchedAt });
    return { ok: false, reason: "CREDENTIALS_IN_URL_FORBIDDEN" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(controller.abort.bind(controller), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(parsed, { method: "GET", redirect: "error", signal: controller.signal, headers: { accept: "text/html,application/xhtml+xml,application/json,text/plain,application/xml,text/xml;q=0.9,*/*;q=0.1" } });
  } catch (error) {
    clearTimeout(timeout);
    const reason = error instanceof Error && error.name === "AbortError" ? "REQUEST_TIMEOUT" : "NETWORK_REQUEST_FAILED";
    approval.ledger.appendEvidenceLedgerEvent({ projectId: approval.projectId, requestId: approval.requestId, approvalId: approval.approvalId, eventType: "network_fetch_failed", actor: "kaz.network-broker", payload: { url: parsed.toString(), status: null, sha256: null, reason }, occurredAt: fetchedAt });
    return { ok: false, reason };
  }
  clearTimeout(timeout);

  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() ?? "";
  const isText = contentType.startsWith("text/") || contentType.includes("json") || contentType.includes("xml") || contentType.includes("javascript") || contentType.includes("css");
  if (!isText) {
    approval.ledger.appendEvidenceLedgerEvent({ projectId: approval.projectId, requestId: approval.requestId, approvalId: approval.approvalId, eventType: "network_fetch_failed", actor: "kaz.network-broker", payload: { url: parsed.toString(), status: response.status, sha256: null, reason: "TEXT_CONTENT_REQUIRED" }, occurredAt: fetchedAt });
    return { ok: false, status: response.status, reason: "TEXT_CONTENT_REQUIRED" };
  }
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_RESPONSE_BYTES) {
    approval.ledger.appendEvidenceLedgerEvent({ projectId: approval.projectId, requestId: approval.requestId, approvalId: approval.approvalId, eventType: "network_fetch_failed", actor: "kaz.network-broker", payload: { url: parsed.toString(), status: response.status, sha256: null, reason: "RESPONSE_TOO_LARGE" }, occurredAt: fetchedAt });
    return { ok: false, status: response.status, reason: "RESPONSE_TOO_LARGE" };
  }

  const reader = response.body?.getReader();
  if (!reader) {
    approval.ledger.appendEvidenceLedgerEvent({ projectId: approval.projectId, requestId: approval.requestId, approvalId: approval.approvalId, eventType: "network_fetch_failed", actor: "kaz.network-broker", payload: { url: parsed.toString(), status: response.status, sha256: null, reason: "EMPTY_RESPONSE_BODY" }, occurredAt: fetchedAt });
    return { ok: false, status: response.status, reason: "EMPTY_RESPONSE_BODY" };
  }
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      totalBytes += part.value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        approval.ledger.appendEvidenceLedgerEvent({ projectId: approval.projectId, requestId: approval.requestId, approvalId: approval.approvalId, eventType: "network_fetch_failed", actor: "kaz.network-broker", payload: { url: parsed.toString(), status: response.status, sha256: null, reason: "RESPONSE_TOO_LARGE" }, occurredAt: fetchedAt });
        return { ok: false, status: response.status, reason: "RESPONSE_TOO_LARGE" };
      }
      chunks.push(part.value);
    }
  } catch {
    approval.ledger.appendEvidenceLedgerEvent({ projectId: approval.projectId, requestId: approval.requestId, approvalId: approval.approvalId, eventType: "network_fetch_failed", actor: "kaz.network-broker", payload: { url: parsed.toString(), status: response.status, sha256: null, reason: "RESPONSE_READ_FAILED" }, occurredAt: fetchedAt });
    return { ok: false, status: response.status, reason: "RESPONSE_READ_FAILED" };
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const body = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (!response.ok) {
    approval.ledger.appendEvidenceLedgerEvent({ projectId: approval.projectId, requestId: approval.requestId, approvalId: approval.approvalId, eventType: "network_fetch_failed", actor: "kaz.network-broker", payload: { url: parsed.toString(), status: response.status, contentType, sha256, reason: "HTTP_STATUS" }, occurredAt: fetchedAt });
    return { ok: false, status: response.status, reason: "HTTP_STATUS" };
  }
  approval.ledger.appendEvidenceLedgerEvent({ projectId: approval.projectId, requestId: approval.requestId, approvalId: approval.approvalId, eventType: "network_fetch_succeeded", actor: "kaz.network-broker", payload: { url: parsed.toString(), status: response.status, contentType, sha256, bytes: totalBytes }, occurredAt: fetchedAt });
  return { ok: true, status: response.status, contentType, body, sha256, fetchedAt };
}

export async function searchWeb(query: string, approval?: NetworkApproval): Promise<WebSearchResponse> {
  if (!approval?.ownerApproved || !approval.projectId.trim() || !approval.requestId.trim() || !approval.approvalId.trim() || !approval.ledger) return { ok: false, reason: "NETWORK_OWNER_APPROVAL_REQUIRED" };
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return { ok: false, reason: "SEARCH_QUERY_REQUIRED" };
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(normalizedQuery)}`;
  const fetched = await fetchUrl(searchUrl, approval);
  if (!fetched.ok) return fetched;
  const anchors = [...fetched.body.matchAll(/<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const snippets = [...fetched.body.matchAll(/<a[^>]*class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const results: WebSearchResult[] = [];
  for (let index = 0; index < anchors.length && results.length < 5; index += 1) {
    const rawHref = anchors[index][1];
    let resultUrl = rawHref.startsWith("//") ? `https:${rawHref}` : rawHref;
    try {
      const parsedResultUrl = new URL(resultUrl, searchUrl);
      const encodedTarget = parsedResultUrl.searchParams.get("uddg");
      if (encodedTarget) resultUrl = decodeURIComponent(encodedTarget);
    } catch {
      continue;
    }
    const title = anchors[index][2].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
    const snippet = (snippets[index]?.[1] ?? "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
    results.push({ title, url: resultUrl, snippet });
  }
  return { ok: true, results, fetchedAt: fetched.fetchedAt, sha256: fetched.sha256 };
}
