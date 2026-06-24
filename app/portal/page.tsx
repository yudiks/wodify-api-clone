import { Suspense } from "react";
import ClientPortal from "@/components/ClientPortal";

export default function PortalPage() {
  return (
    <Suspense fallback={null}>
      <ClientPortal />
    </Suspense>
  );
}
