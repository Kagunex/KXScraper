import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import Layout from './components/Layout';
const Search = lazy(() => import('./pages/Search'));
const Episodes = lazy(() => import('./pages/Episodes'));
const Stream = lazy(() => import('./pages/Stream'));
const Console = lazy(() => import('./pages/Console'));
const SubtitleTesting = lazy(() => import('./pages/SubtitleTesting'));
function ScrollToTop() { const { pathname, search } = useLocation(); useEffect(() => { window.scrollTo(0, 0); }, [pathname, search]); return null; }
export default function App() {
  return <><ScrollToTop /><Suspense fallback={<div className="page-loading" role="status"><LoaderCircle size={17} className="spin-icon" aria-hidden="true"/>Loading workspace…</div>}><Routes><Route element={<Layout />}><Route path="/" element={<Search />} /><Route path="/episodes" element={<Episodes />} /><Route path="/stream" element={<Stream />} /><Route path="/console" element={<Console />} /><Route path="/subtitles" element={<SubtitleTesting />} /></Route></Routes></Suspense></>;
}
