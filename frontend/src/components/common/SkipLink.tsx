interface SkipLinkProps {
  href: string
  children: string
}

export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a href={href} className="skip-link">
      {children}
    </a>
  )
}