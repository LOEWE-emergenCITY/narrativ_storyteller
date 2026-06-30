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

function escapeHtml(html: string): string {
  return html
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function sanitizeLimitedHtml(htmlString: string): string {
  return escapeHtml(htmlString)
    .replaceAll("&lt;i&gt;", "<i>")
    .replaceAll("&lt;/i&gt;", "</i>")
    .replaceAll("&lt;b&gt;", "<b>")
    .replaceAll("&lt;/b&gt;", "</b>")
    .replaceAll("&lt;br&gt;", "<br>")
    .replaceAll("&lt;br/&gt;", "<br>")
    .replaceAll("&lt;br /&gt;", "<br>")
}

export function useHTMLRenderer(
  htmlString: string,
  variables?: Map<string, string | number | boolean>,
): string {
  return sanitizeLimitedHtml(interpolateVariables(htmlString, variables))
}
