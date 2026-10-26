// Hợp đồng: baogia_be/docs/06_FE_CONTRACT.md — mục "Nhà cung cấp". Id là chuỗi.
export type Supplier = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  zaloUserId: string | null;
  note: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type SupplierForm = {
  id?: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  zaloUserId: string;
  note: string;
};
