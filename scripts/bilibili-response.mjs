import { Console, done } from "@nsnanocat/util";
import gRPC from "@nsnanocat/grpc";
import { Response } from "../upstream/Biliverse-ADBlock-v0.7.5/src/process/Response.mjs";
import fixGrpcHeaders from "./fix-grpc-headers.mjs";

// 上游错误必须保留，避免将网络失败重写成空的成功响应。
// Preserve upstream errors instead of rewriting failures as empty successful replies.
!(async () => {
  let output = {};
  try {
    const status = Number($response.status ?? $response.statusCode ?? 200);
    const headers = Object.fromEntries(Object.entries($response.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
    let grpcStatus = headers["grpc-status"];
    // gRPC-Web 的失败状态可能只存在于二进制尾帧中。
    // A gRPC-Web failure status can exist only in its binary trailer frame.
    if (String(headers["content-type"]).split(";")[0].trim() === "application/grpc-web") {
      const bytes = new Uint8Array($response.bodyBytes ?? $response.body ?? []);
      const trailerStatus = gRPC.decodeWeb(bytes).header["grpc-status"];
      if (trailerStatus !== undefined && String(trailerStatus).trim() !== "0") grpcStatus = trailerStatus;
    }
    if (status >= 200 && status < 300 && (grpcStatus === undefined || String(grpcStatus).trim() === "0")) {
      output = await Response($request, { ...$response, headers: { ...$response.headers } });
      if (["application/grpc", "application/grpc+proto", "application/grpc-web"].includes(String(headers["content-type"]).split(";")[0].trim())) {
        output.headers = fixGrpcHeaders($request.headers, output.headers);
      }
      // Surge 不应同时收到改写后的 body 与旧的 bodyBytes。
      // Do not return rewritten body alongside stale bodyBytes in Surge.
      if (output.body !== undefined) delete output.bodyBytes;
    }
  } catch (error) {
    Console.error(error);
  }
  done(output);
})();
