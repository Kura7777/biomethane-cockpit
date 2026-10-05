import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  runRegulationCheck,
  ANTHROPIC_API_URL,
  ANTHROPIC_API_VERSION,
  ANTHROPIC_SERVER_TOOLS,
  DEFAULT_CLAUDE_MODEL,
  THOROUGH_CLAUDE_MODEL,
  extractJsonFromText,
  extractLastTextBlock
} from '../claudeClient';
import { FIXTURE_REGCHECK_REPORT } from '../fixture';

describe('claudeClient API client', () => {
  const originalFetch = globalThis.fetch;
  const mockApiKey = 'sk-ant-api03-SECRET_TEST_KEY_DO_NOT_LEAK-12345';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('builds the request with the right headers, tools, and payload structure', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    const mockResponsePayload = {
      id: 'msg_12345',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'server_tool_use',
          name: 'web_search',
          input: { query: 'Energinet AIB Gas Scheme' }
        },
        {
          type: 'text',
          text: JSON.stringify(FIXTURE_REGCHECK_REPORT)
        }
      ],
      stop_reason: 'end_turn'
    };

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedOptions = init;
      return new Response(JSON.stringify(mockResponsePayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const report = await runRegulationCheck({
      apiKey: mockApiKey,
      model: DEFAULT_CLAUDE_MODEL
    });

    expect(capturedUrl).toBe(ANTHROPIC_API_URL);
    expect(capturedOptions).toBeDefined();
    expect(capturedOptions?.method).toBe('POST');

    const headers = capturedOptions?.headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/json');
    expect(headers['x-api-key']).toBe(mockApiKey);
    expect(headers['anthropic-version']).toBe(ANTHROPIC_API_VERSION);
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');

    const body = JSON.parse(capturedOptions?.body as string);
    expect(body.model).toBe(DEFAULT_CLAUDE_MODEL);
    expect(body.tools).toEqual(ANTHROPIC_SERVER_TOOLS);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('user');
    expect(body.messages[0].content).toContain("Today's date is:");

    expect(report.checkedAt).toBe(FIXTURE_REGCHECK_REPORT.checkedAt);
    expect(report.items.length).toBe(FIXTURE_REGCHECK_REPORT.items.length);
  });

  it('parses a fixture response containing markdown-fenced JSON in the final text block', async () => {
    const rawWithMarkdown = `Here are the official verification findings based on my review of the European registers:\n\n\`\`\`json\n${JSON.stringify(FIXTURE_REGCHECK_REPORT, null, 2)}\n\`\`\``;

    const mockResponsePayload = {
      content: [
        { type: 'text', text: 'Preliminary scratch reasoning...' },
        { type: 'text', text: rawWithMarkdown }
      ],
      stop_reason: 'end_turn'
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponsePayload), { status: 200 })
    );

    const report = await runRegulationCheck({ apiKey: mockApiKey, model: THOROUGH_CLAUDE_MODEL });
    expect(report.summary).toBe(FIXTURE_REGCHECK_REPORT.summary);
    expect(report.model).toBe(THOROUGH_CLAUDE_MODEL);
  });

  it('maps HTTP 401 (bad key) to a readable error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Invalid API key provided' } }), { status: 401 })
    );

    await expect(runRegulationCheck({ apiKey: mockApiKey })).rejects.toThrow(/Invalid Anthropic API key/i);
  });

  it('maps HTTP 429 (rate limit) to a readable error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Rate limit exceeded' } }), { status: 429 })
    );

    await expect(runRegulationCheck({ apiKey: mockApiKey })).rejects.toThrow(/rate limit exceeded/i);
  });

  it('never puts the API key in an error message', async () => {
    // Simulate error response echoing the key or network error mentioning key
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(`Error: Key ${mockApiKey} was rejected by security gateway`, { status: 403 })
    );

    try {
      await runRegulationCheck({ apiKey: mockApiKey });
      expect.fail('Should have thrown an error');
    } catch (err: any) {
      expect(err.message).not.toContain(mockApiKey);
      expect(err.message).toContain('[REDACTED_API_KEY]');
    }
  });

  it('never leaks the key on network fetch failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(
      new Error(`Fetch failed connecting to api.anthropic.com with key ${mockApiKey}`)
    );

    try {
      await runRegulationCheck({ apiKey: mockApiKey });
      expect.fail('Should have thrown an error');
    } catch (err: any) {
      expect(err.message).not.toContain(mockApiKey);
      expect(err.message).toContain('[REDACTED_API_KEY]');
    }
  });

  it('throws a friendly error when API key is not provided', async () => {
    await expect(runRegulationCheck({ apiKey: '' })).rejects.toThrow(/Anthropic API key is not configured/i);
  });

  it('extractLastTextBlock extracts the text of the final text block', () => {
    const blocks = [
      { type: 'text', text: 'First block' },
      { type: 'server_tool_use', name: 'web_search' },
      { type: 'text', text: 'Final block' }
    ];
    expect(extractLastTextBlock(blocks)).toBe('Final block');
    expect(extractLastTextBlock([])).toBe('');
    expect(extractLastTextBlock(null)).toBe('');
  });

  it('extractJsonFromText handles fenced and unfenced JSON', () => {
    const obj = { test: 123 };
    expect(extractJsonFromText(JSON.stringify(obj))).toEqual(obj);
    expect(extractJsonFromText(`\`\`\`json\n${JSON.stringify(obj)}\n\`\`\``)).toEqual(obj);
    expect(extractJsonFromText(`Some intro text ${JSON.stringify(obj)} trailing text`)).toEqual(obj);
  });
});
