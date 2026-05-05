import { resolveClientIpFromRequest } from "@/lib/http/client-ip"

export function resolveClientIp(request: Request) {
  return resolveClientIpFromRequest(request, {
    trustProxyEnvKeys: ["AUTH_TRUST_PROXY_HEADERS", "TRUST_PROXY_HEADERS"],
    trustedProxyCidrsEnvKeys: ["AUTH_TRUSTED_PROXY_CIDRS", "TRUSTED_PROXY_CIDRS"],
    fallbackIp: "unknown",
  })
}
