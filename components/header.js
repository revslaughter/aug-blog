import Link from "next/link";

function HeaderLink({ title, href }) {
  return (
    <div className="headerNavLink">
      <Link {...{ href }}>
        <a>{title}</a>
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
  return (
    <nav className="headerNav">
      {links.map(({ title, href }) => (
        <HeaderLink {...{ title, href }} key={href} />
      ))}
    </nav>
  );
}
