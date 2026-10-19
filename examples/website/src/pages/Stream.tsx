import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Hls from 'hls.js';
import { AlertCircle, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, Captions, Check, ChevronDown, ChevronUp, Clapperboard, Download, Languages, LoaderCircle, Radio, Upload, X } from 'lucide-react';
import * as api from '../api';
import { parseSubtitleFile, subtitleCuesToVtt } from '../../../../src/utils/subtitleText.js';

type DownloadPhase = 'idle' | 'active' | 'done' | 'error';
function DownloadButton({ provider, unitId, language, type }: { provider: string; unitId: string; language: string; type: 'video' | 'manga' }) {
  const [phase, setPhase] = useState<DownloadPhase>('idle');
  const [label, setLabel] = useState('');
  const esRef = useRef<EventSource | null>(null);
  const stop = () => { esRef.current?.close(); esRef.current = null; };
  useEffect(() => stop, []);
  const start = () => {
    if (phase === 'active') { stop(); setPhase('idle'); return; }
    const progressPath = type === 'video'
      ? `/download/video/progress?provider=${encodeURIComponent(provider)}&unitId=${encodeURIComponent(unitId)}&language=${encodeURIComponent(language)}`
      : `/download/manga/chapter/progress?provider=${encodeURIComponent(provider)}&unitId=${encodeURIComponent(unitId)}`;
    const filePath = type === 'video' ? '/download/video/file' : '/download/manga/chapter/file';
    setPhase('active'); setLabel('Connecting to download route…');
    const es = new EventSource(`${api.API}${progressPath}`); esRef.current = es;
    es.onmessage = (event) => {
      let data: Record<string, unknown>;
      try { data = JSON.parse(event.data) as Record<string, unknown>; } catch { return; }
      if (data.type === 'progress') setLabel(type === 'manga' ? `${data.downloaded}/${data.total} pages` : String(data.detail ?? data.phase ?? 'Downloading'));
      else if (data.type === 'complete') {
        stop(); setPhase('done'); setLabel('');
        const anchor = document.createElement('a'); anchor.href = `${api.API}${filePath}?token=${encodeURIComponent(String(data.token))}`; anchor.click();
        window.setTimeout(() => setPhase('idle'), 3000);
      } else if (data.type === 'error') {
        stop(); setPhase('error'); setLabel(String(data.message ?? 'Download failed.')); window.setTimeout(() => setPhase('idle'), 4000);
      }
    };
    es.onerror = () => { stop(); setPhase('error'); setLabel('Download connection failed.'); window.setTimeout(() => setPhase('idle'), 3500); };
  };
  if (phase === 'done') return <span className="save-status"><Check size={14} aria-hidden="true"/> SAVED</span>;
  if (phase === 'error') return <button className="download-error" type="button" title={label} onClick={() => setPhase('idle')}><AlertCircle size={14} aria-hidden="true"/> FAILED</button>;
  if (phase === 'active') return <div className="download-progress"><LoaderCircle size={14} className="spin-icon" aria-hidden="true"/><span>{label}</span><button className="cancel-download" type="button" onClick={start}><X size={13} aria-hidden="true"/> CANCEL</button></div>;
  return <button className="download-control" type="button" onClick={start}><Download size={14} aria-hidden="true"/>{type === 'manga' ? 'DOWNLOAD ZIP' : 'DOWNLOAD'}</button>;
}

