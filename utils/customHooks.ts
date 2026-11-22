function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value)

  const sign = value < 0 ? "-" : ""
  const rounded = Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100
  return `${rounded === 0 ? "" : sign}${rounded.toFixed(2)}`
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "")
}

export function interpolateVariables(
  html: string,
  variables?: Map<string, string | number | boolean>,
): string {
  if (!variables) return html
  return html.replace(/\{\$(\w+)\}/g, (_, name) => {
    const value = variables.get(`$${name}`)
    if (value === undefined) return `{$${name}}`
    return typeof value === "number" ? formatNumber(value) : String(value)
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

export function renderHTML(
  htmlString: string,
  variables?: Map<string, string | number | boolean>,
): string {
  return sanitizeLimitedHtml(interpolateVariables(htmlString, variables))
}
