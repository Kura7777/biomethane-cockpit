import { HELPER_PROVIDERS, PROVIDER_LABEL, currentHelperProvider, setHelperProvider } from '../../domain/help/helperModels';
import { useAssumptionsVersion } from '../../shared/hooks/useAssumptionsVersion';
import './helper.css';

/**
 * Claude or Gemini: which provider the desk helper and Ask the desk use. Exactly one is on; switching
 * lands on that provider's cheapest model, and the model menu then lists only that provider's models.
 */
export function ProviderSwitch({ disabled = false, testId = 'provider-switch' }: { disabled?: boolean; testId?: string }) {
  useAssumptionsVersion();
  const current = currentHelperProvider();
  return (
    <div className="provider-switch" role="radiogroup" aria-label="AI provider" data-testid={testId}>
      {HELPER_PROVIDERS.map(p => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={p === current}
          className={`provider-opt ${p === current ? 'is-on' : ''}`}
          data-testid={`${testId}-${p}`}
          disabled={disabled}
          onClick={() => setHelperProvider(p)}
        >
          {PROVIDER_LABEL[p]}
        </button>
      ))}
    </div>
  );
}