function Player({ stream, subtitles, langUI }: { stream: api.VideoStream; subtitles: api.SubtitleTrack[]; langUI?: React.ReactNode }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [hlsSubTracks, setHlsSubTracks] = useState<{ id: number; name: string; lang: string }[]>([]);
  const [activeSub, setActiveSub] = useState(-1);
  const [userSubtitle, setUserSubtitle] = useState<api.SubtitleTrack | null>(null);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);
  const hlsRef = useRef<Hls | undefined>(undefined);
  const userSubtitleUrlRef = useRef<string | null>(null);
  const fileReadSequenceRef = useRef(0);
  const externalSubs = userSubtitle ? [...subtitles, userSubtitle] : subtitles;
  const externalSubsKey = externalSubs.map((track) => track.url).join('|');
  const hasExternalSubsRef = useRef(externalSubs.length > 0);
  hasExternalSubsRef.current = externalSubs.length > 0;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    setPlayerError(null); setHlsSubTracks([]); setActiveSub(externalSubs.length > 0 ? 0 : -1);
    let hls: Hls | undefined;
    if (stream.isHLS) {
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: false }); hls.subtitleDisplay = true;
        hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) setPlayerError(`HLS error: ${data.details}`); });
        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
          const tracks = (data.subtitleTracks ?? []).map((track: any) => ({ id: track.id, name: track.name ?? track.lang ?? `Track ${track.id}`, lang: track.lang ?? '' }));
          setHlsSubTracks(tracks);
          if (tracks.length > 0 && !hasExternalSubsRef.current) { hls!.subtitleTrack = tracks[0].id; setActiveSub(1000 + tracks[0].id); }
          else hls!.subtitleTrack = -1;
        });
        hls.loadSource(stream.sourceUrl); hls.attachMedia(video); hlsRef.current = hls; video.play().catch(() => {});
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = stream.sourceUrl; video.play().catch(() => {}); }
      else setPlayerError('HLS playback is not supported by this browser.');
    } else { video.src = stream.sourceUrl; video.play().catch(() => {}); }
    return () => { hls?.destroy(); hlsRef.current = undefined; video.src = ''; };
  }, [stream.sourceUrl, stream.isHLS]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    for (let index = 0; index < video.textTracks.length; index++) video.textTracks[index].mode = activeSub === index ? 'showing' : 'disabled';
  }, [activeSub, externalSubsKey]);
  useEffect(() => () => {
    fileReadSequenceRef.current += 1;
    if (userSubtitleUrlRef.current) { URL.revokeObjectURL(userSubtitleUrlRef.current); userSubtitleUrlRef.current = null; }
  }, []);

  const selectSub = (key: number) => { setActiveSub(key); if (hlsRef.current) hlsRef.current.subtitleTrack = key >= 1000 ? key - 1000 : -1; };
  const onSubtitleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget; const file = input.files?.[0]; input.value = ''; if (!file) return;
    const sequence = ++fileReadSequenceRef.current;
    if (userSubtitleUrlRef.current) { URL.revokeObjectURL(userSubtitleUrlRef.current); userSubtitleUrlRef.current = null; }
    setUserSubtitle(null); setSubtitleError(null); setActiveSub(-1);
    try {
      const content = await file.text(); if (sequence !== fileReadSequenceRef.current) return;
      const cues = parseSubtitleFile(file.name, content); const webVtt = subtitleCuesToVtt(cues);
      const url = URL.createObjectURL(new Blob([webVtt], { type: 'text/vtt' })); userSubtitleUrlRef.current = url;
      setUserSubtitle({ url, language: 'id', label: `Local: ${file.name.replace(/\.(srt|vtt)$/i, '')}`, format: 'vtt' });
      setActiveSub(subtitles.length);
    } catch (error) {
      if (sequence !== fileReadSequenceRef.current) return;
      setSubtitleError(error instanceof Error ? error.message : 'Could not read this subtitle file.');
    }
  };

  if (playerError) return <div className="player-fatal" role="alert"><AlertCircle size={19} aria-hidden="true"/><span>{playerError}</span></div>;
  return <div className="player-stage">
    <video ref={ref} controls crossOrigin="anonymous" aria-label="Resolved media player">
      {externalSubs.map((track) => <track key={`${stream.sourceUrl}-${track.url}`} kind="subtitles" src={track.url} srcLang={track.language} label={track.label}/>)}
    </video>
    {langUI}
    <div className="player-toolbar">
      <label className="track-label" htmlFor="player-subtitle-track"><Captions size={16} aria-hidden="true"/> SUBTITLES</label>
      <div className="select-wrap player-track-select"><select id="player-subtitle-track" value={activeSub} onChange={(event) => selectSub(Number(event.target.value))} aria-label="Select subtitle track">
        <option value={-1}>Off</option>{externalSubs.map((track, index) => <option key={`ext-${track.url}`} value={index}>{track.label}</option>)}{hlsSubTracks.map((track) => <option key={`hls-${track.id}`} value={1000 + track.id}>{track.name}</option>)}
      </select><ChevronDown size={14} aria-hidden="true"/></div>
      <label className="file-action"><Upload size={15} aria-hidden="true"/> Add local .srt / .vtt<input type="file" accept=".srt,.vtt" className="sr-only" onChange={onSubtitleFileChange} aria-label="Choose a local SRT or WebVTT subtitle file"/></label>
      {hlsSubTracks.length === 0 && externalSubs.length === 0 && <span className="track-empty">No tracks loaded</span>}
    </div>
    {subtitleError && <p role="alert" className="player-error-note"><AlertCircle size={15} aria-hidden="true"/><span>Subtitle file error: {subtitleError}</span></p>}
  </div>;
}

