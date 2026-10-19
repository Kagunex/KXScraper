import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, Check, CheckCircle2, Clipboard, Download, FileAudio2, FileCheck2, FileText, FolderOpen, ShieldCheck } from 'lucide-react';
import { parseSubtitleFile, subtitleCuesToVtt, type SubtitleCue } from '../../../../src/utils/subtitleText.js';

type CheckRow = { name: string; passed: boolean; detail: string };
const samples = [
  { name: 'Valid SRT', filename: 'sample.srt', text: '1\n00:00:01,000 --> 00:00:02,500\nHello from a local subtitle.\n\n2\n00:00:03,000 --> 00:00:04,000\nKXScraper subtitle preview.' },
  { name: 'Valid VTT', filename: 'sample.vtt', text: 'WEBVTT\n\n00:01.000 --> 00:02.500\nValid WebVTT cue.' },
  { name: 'Empty file', filename: 'empty.srt', text: '' },
  { name: 'Malformed timestamp', filename: 'broken.srt', text: '00:99:99,000 --> 00:99:99,999\nInvalid timestamp.' },
  { name: 'Cue without text', filename: 'empty-cue.srt', text: '00:00:01,000 --> 00:00:02,000\n' },
];
const stamp = (ms: number) => `${String(Math.floor(ms / 3_600_000)).padStart(2, '0')}:${String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, '0')}:${String(Math.floor((ms % 60_000) / 1_000)).padStart(2, '0')}.${String(ms % 1_000).padStart(3, '0')}`;

