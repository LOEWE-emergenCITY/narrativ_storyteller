import DOMPurify from "https://esm.sh/dompurify@3.0.6"

export function interpolateVariables(
  html: string,
  variables?: Map<string, string | number | boolean>,
): string {
  if (!variables) return html
  return html.replace(/\{\$(\w+)\}/g, (_, name) => {
    const value = variables.get(`$${name}`)
    return value !== undefined ? String(value) : `{$${name}}`
  })
}

export function useHTMLRenderer(htmlString: string): string {
  const allowedTags = ["i", "b", "br"]

  return DOMPurify.sanitize(htmlString, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: [],
  })
}
