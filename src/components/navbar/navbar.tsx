export function Navbar() {
  return (
    <nav>
      <ul className="flex justify-between pt-4">
        <li>
          <a>fill_r</a>
        </li>
        <li className="flex gap-1 text-white p-1.5  rounded-full ">
          <a className="px-4 py-1 ">about</a>
          <a className="px-4  py-1 ">uploads</a>
          <a href="/pages/analysis" className="px-4 py-1 ">
            analysis
          </a>
        </li>
        <li>
          <a>Log in</a>
          <a>sign in</a>
        </li>
      </ul>
    </nav>
  );
}
