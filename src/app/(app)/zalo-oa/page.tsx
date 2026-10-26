import { Suspense } from "react";
import ZaloScreen from "@/features/zalo/components/zalo-screen";

// Suspense: ZaloScreen dùng useSearchParams (đọc ?zalo=ok|err khi Zalo callback quay về).
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ZaloScreen />
    </Suspense>
  );
}
