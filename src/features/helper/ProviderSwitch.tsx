import { HELPER_PROVIDERS, PROVIDER_LABEL, currentHelperProvider, setHelperProvider, type HelperProvider } from '../../domain/help/helperModels';
import { getStoredAnthropicApiKey } from '../../domain/regcheck/claudeClient';
import { getStoredGeminiApiKey } from '../../domain/regcheck/storage';
import { useAssumptionsVersion } from '../../shared/hooks/useAssumptionsVersion';
import './helper.css';

function hasKeyFor(provider: HelperProvider): boolean {
  return provider === 'google' ? Boolean(getStoredGeminiApiKey().trim()) : Boolean(getStoredAnthropicApiKey().trim());
}

/**
 * Claude or Gemini: which provider the desk helper and Ask the desk use. Exactly one is on; switching
 * lands on that provider's cheapest model, and the model menu then lists only that provider's models.
 */
export function ProviderSwitch({ disabled = false, testId = 'provider-switch' }: { disabled?: boolean; testId?: string }) {
  useAssumptionsVersion();
  const current = currentHelperProvider();
  return (
    <div className="provider-switch" role="radiogroup" aria-label="AI provider" data-testid={testId}>
      {HELPER_PROVIDERS.map(p => {
        const hasKey = hasKeyFor(p);
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={p === current}
            className={`provider-opt ${p === current ? 'is-on' : ''}`}
            data-testid={`${testId}-${p}`}
            disabled={disabled}
            title={hasKey ? `${PROVIDER_LABEL[p]} (Key ready)` : `${PROVIDER_LABEL[p]} (Key required)`}
            onClick={() => setHelperProvider(p)}
          >
            <span
              className={`provider-key-dot ${hasKey ? 'is-set' : ''}`}
              aria-hidden="true"
            />
            {PROVIDER_LABEL[p]}
          </button>
        );
      })}
    </div>
  );
}
