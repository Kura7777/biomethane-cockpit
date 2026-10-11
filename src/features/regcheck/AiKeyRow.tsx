import { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { showToast } from '../../app/DeskToastContainer';

/** What a key row needs to know about one provider's key. */
export interface AiKeyProvider {
  /** "Anthropic" or "Gemini": used in labels and messages. */
  name: string;
  placeholder: string;
  /** data-testid prefix: "<prefix>-input", "-saved", "-problem", "-test", "-result", "-save", "-clear". */
  testPrefix: string;
  get: () => string;
  set: (key: string) => void;
  clear: () => void;
  normalise: (raw: string) => string;
  fingerprint: (key: string) => string;
  shapeProblem: (key: string) => string | null;
  test: (key: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  /** Where the trader compares the last four characters ("your Anthropic console"). */
  consoleName: string;
  testTitle: string;
  okText: string;
}

const SMALL = { padding: '6px 12px', fontSize: '12px' } as const;

/**
 * One saved API key: input, Save, "Saved on this device: <fingerprint>", Test key and Clear. The same
 * pattern for each provider; the key lives in this browser's localStorage and is only ever sent in a header.
 */
export function AiKeyRow({ provider, onSavedChange, inUse = false }: { provider: AiKeyProvider; onSavedChange?: (key: string) => void; /** The desk helper uses this provider now. */ inUse?: boolean }) {
  const [saved, setSaved] = useState(() => provider.get());
  const [draft, setDraft] = useState(saved);
  const [show, setShow] = useState(false);
  const [check, setCheck] = useState<{ ok: true } | { ok: false; reason: string } | 'testing' | null>(null);
  const t = provider.testPrefix;
  const clean = provider.normalise(draft);
  const problem = saved ? provider.shapeProblem(saved) : null;

  const save = () => {
    provider.set(clean);
    setSaved(clean);
    setDraft('');
    setCheck(null);
    onSavedChange?.(clean);
    showToast(`${provider.name} API key saved to browser storage`);
  };
  const clear = () => {
    provider.clear();
    setSaved('');
    setDraft('');
    setCheck(null);
    onSavedChange?.('');
    showToast(`${provider.name} API key cleared`);
  };
  const test = async () => {
    setCheck('testing');
    setCheck(await provider.test(saved));
  };

  return (
    <div className="regcheck-key-form">
      <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <KeyRound size={14} />
        {provider.name} API Key:
        {inUse && <span className="regcheck-key-inuse" data-testid={`${t}-inuse`}>Used by the helper</span>}
      </span>
      <div className="regcheck-key-input-wrap">
        <input
          type={show ? 'text' : 'password'}
          className="regcheck-input"
          placeholder={provider.placeholder}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label={`${provider.name} API key`}
          data-testid={`${t}-input`}
        />
        <button type="button" className="regcheck-visibility-toggle" onClick={() => setShow(!show)} aria-label={show ? 'Hide key' : 'Show key'}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <button type="button" className="btn btn-primary" style={SMALL} onClick={save} disabled={!clean || clean === saved} data-testid={`${t}-save`}>
        Save
      </button>
      {saved && (
        <span className="regcheck-key-saved" data-testid={`${t}-saved`} title={`Keys are saved per device and per browser. Compare this with the key in your ${provider.consoleName}.`}>
          Saved on this device: {provider.fingerprint(saved)}
        </span>
      )}
      {problem && <span className="regcheck-key-problem" role="alert" data-testid={`${t}-problem`}>{problem}</span>}
      {saved && (
        <button type="button" className="btn btn-secondary" style={SMALL} onClick={test} disabled={check === 'testing'} data-testid={`${t}-test`} title={provider.testTitle}>
          {check === 'testing' ? 'Testing…' : 'Test key'}
        </button>
      )}
      {check && check !== 'testing' && (
        <span className={check.ok ? 'regcheck-key-ok' : 'regcheck-key-problem'} role="status" data-testid={`${t}-result`}>
          {check.ok ? provider.okText : check.reason}
        </span>
      )}
      {saved && (
        <button type="button" className="btn btn-secondary" style={SMALL} onClick={clear} data-testid={`${t}-clear`}>
          Clear
        </button>
      )}
    </div>
  );
}
