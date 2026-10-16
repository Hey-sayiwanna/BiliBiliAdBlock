import upstreamFixHeaders from "../upstream/Biliverse-ADBlock-v0.7.3/src/function/fixHeaders.mjs";

/**
 * 补齐 iPad Moss 引擎需要的完成状态，保留现有客户端规则。
 * Complete iPad Moss responses while preserving existing client-specific rules.
 * @param {Object} requestHeaders 请求头 / Request headers.
 * @param {Object} responseHeaders 响应头 / Response headers.
 * @returns {Object} 处理后的响应头 / Compatible response headers.
 */
export default function fixGrpcHeaders(requestHeaders, responseHeaders) {
  const request = Object.fromEntries(Object.entries(requestHeaders ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
  const headers = upstreamFixHeaders(request, responseHeaders);
  const ua = String(request["user-agent"] ?? "");
  const hasStatus = Object.keys(headers).some(key => key.toLowerCase() === "grpc-status");
  if (/(?:^|\s)bili-hd2?\//i.test(ua) && String(request["x-bili-moss-engine-type"]) === "1" && !hasStatus) {
    headers["grpc-status"] = "0";
  }
  return headers;
}
