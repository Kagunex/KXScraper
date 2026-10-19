/// <reference types="vite/client" />
export const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export const get = async <T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(`${API}${path}?${new URLSearchParams(params)}`, { signal });
  const body = await response.text();
  let data: unknown;
  try { data = body ? JSON.parse(body) : null; } catch { data = body; }
  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'error' in data
      ? String((data as { error: unknown }).error)
      : `${response.status} ${response.statusText}`;
    throw new Error(message);
  }
  return data as T;
};

export const search = (provider: string, q: string, signal?: AbortSignal) =>
  get<SearchResult[]>('/search', { provider, q }, signal);
export const content = (provider: string, mediaId: string, signal?: AbortSignal) =>
  get<Episode[]>('/content', { provider, mediaId }, signal);
export const stream = (provider: string, unitId: string, language: string, signal?: AbortSignal) =>
  get<ResolvedStream>('/stream', { provider, unitId, language }, signal);

// Types matching IVideoPayload / ResolvedMediaStream from the SDK
export type Lang = 'sub' | 'dub' | 'raw';
export interface SearchResult { id: string; title: string; catalogType: string; availableLanguages?: Lang[] }
export interface Episode { id: string; title: string; number: number; availableLanguages: Lang[] }
export interface SubtitleTrack { url: string; language: string; label: string; format?: 'vtt' | 'srt' | 'ass' }
export interface VideoStream { sourceUrl: string; isHLS: boolean; quality: string; language?: Lang; headers?: Record<string, string>; subtitles?: SubtitleTrack[] }
export interface MangaStream { imageUrls: string[]; headers?: Record<string, string> }
export interface ResolvedStream { type: 'video' | 'manga' | 'live'; streams?: VideoStream[]; pages?: MangaStream }
