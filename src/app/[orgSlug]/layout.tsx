import OrgLayoutClient from "./OrgLayoutClient";

export default function OrgSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string };
}) {
  return <OrgLayoutClient params={params}>{children}</OrgLayoutClient>;
}
