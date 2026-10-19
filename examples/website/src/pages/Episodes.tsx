import { ArrowUpRight, LoaderCircle, PackageOpen, Radio, TriangleAlert } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as api from '../api';

export default function Episodes() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const provider = sp.get('provider') || '';
  const mediaId = sp.get('mid') || '';
  const title = sp.get('title') || mediaId;
  const type = sp.get('type') || 'ANIME';
  const isManga = type === 'MANGA';
  const unitLabel = isManga ? 'Chapter' : 'EP';
  const { data, isFetching, isError, error } = useQuery<api.Episode[]>({ queryKey: ['content', provider, mediaId], queryFn: () => api.content(provider, mediaId), enabled: !!(provider && mediaId) });
  const goStream = (ep: api.Episode) => navigate(`/stream?provider=${provider}&uid=${encodeURIComponent(ep.id)}&title=${encodeURIComponent(title)}&ep=${encodeURIComponent(`${unitLabel}.${String(ep.number).padStart(3, '0')}`)}&mid=${encodeURIComponent(mediaId)}&type=${type}`);
  return <div className="page-wrap tool-page episodes-page">
    <header className="page-heading"><div><p className="eyebrow"><span className="eyebrow-mark"/> CONTENT UNITS <span className="eyebrow-index">{provider || 'PROVIDER'} / {isManga ? 'MANGA' : 'ANIME'}</span></p><h1>{title}</h1><p className="lede">Content returned by <code>{provider || '—'}</code> for <code>{mediaId || '—'}</code>.</p></div>{data && <span className="result-total"><strong>{String(data.length).padStart(2, '0')}</strong><span>{isManga ? 'CHAPTERS' : 'EPISODES'}</span></span>}</header>
    <section className="units-panel panel"><div className="panel-head"><div className="panel-kicker"><span>01</span> {isManga ? 'CHAPTER LIST' : 'EPISODE LIST'}</div><span className="units-source"><Radio size={13} aria-hidden="true"/> API RESPONSE</span></div>
      {isFetching && <div className="unit-state"><LoaderCircle size={20} className="spin-icon" aria-hidden="true"/><strong>Fetching content units</strong><span>Requesting the selected media from the API server.</span></div>}
      {isError && <div className="unit-state unit-error" role="alert"><TriangleAlert size={20} aria-hidden="true"/><strong>Content request failed</strong><span>{String(error)}</span></div>}
      {!isFetching && !isError && data?.length === 0 && <div className="unit-state"><PackageOpen size={22} aria-hidden="true"/><strong>No content units returned</strong><span>The provider returned an empty list for this media ID.</span></div>}
      {!isFetching && !isError && data && data.length > 0 && <div className="unit-list">{data.map((ep) => <button key={ep.id} className="unit-row" onClick={() => goStream(ep)}><span className="unit-number">{unitLabel}.<b>{String(ep.number).padStart(3, '0')}</b></span><span className="unit-name">{ep.title}<small>{ep.id}</small></span><span className="unit-languages">{ep.availableLanguages?.map((lang) => <i key={lang}>{lang}</i>)}</span><ArrowUpRight size={16} aria-hidden="true"/></button>)}</div>}
    </section>
  </div>;
}