export default function SubtitleTesting() {
  const [filename, setFilename] = useState('');
  const [format, setFormat] = useState<'SRT' | 'VTT' | null>(null);
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [error, setError] = useState('');
  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [notice, setNotice] = useState('');
  const readSequence = useRef(0);
  const converted = useMemo(() => cues.length ? subtitleCuesToVtt(cues) : '', [cues]);

  const loadFile = async (file?: File) => {
    const sequence = ++readSequence.current;
    setNotice(''); setError(''); setCues([]); setFormat(null); setFilename(file?.name ?? '');
    if (!file) return;
    const extension = file.name.toLowerCase().match(/\.(srt|vtt)$/)?.[1];
    setFormat(extension ? extension.toUpperCase() as 'SRT' | 'VTT' : null);
    try {
      const text = await file.text();
      if (sequence !== readSequence.current) return;
      const parsed = parseSubtitleFile(file.name, text);
      setCues(parsed);
      setFormat(extension === 'srt' ? 'SRT' : 'VTT');
    } catch (cause) {
      if (sequence !== readSequence.current) return;
      setError(cause instanceof Error ? cause.message : 'Could not read this subtitle file.');
    }
  };

  const runChecks = () => setChecks(samples.map((sample): CheckRow => {
    const shouldPass = sample.name.startsWith('Valid');
    try {
      const parsed = parseSubtitleFile(sample.filename, sample.text);
      return { name: sample.name, passed: shouldPass, detail: shouldPass ? `${parsed.length} cue(s) accepted` : 'Invalid sample was incorrectly accepted' };
    } catch (cause) {
      return { name: sample.name, passed: !shouldPass, detail: cause instanceof Error ? cause.message : String(cause) };
    }
  }));

  const copy = async () => {
    try { await navigator.clipboard.writeText(converted); setNotice('WebVTT copied to clipboard.'); }
    catch { setNotice('Clipboard access is unavailable in this browser context.'); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([converted], { type: 'text/vtt;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${filename.replace(/\.(srt|vtt)$/i, '') || 'subtitle'}.vtt`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return <div className="page-wrap tool-page subtitle-page">
    <header className="page-heading"><div><p className="eyebrow"><span className="eyebrow-mark"/> LOCAL FILE TOOLING <span className="eyebrow-index">04 / 04</span></p><h1>Subtitle Testing</h1><p className="lede">Inspect timing, validate cues, and convert subtitle files in your browser. Nothing is uploaded.</p></div><div className="privacy-stamp"><ShieldCheck size={17} aria-hidden="true"/><span>BROWSER ONLY<small>NO SERVER UPLOAD</small></span></div></header>
    <div className="subtitle-layout">
      <section className="file-panel panel">
        <div className="panel-head"><div className="panel-kicker"><span>01</span> SOURCE FILE</div><span className="format-allow">.SRT / .VTT</span></div>
        <label className="file-drop"><input type="file" accept=".srt,.vtt,text/vtt,application/x-subrip" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void loadFile(file); }}/><span className="drop-icon"><FolderOpen size={21} aria-hidden="true"/></span><strong>{filename || 'Choose a subtitle file'}</strong><span>Browse files on this device</span><small>SUPPORTED FORMATS / SRT · WEBVTT</small></label>
        <div className="file-facts"><div><span>FILE</span><strong title={filename}>{filename || '—'}</strong></div><div><span>FORMAT</span><strong>{format || '—'}</strong></div><div><span>CUES</span><strong>{filename ? cues.length : '—'}</strong></div></div>
        {error && <div className="validation-callout validation-error" role="alert"><AlertCircle size={17} aria-hidden="true"/><div><strong>Validation failed</strong><span>{error}</span></div></div>}
        {cues.length > 0 && <div className="validation-callout validation-success"><CheckCircle2 size={17} aria-hidden="true"/><div><strong>Subtitle is valid</strong><span>{cues.length} cue{cues.length === 1 ? '' : 's'} parsed and ready for conversion.</span></div></div>}
        <div className="privacy-note"><FileCheck2 size={15} aria-hidden="true"/><span>Processed locally with the SDK parser. The original file stays on this device.</span></div>
        <Link className="player-link" to="/stream"><FileAudio2 size={16} aria-hidden="true"/> Continue to Player <ArrowUpRight size={15} aria-hidden="true"/></Link>
      </section>

      <section className="cue-panel panel">
        <div className="panel-head"><div className="panel-kicker"><span>02</span> CUE INSPECTOR</div><span className="cue-count">{cues.length ? `${cues.length} TOTAL` : 'NO CUES'}</span></div>
        {cues.length === 0 ? <div className="inspector-empty"><FileText size={24} aria-hidden="true"/><strong>Nothing to inspect</strong><span>Load a valid subtitle file to view cue timing and text.</span></div> : <div className="cue-list">{cues.slice(0, 6).map((cue, index) => <article className="cue-row" key={`${cue.startMs}-${index}`}><span className="cue-index">{String(index + 1).padStart(2, '0')}</span><div><time>{stamp(cue.startMs)} <span>→</span> {stamp(cue.endMs)}</time><p>{cue.text}</p></div></article>)}</div>}
        {cues.length > 6 && <div className="cue-more">+ {cues.length - 6} MORE CUES IN SOURCE</div>}
      </section>

      <section className="convert-panel panel">
        <div className="panel-head"><div className="panel-kicker"><span>03</span> WEBVTT OUTPUT</div><span className={converted ? 'output-ready' : 'output-waiting'}><i/>{converted ? 'READY' : 'AWAITING VALID FILE'}</span></div>
        {converted ? <><pre className="vtt-output"><code>{converted}</code></pre><div className="output-actions"><button className="lime-button" type="button" onClick={() => void copy()}><Clipboard size={15} aria-hidden="true"/> Copy output</button><button className="quiet-button" type="button" onClick={download}><Download size={15} aria-hidden="true"/> Download .vtt</button>{notice && <span role="status" className="output-notice">{notice}</span>}</div></> : <div className="output-placeholder">Validated cues are serialized with normalized WebVTT timestamps here.</div>}
      </section>

      <section className="checks-panel panel">
        <div className="panel-head"><div className="panel-kicker"><span>04</span> PARSER CHECKS</div><button className="text-action" type="button" onClick={runChecks}><Check size={14} aria-hidden="true"/> RUN SAMPLES</button></div>
        <p className="check-description">Exercise the SDK parser with representative valid and invalid files.</p>
        {checks.length === 0 ? <div className="checks-idle">Checks haven’t been run.</div> : <div className="check-rows">{checks.map((check) => <div className="check-item" key={check.name}><span className={check.passed ? 'check-icon pass' : 'check-icon fail'}>{check.passed ? <CheckCircle2 size={15} aria-hidden="true"/> : <AlertCircle size={15} aria-hidden="true"/>}</span><strong>{check.name}</strong><small>{check.detail}</small></div>)}</div>}
      </section>
    </div>
  </div>;
}
