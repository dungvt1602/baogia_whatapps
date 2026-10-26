/*
 * Kiểu dữ liệu khớp hợp đồng BE (baogia_be/docs/06_FE_CONTRACT.md — mục RFQ).
 * Quy ước: id là CHUỖI (BigInt), tiền/số lượng là CHUỖI số thập phân (Decimal) — không ép sang number,
 * thời gian là ISO-8601.
 */
export type RfqStatus = "DRAFT" | "SENT" | "CLOSED";
export type InvitationStatus = "PENDING" | "SENT" | "VIEWED" | "SUBMITTED" | "EXPIRED" | "FAILED";

export type RfqListRow = {
  id: string;
  code: string;
  title: string;
  status: RfqStatus;
  currency: string;
  deadline: string | null;
  createdAt: string;
  itemCount: number | string;
  invitationCount: number | string;
  submittedCount: number | string;
};

export type RfqItem = {
  id: string;
  no: number | string;
  product: string;
  spec: string | null;
  unit: string | null;
  quantity: string | null;
  note: string | null;
};

export type RfqInvitation = {
  id: string;
  supplierId: string | null;
  supplierName: string;
  status: InvitationStatus;
  isTest: boolean;
  sentAt: string | null;
  viewedAt: string | null;
  submittedAt: string | null;
  error: string | null;
};

export type RfqDetail = {
  id: string;
  code: string;
  title: string;
  note: string | null;
  currency: string;
  deadline: string | null;
  status: RfqStatus;
  hasImage: boolean;
  createdAt: string;
  items: RfqItem[];
  invitations: RfqInvitation[];
};

// Nhà cung cấp rút gọn dùng ở màn chọn người nhận (không import feature suppliers).
export type RfqSupplierOption = {
  id: string;
  name: string;
  company: string | null;
  phone?: string | null;
  zaloUserId: string | null;
};

export type SendResult = {
  supplierId: string;
  supplierName: string;
  ok: boolean;
  status: string;
  error?: string;
  invitationId?: string;
};
export type SendResponse = { results: SendResult[] };

export type TestRecipient = { userId: string; name: string; zaloUserId: string };
export type TestSendResponse = {
  ok: boolean;
  mode?: "list" | "text";
  link?: string;
  error?: string;
  listError?: string;
  resolvedUserId?: string; // có khi BE tra SĐT -> Zalo user_id
  zalo?: unknown;
};

export type CompareSupplier = {
  invitationId: string;
  supplierId: string;
  name: string;
  status: InvitationStatus;
  submittedAt: string | null;
  version: number | string | null;
  currency: string | null;
  note: string | null;
};
export type ComparePrice = {
  invitationId: string;
  unitPrice: string;
  moq: string | null;
  leadTimeDays: number | string | null;
  note: string | null;
};
export type CompareRow = {
  itemId: string;
  no: number | string;
  product: string;
  unit: string | null;
  quantity: string | null;
  prices: (ComparePrice | null)[];
  bestInvitationId: string | null;
};
export type CompareData = {
  rfq: { id: string; code: string; title: string; currency: string; deadline: string | null; status: RfqStatus };
  suppliers: CompareSupplier[];
  rows: CompareRow[];
};

// ---- Trang công khai ----
export type PublicQuoteItemValue = {
  rfqItemId: string;
  unitPrice: string;
  moq?: string | null;
  leadTimeDays?: number | string | null;
  note?: string | null;
};
export type PublicRfq = {
  rfq: {
    code: string;
    title: string;
    note: string | null;
    currency: string;
    deadline: string | null;
    hasImage: boolean;
    imageUrl: string | null;
  };
  supplierName: string;
  isTest: boolean;
  expired: boolean;
  canSubmit: boolean;
  items: RfqItem[];
  quote: {
    version: number | string;
    currency: string | null;
    validUntil: string | null;
    note: string | null;
    items: PublicQuoteItemValue[];
  } | null;
};
