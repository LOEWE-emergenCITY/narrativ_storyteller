const footerLinks = [
  { label: "eHub Cities", href: "https://ehubcities.de/" },
  {
    label: "Impressum",
    href: "https://www.tu-darmstadt.de/impressum/index.de.jsp",
  },
]

export function Footer() {
  return (
    <footer
      aria-label="Footer links"
      class="sticky bottom-0 z-20 flex h-[var(--app-footer-height)] shrink-0 items-center justify-center gap-4 bg-app-bg/70 text-xs text-text-theme-muted backdrop-blur-sm"
    >
      {footerLinks.map((link) => (
        <a
          class="hover:text-text-theme"
          href={link.href}
          key={link.label}
          target="_blank"
          rel="noopener noreferrer"
        >
          {link.label}
        </a>
      ))}
    </footer>
  )
}
