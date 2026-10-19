import { useState } from 'react';
import { Activity, AlertCircle, AlertTriangle, Check, CheckCircle2, Circle, ChevronDown, Clock3, Copy, Eraser, LoaderCircle, Play, TerminalSquare } from 'lucide-react';
import * as api from '../api';

type Operation = 'search' | 'content' | 'stream';
type LogEntry = { id: number; time: string; operation: Operation; route: string; status: 'success' | 'error' | 'empty'; duration: number; detail: string };
const providers = ['megaplay', 'allmanga', 'animeparadise', 'anikoto', 'gogoanime', 'goyabu', 'mangadex', 'mangapill', 'weebcentral'];
const initialParams = { provider: providers[0], query: '', mediaId: '', unitId: '', language: 'sub' };
const routeFor = (operation: Operation) => operation === 'search' ? '/search' : operation === 'content' ? '/content' : '/stream';
const statusIcon = { success: Check, error: AlertCircle, empty: AlertTriangle };

export default function Console() {
  const [operation, setOperation] = useState<Operation>('search');
  const [params, setParams] = useState(initialParams);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [validationError, setValidationError] = useState('');
  const update = (key: keyof typeof params, value: string) => setParams((prev) => ({ ...prev, [key]: value }));

  const run = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const missing = operation === 'search' ? !params.query.trim() : operation === 'content' ? !params.mediaId.trim() : !params.unitId.trim();
    if (missing) {
      const detail = operation === 'search' ? 'Enter a search phrase to continue.' : operation === 'content' ? 'Enter a media ID from search results.' : 'Enter a unit ID from content results.';
      setValidationError(detail);
      setResult({ error: detail });
      setLogs((prev) => [...prev, { id: Date.now(), time: new Date().toLocaleTimeString(), operation, route: routeFor(operation), status: 'error', duration: 0, detail }]);
      return;
    }
    setValidationError(''); setBusy(true); setResult(null);
    const started = performance.now();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      let response: unknown;
      if (operation === 'search') response = await api.search(params.provider, params.query.trim(), controller.signal);
      else if (operation === 'content') response = await api.content(params.provider, params.mediaId.trim(), controller.signal);
      else response = await api.stream(params.provider, params.unitId.trim(), params.language, controller.signal);
      const empty = response == null || (Array.isArray(response) && response.length === 0);
      const duration = Math.round(performance.now() - started);
      setResult(response);
      setLogs((prev) => [...prev, { id: started, time: new Date().toLocaleTimeString(), operation, route: routeFor(operation), status: empty ? 'empty' : 'success', duration, detail: empty ? 'The API returned an empty response.' : 'Request completed successfully.' }]);
    } catch (error) {
      const duration = Math.round(performance.now() - started);
      const detail = controller.signal.aborted ? 'Request timed out after 15 seconds.' : error instanceof Error ? error.message : String(error);
      setResult({ error: detail });
      setLogs((prev) => [...prev, { id: started, time: new Date().toLocaleTimeString(), operation, route: routeFor(operation), status: 'error', duration, detail }]);
    } finally { window.clearTimeout(timeout); setBusy(false); }
  };

  const resultHasError = result !== null && typeof result === 'object' && 'error' in result;
  const resultIsEmpty = Array.isArray(result) && result.length === 0;
  const copy = async () => {
    if (result === null) return;
    try { await navigator.clipboard.writeText(JSON.stringify(result, null, 2)); setCopyState('copied'); }
    catch { setCopyState('error'); }
    window.setTimeout(() => setCopyState('idle'), 1800);
  };
  const clear = () => { setLogs([]); setResult(null); setValidationError(''); setCopyState('idle'); };

  return <div className="page-wrap tool-page console-page">
    <header className="page-heading"><div><p className="eyebrow"><span className="eyebrow-mark"/> REQUEST LAB <span className="eyebrow-index">02 / 04</span></p><h1>API Testing</h1><p className="lede">Run real SDK operations through the configured HTTP server. Each request is logged with timing and response details.</p></div><div className="endpoint-tag"><span>API BASE</span><code>{api.API}</code></div></header>
    <div className="console-layout">
      <section className="request-panel panel">
        <div className="panel-head"><div className="panel-kicker"><span>01</span> REQUEST BUILDER</div><span className="method-tag">GET</span></div>
        <form onSubmit={run}>
          <label className="field-label" htmlFor="operation">SDK operation</label>
          <div className="select-wrap"><select id="operation" className="control" value={operation} onChange={(e) => { setOperation(e.target.value as Operation); setValidationError(''); }}><option value="search">search(provider, query)</option><option value="content">fetchContentUnits(provider, mediaId)</option><option value="stream">resolveStream(provider, unitId, language)</option></select><ChevronDown size={15} aria-hidden="true"/></div>
          <div className="route-preview"><span>ROUTE</span><code>GET {routeFor(operation)}</code></div>
          <label className="field-label" htmlFor="provider">Provider ID</label>
          <div className="select-wrap"><select id="provider" className="control" value={params.provider} onChange={(e) => update('provider', e.target.value)}>{providers.map((p) => <option key={p} value={p}>{p}</option>)}</select><ChevronDown size={15} aria-hidden="true"/></div>
          {operation === 'search' && <><label className="field-label" htmlFor="query">Query <span>required</span></label><input id="query" className="control mono-input" value={params.query} onChange={(e) => update('query', e.target.value)} placeholder="e.g. Frieren" /></>}
          {operation === 'content' && <><label className="field-label" htmlFor="media-id">Media ID <span>from search result</span></label><input id="media-id" className="control mono-input" value={params.mediaId} onChange={(e) => update('mediaId', e.target.value)} placeholder="provider:media-id" /></>}
          {operation === 'stream' && <><label className="field-label" htmlFor="unit-id">Unit ID <span>episode or chapter</span></label><input id="unit-id" className="control mono-input" value={params.unitId} onChange={(e) => update('unitId', e.target.value)} placeholder="provider:unit-id" /><label className="field-label" htmlFor="language">Language</label><div className="select-wrap"><select id="language" className="control" value={params.language} onChange={(e) => update('language', e.target.value)}><option value="sub">sub</option><option value="dub">dub</option><option value="raw">raw</option></select><ChevronDown size={15} aria-hidden="true"/></div></>}
          {validationError && <p className="inline-error" role="alert"><AlertCircle size={15} aria-hidden="true"/>{validationError}</p>}
          <div className="request-actions"><button className="run-button" type="submit" disabled={busy}><Play size={15} fill="currentColor" aria-hidden="true"/>{busy ? 'RUNNING REQUEST' : 'RUN REQUEST'}</button><span className="timeout-label"><Clock3 size={13} aria-hidden="true"/> 15 SEC LIMIT</span></div>
        </form>
        <div className="route-capability"><Activity size={15} aria-hidden="true"/><p><strong>Available operations</strong><span>Search · Content units · Stream resolution</span></p></div>
      </section>

      <section className="response-panel panel">
        <div className="panel-head"><div className="panel-kicker"><span>02</span> RESPONSE</div><div className="response-tools"><span className={`status-chip ${busy ? 'status-running' : result === null ? 'status-idle' : result && typeof result === 'object' && 'error' in result ? 'status-error' : Array.isArray(result) && result.length === 0 ? 'status-warning' : 'status-success'}`}>{busy ? <LoaderCircle size={12} className="spin-icon" aria-hidden="true"/> : result === null ? <Circle size={12} aria-hidden="true"/> : resultHasError ? <AlertCircle size={12} aria-hidden="true"/> : resultIsEmpty ? <AlertTriangle size={12} aria-hidden="true"/> : <CheckCircle2 size={12} aria-hidden="true"/>}{busy ? 'RUNNING' : result === null ? 'WAITING' : resultHasError ? 'ERROR' : resultIsEmpty ? 'EMPTY' : 'RECEIVED'}</span><button className="icon-action" type="button" onClick={() => void copy()} disabled={result === null} aria-label="Copy JSON result" title={copyState === 'error' ? 'Clipboard unavailable' : 'Copy result'}>{copyState === 'copied' ? <Check size={16}/> : <Copy size={16}/>}</button></div></div>
        {busy && <div className="response-empty"><LoaderCircle className="spin-icon" size={24} aria-hidden="true"/><strong>Waiting for API response</strong><span>Requesting <code>{routeFor(operation)}</code> from {params.provider}</span></div>}
        {!busy && result === null && <div className="response-empty"><TerminalSquare size={25} aria-hidden="true"/><strong>Console is ready</strong><span>Submit a request to inspect its response here.</span></div>}
        {!busy && result !== null && <pre className="json-output"><code>{JSON.stringify(result, null, 2)}</code></pre>}
        {copyState === 'copied' && <span className="copy-feedback" role="status">Result copied</span>}{copyState === 'error' && <span className="copy-feedback copy-error" role="status">Clipboard access unavailable</span>}
      </section>

      <section className="log-panel panel">
        <div className="panel-head"><div className="panel-kicker"><span>03</span> EXECUTION LOG <span className="log-count">{String(logs.length).padStart(2, '0')}</span></div><button className="clear-button" type="button" onClick={clear} disabled={busy && !logs.length}><Eraser size={14} aria-hidden="true"/> CLEAR LOG</button></div>
        {logs.length === 0 ? <div className="log-idle"><span>—</span><p>No request history.<small>Validation, network errors, and successful responses appear here.</small></p></div> : <div className="log-table"><div className="log-columns"><span>TIME</span><span>OPERATION</span><span>STATUS</span><span>DURATION</span><span>DETAIL</span></div>{logs.map((log) => { const Icon = statusIcon[log.status]; return <article className={`log-row log-${log.status}`} key={log.id}><time>{log.time}</time><div className="log-operation"><strong>{log.operation}</strong><code>{log.route}</code></div><span className={`log-status ${log.status}`}><Icon size={14} aria-hidden="true"/>{log.status}</span><span className="log-duration">{log.duration} ms</span><p>{log.detail}</p></article>; })}</div>}
      </section>
    </div>
  </div>;
}
