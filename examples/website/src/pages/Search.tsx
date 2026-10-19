import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowRight, ArrowUpRight, AlertCircle, AlertTriangle, Braces, Captions, CheckCircle2, Circle, Clapperboard, Code2, LoaderCircle, Search as SearchIcon, Server, TerminalSquare } from 'lucide-react';
import * as api from '../api';

const PROVIDERS = ['megaplay', 'allmanga', 'animeparadise', 'anikoto', 'gogoanime', 'goyabu', 'mangadex', 'weebcentral', 'mangapill'];
export default function Search() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const provider = sp.get('provider') || PROVIDERS[0];
  const initialQ = sp.get('q') || '';
  const [input, setInput] = useState(initialQ);
  const { data, isFetching, isError, error } = useQuery<api.SearchResult[]>({ queryKey: ['search', provider, initialQ], queryFn: () => api.search(provider, initialQ), enabled: !!initialQ });
  const submit = (event: React.FormEvent) => { event.preventDefault(); setSp((prev) => { const next = new URLSearchParams(prev); next.set('provider', provider); if (input.trim()) next.set('q', input.trim()); else next.delete('q'); return next; }); };
  const setProvider = (value: string) => setSp((prev) => { const next = new URLSearchParams(prev); next.set('provider', value); return next; });
  const goEpisodes = (result: api.SearchResult) => navigate(`/episodes?provider=${provider}&mid=${encodeURIComponent(result.id)}&title=${encodeURIComponent(result.title)}&type=${result.catalogType}`);
  return <div className="page-wrap dashboard-page">
    <section className="hero-layout">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-mark"/> UNIFIED SCRAPER WORKSPACE <span className="eyebrow-index">01 / 04</span></p>
        <h1>Scrape.<br/><span>Inspect.</span><br/>Understand.</h1>
        <p className="hero-description">Explore anime and manga catalogues, inspect normalized results, and resolve media through the SDK operations you control.</p>
        <div className="hero-actions"><Link className="hero-primary" to="/console"><TerminalSquare size={17} aria-hidden="true"/> Open API console <ArrowUpRight size={15} aria-hidden="true"/></Link><Link className="hero-secondary" to="/subtitles"><Captions size={17} aria-hidden="true"/> Test subtitles</Link></div>
      </div>
      <aside className="workflow-panel" aria-label="SDK request flow">
        <div className="workflow-head"><span><Braces size={15} aria-hidden="true"/> REQUEST FLOW</span><span className="workflow-meta">SDK / HTTP</span></div>
        <div className="workflow-intro">Three real operations.<br/>One normalized workflow.</div>
        <div className="workflow-step"><span className="workflow-num">01</span><div><code>GET /search</code><small>query → catalogue entries</small></div><SearchIcon size={16} aria-hidden="true"/></div>
        <div className="flow-connector" aria-hidden="true"><i/></div>
        <div className="workflow-step"><span className="workflow-num">02</span><div><code>GET /content</code><small>media ID → units</small></div><Server size={16} aria-hidden="true"/></div>
        <div className="flow-connector" aria-hidden="true"><i/></div>
        <div className="workflow-step"><span className="workflow-num">03</span><div><code>GET /stream</code><small>unit ID → resolved media</small></div><ArrowDownRight size={16} aria-hidden="true"/></div>
        <div className="workflow-foot"><span className="signal-dot"/> Calls require your configured API server</div>
      </aside>
    </section>

    <section className="action-rail" aria-label="Quick actions">
      <Link to="/console" className="action-link action-main"><span className="action-icon"><Code2 size={19} aria-hidden="true"/></span><span><small>TEST AN ENDPOINT</small><strong>API Testing Console</strong></span><ArrowUpRight size={17} aria-hidden="true"/></Link>
      <Link to="/stream" className="action-link"><span className="action-icon"><Clapperboard size={19} aria-hidden="true"/></span><span><small>PLAY A RESOLVED SOURCE</small><strong>Open Player</strong></span><ArrowRight size={16} aria-hidden="true"/></Link>
      <Link to="/subtitles" className="action-link"><span className="action-icon"><Captions size={19} aria-hidden="true"/></span><span><small>LOCAL FILE TOOLS</small><strong>Subtitle Testing</strong></span><ArrowRight size={16} aria-hidden="true"/></Link>
    </section>

    <section className="catalogue-section">
      <div className="section-heading"><div><p className="eyebrow">LIVE REQUEST <span className="eyebrow-index">02 / 04</span></p><h2>Inspect a catalogue</h2></div><p>Searches call the selected provider through the SDK API. No sample response is inserted.</p></div>
      <div className="catalogue-layout">
        <div className="search-console panel">
          <div className="panel-kicker"><span>01</span> PROVIDER SELECTOR</div>
          <label className="field-label" htmlFor="provider-select">Provider ID <span>SDK registry</span></label>
          <select id="provider-select" className="control" value={provider} onChange={(e) => setProvider(e.target.value)}>{PROVIDERS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <form onSubmit={submit} className="search-form"><label className="field-label" htmlFor="anime-query">Search phrase</label><div className="search-input-wrap"><SearchIcon size={17} aria-hidden="true"/><input id="anime-query" className="control" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Try a title, e.g. Frieren"/><button className="search-submit" type="submit" aria-label="Search catalogue" disabled={isFetching}>{isFetching ? <span className="mini-spinner"/> : <ArrowUpRight size={19} aria-hidden="true"/>}</button></div></form>
          <div className="provider-ids"><span>AVAILABLE PROVIDER IDS</span><p>{PROVIDERS.join(' / ')}</p></div>
        </div>
        <div className="results-console panel" aria-live="polite">
          <div className="result-head"><div><div className="panel-kicker"><span>02</span> RESPONSE PREVIEW</div><h3>{isFetching ? 'Request in progress' : isError ? 'Request failed' : data ? 'Search response' : 'Awaiting request'}</h3></div><span className={`status-chip ${isFetching ? 'status-running' : isError ? 'status-error' : data?.length === 0 ? 'status-warning' : data ? 'status-success' : 'status-idle'}`}>{isFetching ? <LoaderCircle size={12} className="spin-icon" aria-hidden="true"/> : isError ? <AlertCircle size={12} aria-hidden="true"/> : data?.length === 0 ? <AlertTriangle size={12} aria-hidden="true"/> : data ? <CheckCircle2 size={12} aria-hidden="true"/> : <Circle size={12} aria-hidden="true"/>}{isFetching ? 'RUNNING' : isError ? 'ERROR' : data?.length === 0 ? 'EMPTY' : data ? 'RECEIVED' : 'IDLE'}</span></div>
          {isFetching && <div className="result-empty"><span className="large-spinner"/><strong>Requesting {provider}</strong><p>Waiting for the API response.</p></div>}
          {isError && <div className="result-error" role="alert"><strong>Could not search this provider</strong><p>{String(error)}</p><small>Check that the API server is running and the upstream provider is reachable.</small></div>}
          {!isFetching && !isError && !data && <div className="result-empty"><span className="empty-glyph"><SearchIcon size={21} aria-hidden="true"/></span><strong>No request yet</strong><p>Choose a provider and search phrase to inspect a real response.</p></div>}
          {!isFetching && data?.length === 0 && <div className="result-empty"><span className="empty-glyph">∅</span><strong>No results returned</strong><p>The provider returned an empty result set for this query.</p></div>}
          {data && data.length > 0 && <div className="result-list">{data.map((item) => <button key={item.id} onClick={() => goEpisodes(item)} className="result-row"><span className="result-number">{String(data.indexOf(item) + 1).padStart(2, '0')}</span><span className="result-title">{item.title}<small>{item.id}</small></span><span className="result-badges">{item.availableLanguages?.map((lang) => <span className="mini-badge" key={lang}>{lang}</span>)}<span className="mini-badge type-badge">{item.catalogType}</span></span><ArrowUpRight className="result-arrow" size={16} aria-hidden="true"/></button>)}</div>}
          <div className="result-footer"><span>SDK RESPONSE</span><span>{data ? `${data.length} item${data.length === 1 ? '' : 's'}` : '—'}</span></div>
        </div>
      </div>
    </section>
  </div>;
}
