import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

const LOCALES = ["en", "es", "pt"] as const;
type Locale = typeof LOCALES[number];

function detectLocale(): Locale {
  // 1. Check cookie
  const cookieStore = cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value as Locale;
  if (cookieLocale && LOCALES.includes(cookieLocale)) return cookieLocale;

  // 2. Check Accept-Language header
  const acceptLanguage = headers().get("accept-language") || "";
  if (acceptLanguage.includes("es")) return "es";
  if (acceptLanguage.includes("pt")) return "pt";

  return "en";
}

export default getRequestConfig(async () => {
  const locale = detectLocale();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
