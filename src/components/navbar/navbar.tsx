export function Navbar() {
  return (
    <nav>
      <ul className="flex justify-between">
        <li>
          <a>fill_r</a>
        </li>
        <li className="flex gap-4">
          <a>about</a>
          <a>uploads</a>
          <a href="/pages/analysis">analysis</a>
        </li>
        <li>
          <a>Log in</a>
          <a>sign in</a>
        </li>
      </ul>
    </nav>
  );
}
