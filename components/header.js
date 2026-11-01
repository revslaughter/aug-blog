import Link from "next/link";
import { useRouter } from "next/router";

function HeaderLink({ title, href, currentPath }) {
  const isCurrent = currentPath === href;
  return (
    <div className="headerNavLink">
      <Link href={href} aria-current={isCurrent ? "page" : undefined}>
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
  const { asPath } = useRouter();
  const currentPath = asPath.split(/[?#]/)[0].replace(/(.)\/$/, "$1");
  return (
    <nav className="headerNav">
      {links.map(({ title, href }) => (
        <HeaderLink {...{ title, href, currentPath }} key={href} />
      ))}
    </nav>
  );
}
