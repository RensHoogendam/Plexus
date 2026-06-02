import { useFetch } from "@raycast/utils";

// The favicon/title probes are progressive enhancements: the row already renders with
// the project name as a fallback, so a slow or unresponsive server never blocks it.
// keepPreviousData must stay false so one server's icon/title can't bleed onto another
// row as the list re-renders.

export function useServiceIcon(url: string) {
  const faviconUrl = `${url}/favicon.ico`;
  const { isLoading, data, error } = useFetch<boolean | undefined>(faviconUrl, {
    method: "HEAD",
    execute: true,
    keepPreviousData: false,
    parseResponse: async (response) => (response.ok ? true : undefined),
  });

  return {
    isLoading,
    favicon: data ? faviconUrl : undefined,
    error,
  };
}

export function usePageTitle(url: string) {
  const { isLoading, data, error } = useFetch<string | undefined>(url, {
    execute: true,
    keepPreviousData: false,
    parseResponse: async (response) => (response.ok ? response.text() : undefined),
  });

  let title: string | undefined = undefined;
  if (data) {
    const html = data;
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
  }

  return {
    isLoading,
    title,
    error,
  };
}
