import { Fragment } from 'react';
import { Link, NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { Captions, Clapperboard, Code2, LayoutDashboard } from 'lucide-react';

interface Crumb { label: string; href?: string }
function buildCrumbs(pathname: string, sp: URLSearchParams): Crumb[] {
  const provider = sp.get('provider');
  const title = sp.get('title');
  const ep = sp.get('ep');
  const crumbs: Crumb[] = [{ label: 'KXScraper', href: '/' }];
  if (provider) crumbs.push({ label: provider });
  if (title) crumbs.push({ label: title, href: pathname === '/episodes' ? undefined : `/episodes?provider=${provider}&mid=${encodeURIComponent(sp.get('mid') || '')}&title=${encodeURIComponent(title)}&type=${sp.get('type') || 'ANIME'}` });
  if (ep) crumbs.push({ label: ep });
  return crumbs;
}

const nav = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/console', label: 'API Testing', Icon: Code2 },
  { to: '/stream', label: 'Player', Icon: Clapperboard },
  { to: '/subtitles', label: 'Subtitle Testing', Icon: Captions },
];

export default function Layout() {
  const loc = useLocation();
  const [sp] = useSearchParams();
  const crumbs = buildCrumbs(loc.pathname, sp);
  return (
    <div className="app-shell">
      <div className="signal-line" aria-hidden="true" />
      <aside className="sidebar">
        <Link to="/" className="brand" aria-label="KXScraper dashboard">
          <span className="brand-mark"><Code2 size={20} strokeWidth={2.5} aria-hidden="true" /></span>
          <span className="brand-copy"><strong>KX<span>Scraper</span></strong><small>DEVELOPER TOOLKIT</small></span>
        </Link>
        <div className="side-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {nav.map(({ to, label, Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive || (to === '/' && loc.pathname === '/episodes') ? ' active' : ''}`}><Icon size={17} strokeWidth={1.8} aria-hidden="true"/><span>{label}</span><span className="nav-arrow" aria-hidden="true">↗</span></NavLink>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-label">SDK OPERATIONS</div>
          <div className="operation-list"><span><i /> Search catalogue</span><span><i /> Fetch content units</span><span><i /> Resolve stream</span></div>
          <p className="sidebar-note">Requests run through your configured API server. Provider results depend on upstream availability.</p>
        </div>
        <div className="sidebar-foot"><span>LOCAL TOOLS</span><span>v1 / WEB</span></div>
      </aside>
      <div className="workspace">
        <header className="mobile-header">
          <Link to="/" className="brand" aria-label="KXScraper dashboard"><span className="brand-mark"><Code2 size={19} aria-hidden="true"/></span><span className="brand-copy"><strong>KX<span>Scraper</span></strong></span></Link>
          <span className="mobile-caption">SDK WORKSPACE</span>
        </header>
        <div className="mobile-nav" aria-label="Main navigation">
          {nav.map(({ to, label, Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `mobile-nav-link${isActive || (to === '/' && loc.pathname === '/episodes') ? ' active' : ''}`} aria-label={label} title={label}><Icon size={18} aria-hidden="true"/><span>{label}</span></NavLink>)}
        </div>
        <main className="main-shell">
          {(loc.pathname === '/episodes' || (loc.pathname === '/stream' && sp.has('title'))) && <div className="breadcrumbs">{crumbs.map((c, i) => <Fragment key={`${c.label}-${i}`}>{i > 0 && <span aria-hidden="true">/</span>}{c.href ? <Link to={c.href}>{c.label}</Link> : <span>{c.label}</span>}</Fragment>)}</div>}
          <Outlet />
          <footer className="site-footer"><span>KXScraper <span className="dim">/</span> inspect data, keep control</span><span>Local subtitle files stay in this browser.</span></footer>
        </main>
      </div>
    </div>
  );
}
