/*
 * Tiện ích lấy thông báo lỗi từ một lỗi bắt được (catch).
 * Trả về err.message nếu là Error, ngược lại trả về fallback.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
