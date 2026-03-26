import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { postCustomAnnouncement, postToDiscord } from './discord';

describe('postToDiscord (Discord webhook payloads)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('embed-only + notifyEveryone adds @everyone content and allowed_mentions', async () => {
    await postToDiscord('https://discord.com/api/webhooks/1/abc', {
      embeds: [{ title: 'T', description: 'Body in embed' }],
      notifyEveryone: true,
    });

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init!.body as string);

    expect(body.content).toBe('@everyone');
    expect(body.allowed_mentions).toEqual({ parse: ['everyone'] });
    expect(body.embeds).toHaveLength(1);
    expect(body.embeds[0].title).toBe('T');
  });

  it('does not duplicate @everyone when content already starts with it', async () => {
    await postToDiscord('https://discord.com/api/webhooks/1/abc', {
      content: '@everyone\nAlready there',
      notifyEveryone: true,
    });

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.content).toBe('@everyone\nAlready there');
    expect(body.allowed_mentions.parse).toContain('everyone');
  });

  it('without notifyEveryone, no allowed_mentions for plain embed', async () => {
    await postToDiscord('https://discord.com/api/webhooks/1/abc', {
      embeds: [{ title: 'Quiet', description: 'x' }],
      notifyEveryone: false,
    });

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.content).toBeUndefined();
    expect(body.allowed_mentions).toBeUndefined();
  });

  it('merges explicit role mentions with notifyEveryone', async () => {
    await postToDiscord('https://discord.com/api/webhooks/1/abc', {
      content: 'Hello',
      notifyEveryone: true,
      allowedMentions: { roles: ['1234567890'] },
    });

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.content).toContain('@everyone');
    expect(body.allowed_mentions.parse).toContain('everyone');
    expect(body.allowed_mentions.roles).toEqual(['1234567890']);
  });
});

describe('postCustomAnnouncement', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to notifyEveryone for commissioner embeds', async () => {
    await postCustomAnnouncement(
      'https://discord.com/api/webhooks/1/abc',
      'Spring Training',
      'ST rules...'
    );

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.content).toBe('@everyone');
    expect(body.allowed_mentions).toEqual({ parse: ['everyone'] });
    expect(body.embeds[0].title).toContain('Spring Training');
  });

  it('respects { notifyEveryone: false }', async () => {
    await postCustomAnnouncement(
      'https://discord.com/api/webhooks/1/abc',
      'Quiet',
      'No ping',
      { notifyEveryone: false }
    );

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.content).toBeUndefined();
    expect(body.allowed_mentions).toBeUndefined();
  });
});
