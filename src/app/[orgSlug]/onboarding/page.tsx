"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Onboarding moved to /onboarding/[orgSlug] to avoid layout loop
export default function OnboardingRedirect() {
  const params = useParams();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/onboarding/${params.orgSlug}`);
  }, []);
  return null;
}
