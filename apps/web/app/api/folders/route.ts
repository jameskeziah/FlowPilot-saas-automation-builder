import { proxyToApi } from "../_lib/proxy-to-api";

export function GET(request: Request) {
  return proxyToApi(request, "/folders", { method: "GET" });
}

export function POST(request: Request) {
  return proxyToApi(request, "/folders", { method: "POST" });
}
