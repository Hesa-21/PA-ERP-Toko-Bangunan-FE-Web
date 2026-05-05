type PosAuditStatus = "SUCCESS" | "FAILED"

type PosAuditInput = {
  event: "POS_SALES_POST"
  status: PosAuditStatus
  branch?: string
  saleId?: string
  actorUserId?: string
  actorRole?: string
  idempotencyKey?: string
  clientIp?: string
  message?: string
}

export function logPosAudit(input: PosAuditInput) {
  const payload = {
    domain: "pos",
    at: new Date().toISOString(),
    event: input.event,
    status: input.status,
    branch: input.branch,
    saleId: input.saleId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    idempotencyKey: input.idempotencyKey,
    clientIp: input.clientIp,
    message: input.message,
  }

  const line = `[pos-audit] ${JSON.stringify(payload)}`
  if (input.status === "FAILED") {
    console.warn(line)
    return
  }

  console.info(line)
}