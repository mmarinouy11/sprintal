"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useT } from "@/lib/i18n";

export default function OrgNotFound() {
  const params = useParams<{ orgSlug: string }>();
  const slug = typeof params?.orgSlug === "string" ? params.orgSlug : "";
  const t = useT("errors");

  return (
    <div
      className="px-8 py-12 max-w-lg mx-auto text-center"
      style={{ fontFamily: "'Outfit', var(--font-body), sans-serif" }}
    >
      <h1
        className="text-2xl font-bold mb-3"
        style={{ color: "#5C6AC4", fontFamily: "'Outfit', var(--font-display), sans-serif" }}
      >
        {t("orgNotFoundTitle")}
      </h1>
      <p className="text-body mb-6" style={{ color: "var(--t2)" }}>
        {t("orgNotFoundBody")}
      </p>
      {slug ? (
        <Link
          href={`/${slug}/dashboard`}
          className="btn-primary"
          style={{ textDecoration: "none", display: "inline-block" }}
        >
          {t("backToDashboard")}
        </Link>
      ) : (
        <Link href="/" className="btn-primary" style={{ textDecoration: "none", display: "inline-block" }}>
          {t("goHome")}
        </Link>
      )}
    </div>
  );
}
