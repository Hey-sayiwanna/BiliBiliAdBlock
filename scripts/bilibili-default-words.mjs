import fixGrpcHeaders from "./fix-grpc-headers.mjs";

// 静态空响应无法适配不同客户端的 gRPC 状态要求。
// A static empty response cannot honor different clients' gRPC status requirements.
$done({
  response: {
    status: 200,
    headers: fixGrpcHeaders($request.headers, {
      "Content-Type": "application/grpc",
      "Content-Length": "5",
      "grpc-status": "0",
    }),
    body: new Uint8Array(5),
  },
});
