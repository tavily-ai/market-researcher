const Header = () => {
  return (
    <header>
      <nav className="site-nav" aria-label="Main navigation">
        <a
          href="https://tavily.com"
          target="_blank"
          rel="noreferrer"
          className="brand-link"
          aria-label="Tavily website"
        >
          <img src="/tavily-by-nebius.svg" alt="Tavily by Nebius" className="brand-logo" />
        </a>
        <div className="nav-actions">
          <a
            href="https://github.com/tavily-ai/market-researcher"
            target="_blank"
            rel="noreferrer"
            className="nav-link"
            aria-label="View Market Researcher on GitHub"
            title="View on GitHub"
          >
            <img src="/github-icon.png" alt="" className="github-logo" />
          </a>
        </div>
      </nav>
    </header>
  );
};

export default Header;
