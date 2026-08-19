import Link from "next/link";
import { useRouter } from "next/router";

// Normalise a path for comparison: drop any trailing slash so "/about/" and
// "/about" match, but keep the root as "/".
function normalizePath(path) {
  if (!path) return "/";
  const withoutQuery = path.split(/[?#]/)[0];
  const trimmed = withoutQuery.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

function HeaderLink({ title, href, current }) {
  const isActive = normalizePath(href) === current;
  return (
    <div className="headerNavLink">
      <Link href={href} aria-current={isActive ? "page" : undefined}>
        {title}
      </Link>
    </div>
  );
}

/**
 *
 * @param {{links: {title: string, href: string}[]}} props
 * @returns
 */
export default function Header({ links }) {
  const router = useRouter();
  // asPath carries the actual URL the visitor is on; fall back to pathname.
  const current = normalizePath(router.asPath || router.pathname);
  return (
    <nav className="headerNav">
      {links.map(({ title, href }) => (
        <HeaderLink {...{ title, href, current }} key={href} />
      ))}
    </nav>
  );
}
