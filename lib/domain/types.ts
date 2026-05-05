export type ISODateTimeString = string

export type DocStatus = "DRAFT" | "POSTED" | "VOID"

export type PriceTier = "retail" | "partai" | "cabang"

export type Money = number

export type DomainError =
  | {
      code:
        | "INVALID_INPUT"
        | "INVALID_STATUS_TRANSITION"
        | "NOT_FOUND"
        | "INSUFFICIENT_STOCK"
      message: string
      details?: Record<string, unknown>
    }

export type StockLedgerEntry = {
  id: string
  branchId: string
  warehouseId?: string
  sku: string
  qtyDelta: number
  reason: string
  sourceDocumentType:
    | "STOCK_ADJUSTMENT"
    | "SALES"
    | "PURCHASE_RECEIPT"
    | "RETURN"
    | "WAREHOUSE_TRANSFER"
    | "WAREHOUSE_WRITE_OFF"
  sourceDocumentId: string
  sourceLineId?: string
  note?: string
  createdAt: ISODateTimeString
  createdBy: string
}

export type PurchaseLine = {
  id: string
  sku: string
  quantity: number
  receivedQty: number
  customerPhone?: string
  unitCost: Money
  discount: Money
  warehouseId?: string
}

export type PurchasePaymentStatus = "tunai" | "tempo"

export type PurchaseDocument = {
  id: string
  branchId: string
  status: DocStatus
  createdAt: ISODateTimeString
  createdBy: string
  postedAt?: ISODateTimeString
  postedBy?: string

  warehouseId?: string

  supplierName?: string
  supplierPhone?: string
  supplierAddress?: string
  paymentStatus: PurchasePaymentStatus
  paidAmount?: Money
  dueDate?: ISODateTimeString

  expectedDelivery?: ISODateTimeString

  note?: string
  items: PurchaseLine[]
}

export type ReturnType = "CUSTOMER" | "SUPPLIER"

export type ReturnCondition = "GOOD" | "DAMAGED" | "EXPIRED"

export type ReturnLine = {
  id: string
  sku: string
  quantity: number
  unitRefund: Money
  reason: string
  sourceLineId?: string
}

export type ReturnSourceDocumentType = "SALES" | "PURCHASE"

export type ReturnAuditTrail = {
  createdByUserId?: string
  createdByRole?: string
  postedByUserId?: string
  postedByRole?: string
  postedAt?: ISODateTimeString
  voidedByUserId?: string
  voidedByRole?: string
  voidedAt?: ISODateTimeString
}

export type ReturnAuditAction = "CREATED" | "POSTED" | "VOIDED"

export type ReturnAuditEvent = {
  action: ReturnAuditAction
  at: ISODateTimeString
  actorName: string
  actorUserId?: string
  actorRole?: string
}

export type ReturnDocument = {
  id: string
  branchId: string
  status: DocStatus
  createdAt: ISODateTimeString
  createdBy: string
  postedAt?: ISODateTimeString
  postedBy?: string

  type: ReturnType
  condition: ReturnCondition

  customerOrSupplierName?: string
  originalSalesId?: string
  sourceDocumentType?: ReturnSourceDocumentType
  sourceDocumentId?: string
  note?: string
  auditTrail?: ReturnAuditTrail
  auditEvents?: ReturnAuditEvent[]

  warehouseId?: string
  items: ReturnLine[]
}

export type StockAdjustmentLine = {
  id: string
  sku: string
  qtyDelta: number
  reason: string
  note?: string
}

export type StockAdjustmentDocument = {
  id: string
  branchId: string
  status: DocStatus
  createdAt: ISODateTimeString
  createdBy: string
  postedAt?: ISODateTimeString
  postedBy?: string
  note?: string
  lines: StockAdjustmentLine[]
}

export type SalesLine = {
  id: string
  sku: string
  quantity: number
  unitPrice: Money
  discount: Money
  priceTier: PriceTier
  warehouseId?: string
}

export type SalesDocument = {
  id: string
  branchId: string
  status: DocStatus
  createdAt: ISODateTimeString
  createdBy: string
  postedAt?: ISODateTimeString
  postedBy?: string

  salespersonName?: string

  customerName?: string
  customerAddress?: string
  customerPhone?: string

  paymentStatus: "tunai" | "tempo"
  paidAmount?: Money
  dueDate?: ISODateTimeString
  orderDiscount: Money
  items: SalesLine[]
}