function MangaReader({ pages }: { pages: api.MangaStream }) {
  return <div className="manga-reader">{pages.imageUrls.map((url, index) => <img key={`${index}-${url}`} src={url} alt={`Page ${index + 1}`} loading="lazy"/>)}</div>;
}

export default function Stream() {
  const navigate = useNavigate(); const [sp] = useSearchParams();
  const provider = sp.get('provider') || ''; const unitId = sp.get('uid') || ''; const title = sp.get('title') || ''; const mediaId = sp.get('mid') || ''; const epLabel = sp.get('ep') || ''; const type = sp.get('type') || 'ANIME';
  const isManga = type === 'MANGA'; const unitLabel = isManga ? 'CHAPTERS' : 'EPISODES'; const unitPrefix = isManga ? 'Chapter' : 'EP';
  const [lang, setLang] = useState<api.Lang>('sub'); const [activeIdx, setActiveIdx] = useState(0); const [showEpisodes, setShowEpisodes] = useState(false);
  const { data: episodes } = useQuery<api.Episode[]>({ queryKey: ['content', provider, mediaId], queryFn: () => api.content(provider, mediaId), enabled: !!(provider && mediaId), staleTime: 5 * 60 * 1000 });
  const currentEpNum = epLabel ? parseFloat(epLabel.replace(/^[A-Z]+\./i, '')) : null; const currentIdx = episodes?.findIndex((episode) => episode.number === currentEpNum) ?? -1;
  const availableLangs: api.Lang[] = currentIdx >= 0 ? episodes?.[currentIdx]?.availableLanguages ?? ['sub'] : ['sub'];
  useEffect(() => { if (availableLangs.length > 0 && !availableLangs.includes(lang)) setLang(availableLangs[0]); }, [availableLangs, lang]);
  const { data, isFetching, isError, error } = useQuery<api.ResolvedStream>({ queryKey: ['stream', provider, unitId, lang], queryFn: () => api.stream(provider, unitId, lang), enabled: !!(provider && unitId) });
  const streams = data?.type === 'video' ? data.streams ?? [] : []; const active = streams[activeIdx] ?? null; const subtitles = active?.subtitles ?? [];
  const prevEp = currentIdx > 0 ? episodes?.[currentIdx - 1] ?? null : null;
  const nextEp = currentIdx >= 0 && currentIdx < (episodes?.length ?? 0) - 1 ? episodes?.[currentIdx + 1] ?? null : null;
  const goEpisode = (episode: api.Episode) => navigate(`/stream?provider=${provider}&uid=${encodeURIComponent(episode.id)}&title=${encodeURIComponent(title)}&ep=${encodeURIComponent(`${unitPrefix}.${String(episode.number).padStart(3, '0')}`)}&mid=${encodeURIComponent(mediaId)}&type=${type}`);
  useEffect(() => { setActiveIdx(0); }, [unitId, lang]);

  return <div className="page-wrap tool-page player-page">
    <header className="page-heading"><div><p className="eyebrow"><span className="eyebrow-mark"/> MEDIA PLAYER <span className="eyebrow-index">03 / 04</span></p><h1>{title || 'Player'}</h1><p className="lede">{epLabel ? `${epLabel} · ${provider}` : 'Play a resolved source and manage its available subtitle tracks.'}</p></div>{provider && <span className="endpoint-tag"><span>PROVIDER ID</span><code>{provider}</code></span>}</header>
    {(!provider || !unitId) && <section className="panel player-empty"><span className="player-empty-icon"><Clapperboard size={21} aria-hidden="true"/></span><h2>Select a stream first</h2><p>Choose a catalogue result and episode or chapter, then open it here. Provider playback depends on the API server and upstream source.</p><Link className="hero-primary" to="/"><ArrowLeft size={15} aria-hidden="true"/> Browse catalogues</Link></section>}
    <div className="player-content">
      {isFetching && <div className="unit-state"><LoaderCircle size={20} className="spin-icon" aria-hidden="true"/><strong>Resolving {isManga ? 'pages' : 'stream'}</strong><span>Waiting for the configured API response.</span></div>}
      {isError && <div className="unit-state unit-error" role="alert"><AlertCircle size={20} aria-hidden="true"/><strong>Stream request failed</strong><span>{String(error)}</span></div>}
      {data?.type === 'video' && active && <Player key={active.sourceUrl} stream={active} subtitles={subtitles} langUI={availableLangs.length > 1 && <div className="lang-bar"><Languages size={15} aria-hidden="true"/>{availableLangs.map((language) => <button key={language} onClick={() => setLang(language)} className={`lang-choice ${lang === language ? 'active' : ''}`} aria-pressed={lang === language}>{language}</button>)}</div>}/>}
      {data?.type === 'manga' && data.pages && <><div className="source-panel panel"><div className="source-head"><span className="source-label"><Radio size={15} aria-hidden="true"/> RESOLVED PAGES</span><DownloadButton provider={provider} unitId={unitId} language={lang} type="manga"/></div><MangaReader pages={data.pages}/></div>{availableLangs.length > 1 && <div className="lang-bar"> <Languages size={15} aria-hidden="true"/>{availableLangs.map((language) => <button key={language} onClick={() => setLang(language)} className={`lang-choice ${lang === language ? 'active' : ''}`} aria-pressed={lang === language}>{language}</button>)}</div>}</>}
    </div>
    {episodes && <section className="episode-navigation panel"><div className="episode-nav-top"><button onClick={() => setShowEpisodes((value) => !value)} className="episode-toggle"><Radio size={15} aria-hidden="true"/>{unitLabel}<span>({episodes.length})</span>{showEpisodes ? <ChevronUp size={14} aria-hidden="true"/> : <ChevronDown size={14} aria-hidden="true"/>}</button><div className="episode-nav-actions"><button disabled={!prevEp} onClick={() => prevEp && goEpisode(prevEp)} className="icon-text-button"><ArrowLeft size={13} aria-hidden="true"/> PREV</button><button disabled={!nextEp} onClick={() => nextEp && goEpisode(nextEp)} className="icon-text-button">NEXT <ArrowRight size={13} aria-hidden="true"/></button></div></div>
      {showEpisodes && <div className="episode-list">{episodes.map((episode) => { const current = episode.number === currentEpNum; return <button key={episode.id} onClick={() => goEpisode(episode)} className={`episode-choice ${current ? 'current' : ''}`} aria-current={current ? 'page' : undefined}><span>{unitPrefix}.{String(episode.number).padStart(3, '0')}</span><span>{episode.title}</span><ArrowUpRight size={14} aria-hidden="true"/></button>; })}</div>}
    </section>}
    {streams.length > 0 && <section className="source-panel panel"><div className="source-head"><span className="source-label"><Radio size={15} aria-hidden="true"/> RESOLVED SOURCES <small>({streams.length})</small></span><DownloadButton provider={provider} unitId={unitId} language={lang} type="video"/></div>
      {streams.map((source, index) => { let hostname = source.sourceUrl; try { const url = new URL(source.sourceUrl); hostname = url.pathname === '/proxy' && url.searchParams.has('url') ? new URL(url.searchParams.get('url')!).hostname : url.hostname; } catch { /* Keep the original source label if it is not a URL. */ }
        return <div key={`${source.sourceUrl}-${index}`} className={`source-choice ${index === activeIdx ? 'active' : ''}`}><button className="source-pick" onClick={() => setActiveIdx(index)} aria-label={`Play server ${index + 1}`} aria-pressed={index === activeIdx}>{index === activeIdx ? <Check size={12} aria-hidden="true"/> : null}</button><button className="source-info" onClick={() => setActiveIdx(index)} aria-pressed={index === activeIdx}><span className="source-title">Server {index + 1}<small>{source.isHLS ? 'HLS' : 'MP4'} · {source.quality}{source.language ? ` · ${source.language}` : ''}</small></span><code>{hostname}</code></button><a className="source-download" href={source.sourceUrl} download={!source.isHLS} target="_blank" rel="noopener noreferrer" aria-label={source.isHLS ? 'Open HLS manifest' : 'Download MP4'} title={source.isHLS ? 'Open HLS manifest' : 'Download MP4'}><ArrowDownToLine size={15} aria-hidden="true"/></a></div>;
      })}
    </section>}
  </div>;
}
