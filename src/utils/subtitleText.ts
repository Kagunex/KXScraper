import type { ISubtitleTrack } from '../types/index.js';

const LABEL_TO_BCP47: Record<string, string> = {
  english: 'en',
  portuguese: 'pt',
  'portuguese-brazil': 'pt-BR',
  spanish: 'es',
  italian: 'it',
  french: 'fr',
  german: 'de',
  japanese: 'ja',
  arabic: 'ar',
  russian: 'ru',
  chinese: 'zh',
  korean: 'ko',
  dutch: 'nl',
  polish: 'pl',
  turkish: 'tr',
  indonesian: 'id',
  indonesia: 'id',
  'bahasa indonesia': 'id',
  indo: 'id',
  thai: 'th',
  vietnamese: 'vi',
};

export function labelToBcp47(label: string): string {
  const normalized = label.trim().toLowerCase();
  return LABEL_TO_BCP47[normalized] ?? normalized.slice(0, 2);
}

export type SubtitleTextFormat = 'srt' | 'vtt';

export interface SubtitleCue {
  startMs: number;
  endMs: number;
  text: string;
}

/** Parse user-supplied SRT or WebVTT into validated timed cues. */
export function parseSubtitleText(input: string, format: SubtitleTextFormat): SubtitleCue[] {
  const source = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (format === 'vtt' && !/^WEBVTT(?:[ \t].*)?(?:\n|$)/.test(source)) {
    throw new Error('Invalid WebVTT: missing WEBVTT header');
  }
  const body = format === 'vtt' ? source.replace(/^WEBVTT[^\n]*(?:\n|$)/, '') : source;
  const blocks = body.split(/\n[ \t]*\n+/).map((block) => block.trim()).filter(Boolean);
  const cues: SubtitleCue[] = [];

  for (let index = 0; index < blocks.length; index++) {
    const lines = blocks[index].split('\n');
    if (format === 'vtt' && /^(NOTE|STYLE|REGION)(?:\s|$)/.test(lines[0].trim())) continue;
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) {
      throw new Error(
        'Invalid ' + format.toUpperCase() + ' cue ' + (index + 1) + ': missing timestamp line',
      );
    }
    const timing = lines[timingIndex].match(/^\s*(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/);
    if (!timing) {
      throw new Error(
        'Invalid ' + format.toUpperCase() + ' cue ' + (index + 1) + ': malformed timestamp line',
      );
    }
    const startMs = parseSubtitleTimestamp(timing[1]);
    const endMs = parseSubtitleTimestamp(timing[2]);
    if (startMs == null || endMs == null) {
      throw new Error('Invalid ' + format.toUpperCase() + ' cue ' + (index + 1) + ': invalid timestamp');
    }
    if (endMs <= startMs) {
      throw new Error('Invalid ' + format.toUpperCase() + ' cue ' + (index + 1) + ': end must be after start');
    }
    const text = lines.slice(timingIndex + 1).join('\n').trim();
    if (!text) throw new Error('Invalid ' + format.toUpperCase() + ' cue ' + (index + 1) + ': empty text');
    cues.push({ startMs, endMs, text });
  }
  if (cues.length === 0) throw new Error('Invalid ' + format.toUpperCase() + ': no subtitle cues found');
  return cues;
}

/** Parse a user-selected file by its .srt or .vtt filename extension. */
export function parseSubtitleFile(filename: string, content: string): SubtitleCue[] {
  const extension = filename.toLowerCase().match(/\.(srt|vtt)$/)?.[1];
  if (!extension) throw new Error('Unsupported subtitle file: expected .srt or .vtt');
  return parseSubtitleText(content, extension as SubtitleTextFormat);
}

/** Convert validated cues to WebVTT for browser players that accept VTT tracks. */
export function subtitleCuesToVtt(cues: SubtitleCue[]): string {
  if (cues.length === 0) throw new Error('Cannot create WebVTT without cues');
  const blocks = cues.map((cue, index) => {
    validateSubtitleCue(cue, index + 1);
    return (
      formatSubtitleTimestamp(cue.startMs) +
      ' --> ' +
      formatSubtitleTimestamp(cue.endMs) +
      '\n' +
      cue.text
    );
  });
  return 'WEBVTT\n\n' + blocks.join('\n\n') + '\n';
}

/** Pick a subtitle track by language; Indonesian labels and BCP-47 id are supported. */
export function selectSubtitleTrack(
  tracks: ISubtitleTrack[],
  language: string = 'id',
): ISubtitleTrack | undefined {
  const requested = normalizeLanguageCode(labelToBcp47(language));
  return tracks.find((track) => {
    const trackCodes = [track.language, labelToBcp47(track.language), labelToBcp47(track.label)]
      .map(normalizeLanguageCode);
    return trackCodes.some((trackCode) =>
      trackCode === requested || trackCode.startsWith(requested + '-'),
    );
  });
}

function parseSubtitleTimestamp(value: string): number | null {
  const match = value.match(/^(?:(\d+):)?([0-5]?\d):([0-5]\d)[,.](\d{1,3})$/);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4].padEnd(3, '0'));
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
}

function formatSubtitleTimestamp(value: number): string {
  const hours = Math.floor(value / 3_600_000);
  const minutes = Math.floor((value % 3_600_000) / 60_000);
  const seconds = Math.floor((value % 60_000) / 1_000);
  const milliseconds = value % 1_000;
  return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' +
    String(seconds).padStart(2, '0') + '.' + String(milliseconds).padStart(3, '0');
}

function validateSubtitleCue(cue: SubtitleCue, index: number): void {
  if (!Number.isInteger(cue.startMs) || cue.startMs < 0) {
    throw new Error('Invalid subtitle cue ' + index + ': startMs must be a non-negative integer');
  }
  if (!Number.isInteger(cue.endMs) || cue.endMs <= cue.startMs) {
    throw new Error('Invalid subtitle cue ' + index + ': endMs must be after startMs');
  }
  if (!cue.text.trim()) throw new Error('Invalid subtitle cue ' + index + ': text is empty');
}

function normalizeLanguageCode(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, '-');
}
