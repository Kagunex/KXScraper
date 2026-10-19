import { describe, expect, it } from 'vitest';
import {
  labelToBcp47,
  parseSubtitleFile,
  parseSubtitleText,
  selectSubtitleTrack,
  subtitleCuesToVtt,
} from '../src/utils/subtitles.js';
import type { ISubtitleTrack } from '../src/types/index.js';

describe('subtitle text utilities', () => {
  it('parses SRT timestamps, CRLF, cue numbering, and multiline text', () => {
    const cues = parseSubtitleText(
      [
        '\uFEFF1\r\n00:00:01,25 --> 00:00:03,500\r\nHalo!\r\nBaris kedua.',
        '2\r\n00:01:02,000 --> 00:01:03,000\r\nSampai jumpa.',
      ].join('\r\n\r\n'),
      'srt',
    );
    expect(cues).toEqual([
      { startMs: 1_250, endMs: 3_500, text: 'Halo!\nBaris kedua.' },
      { startMs: 62_000, endMs: 63_000, text: 'Sampai jumpa.' },
    ]);
  });

  it('accepts user subtitle files by .srt and .vtt extension and rejects other files', () => {
    expect(parseSubtitleFile('episode.srt', '00:00:01,000 --> 00:00:02,000\nTeks'))
      .toEqual([{ startMs: 1_000, endMs: 2_000, text: 'Teks' }]);
    expect(parseSubtitleFile('episode.vtt', 'WEBVTT\n\n00:01.000 --> 00:02.000\nTeks'))
      .toEqual([{ startMs: 1_000, endMs: 2_000, text: 'Teks' }]);
    expect(() => parseSubtitleFile('episode.ass', 'Dialogue: ...'))
      .toThrow(/expected .srt or .vtt/i);
  });

  it('parses WebVTT identifiers and cue settings', () => {
    const cues = parseSubtitleText(
      'WEBVTT\n\nintro\n00:01.000 --> 00:02.250 align:start\nSelamat datang.',
      'vtt',
    );
    expect(cues).toEqual([{ startMs: 1_000, endMs: 2_250, text: 'Selamat datang.' }]);
  });

  it('rejects malformed timestamps, reversed times, and missing VTT headers', () => {
    expect(() => parseSubtitleText('00:70:00,000 --> 00:70:01,000\nTidak valid', 'srt'))
      .toThrow(/invalid timestamp/i);
    expect(() => parseSubtitleText('00:00:02,000 --> 00:00:01,000\nTerbalik', 'srt'))
      .toThrow(/end must be after start/i);
    expect(() => parseSubtitleText('00:00.000 --> 00:01.000\nTanpa header', 'vtt'))
      .toThrow(/missing WEBVTT header/i);
  });

  it('converts cues to valid WebVTT timestamps', () => {
    const output = subtitleCuesToVtt([{ startMs: 1_250, endMs: 3_500, text: 'Halo!' }]);
    expect(output).toBe('WEBVTT\n\n00:00:01.250 --> 00:00:03.500\nHalo!\n');
  });

  it('recognizes Indonesian labels and selects an Indonesian track', () => {
    const tracks: ISubtitleTrack[] = [
      { url: 'https://example.test/en.vtt', language: 'en', label: 'English', format: 'vtt' },
      { url: 'https://example.test/id.srt', language: 'Indonesian', label: 'Bahasa Indonesia', format: 'srt' },
    ];
    expect(labelToBcp47(' Bahasa Indonesia ')).toBe('id');
    expect(selectSubtitleTrack(tracks)?.url).toBe('https://example.test/id.srt');
    expect(selectSubtitleTrack(tracks, 'Indonesian')?.url).toBe('https://example.test/id.srt');
    expect(selectSubtitleTrack(tracks, 'en')?.url).toBe('https://example.test/en.vtt');
  });
});

describe('subtitle file validation edge cases', () => {
  it('rejects empty subtitle files and cues without text', () => {
    expect(() => parseSubtitleFile('empty.srt', '')).toThrow(/no subtitle cues/i);
    expect(() => parseSubtitleFile('blank-cue.srt', '00:00:01,000 --> 00:00:02,000\n'))
      .toThrow(/empty text/i);
  });

  it('rejects a malformed timestamp in either supported format', () => {
    expect(() => parseSubtitleFile('broken.srt', '00:99:00,000 --> 00:99:01,000\nText'))
      .toThrow(/invalid timestamp/i);
    expect(() => parseSubtitleFile('broken.vtt', 'WEBVTT\n\n00:99.000 --> 00:99.500\nText'))
      .toThrow(/invalid timestamp/i);
  });
});
