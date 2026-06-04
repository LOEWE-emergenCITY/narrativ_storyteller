import DOMPurify from "https://esm.sh/dompurify@3.0.6"

export function useHTMLRenderer(htmlString: string): string {
  const allowedTags = ["i", "b", "br"]

  return DOMPurify.sanitize(htmlString, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: [],
  })
}
