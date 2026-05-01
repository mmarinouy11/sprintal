"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function OrgError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams<{ orgSlug: string }>();
  const slug = typeof params?.orgSlug === "string" ? params.orgSlug : "";

  return (
    <div
      className="px-8 py-12 max-w-lg mx-auto text-center"
      style={{ fontFamily: "'Outfit', var(--font-body), sans-serif" }}
    >
      <h1
        className="text-2xl font-bold mb-3"
        style={{ color: "#5C6AC4", fontFamily: "'Outfit', var(--font-display), sans-serif" }}
      >
        Something went wrong
      </h1>
      <p className="text-body mb-6" style={{ color: "var(--t2)" }}>
        Something went wrong loading this page.
      </p>
      {process.env.NODE_ENV === "development" && error?.message ? (
        <pre
          className="text-left text-xs mb-6 p-3 rounded overflow-auto"
          style={{ background: "var(--raised)", color: "var(--t3)", maxHeight: 120 }}
        >
          {error.message}
        </pre>
      ) : null}
      <div className="flex flex-wrap gap-3 justify-center">
        <button type="button" className="btn-primary" onClick={() => reset()}>
          Try again
        </button>
        {slug ? (
          <Link href={`/${slug}/dashboard`} className="btn-ghost" style={{ textDecoration: "none" }}>
            Back to dashboard
          </Link>
        ) : (
          <Link href="/" className="btn-ghost" style={{ textDecoration: "none" }}>
            Home
          </Link>
        )}
      </div>
    </div>
  );
}
