import { Suspense } from "react";
import OrgLayoutClient from "./OrgLayoutClient";

export default function OrgSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string };
}) {
  return (
    <Suspense
      fallback={
        <div
          className="flex h-screen items-center justify-center"
          style={{ background: "var(--bg)", color: "var(--t2)", fontFamily: "var(--font-body)" }}
        >
          Loading…
        </div>
      }
    >
      <OrgLayoutClient params={params}>{children}</OrgLayoutClient>
    </Suspense>
  );
}
