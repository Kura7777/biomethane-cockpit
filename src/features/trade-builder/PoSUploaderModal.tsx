import React, { useState, useMemo } from 'react';
import { parseProofOfSustainability, ParsedPoSCertificate } from '../../domain/consignment/posParser';
import { showToast } from '../../app/DeskToastContainer';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  X,
  Copy,
  Layers
} from 'lucide-react';

interface PoSUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (parsed: ParsedPoSCertificate) => void;
}

const SAMPLE_POS_ISCC_DK = `ISCC EU Certificate
Certificate Number: EU-ISCC-Cert-DK214-99482710
Issuing Body: DNV Business Assurance Denmark A/S
Holder of Certificate: Nature Energy Månsson A/S
Country: DK
Feedstock: 80% Liquid Cattle Slurry & Manure, 20% Agricultural Straw
Volume: 25,000 MWh
Greenhouse Gas Emissions: -92.5 gCO2e/MJ
GHG Savings: 198.4%
Chain of Custody: Mass Balance`;

const SAMPLE_POS_REDCERT_DE = `REDcert-EU System Certificate
Cert No: REDcert-EU-DE100-8837192
Certification Body: TÜV SÜD Industrie Service GmbH
Company: EnviTec Biogas AG (Güstrow)
Country: DE
Substrates: 100% Segregated Organic Food Waste & Bioabfall
Certified CI: +14.2 gCO2e/MJ
Total Quantity: 18,500 MWh
Chain of Custody: Mass Balance`;

const SAMPLE_POS_ISCC_PLUS = `ISCC PLUS Certificate
Cert No: ISCC-PLUS-Cert-NL220-4019283
Certification Body: SGS Germany GmbH
Holder: Shell Energy Europe B.V.
Feedstock: Purpose-Grown Energy Crops (Maize Silage)
CI: +38.5 gCO2e/MJ
Chain of Custody: Book and Claim
Volume: 10,000 MWh`;

export function PoSUploaderModal({ isOpen, onClose, onApply }: PoSUploaderModalProps) {
  const [inputText, setInputText] = useState<string>('');

  const parsed = useMemo(() => {
    if (!inputText.trim()) return null;
    return parseProofOfSustainability(inputText);
  }, [inputText]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!parsed || !parsed.isValid) {
      showToast('Please provide a valid certificate snippet.', 'error');
      return;
    }
    onApply(parsed);
    showToast(`Loaded PoS Certificate ${parsed.certificateNumber} (${parsed.primaryFeedstockName}, CI ${parsed.carbonIntensityGCo2Mj} g/MJ)`, 'success');
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content || '');
    };
    reader.readAsText(file);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-fade-in"
      data-testid="pos-uploader-modal"
    >
      <div 
        className="w-full max-w-3xl rounded-xl border border-stone-700 bg-stone-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-label="Proof of Sustainability Certificate Ingestion"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 px-6 py-4 bg-stone-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-100 flex items-center gap-2">
                Automated Proof of Sustainability (PoS) Ingestion
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">RED III Ready</span>
              </h2>
              <p className="text-xs text-stone-400">
                Extract audited substrate fractions, verified CI, and certificate metadata from ISCC EU, REDcert-EU, or 2BSvs documents.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-colors"
            data-testid="modal-close-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Sample Preset Chips */}
          <div>
            <div className="text-stone-400 mb-2 font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Quick Fill Sample Certificates:
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setInputText(SAMPLE_POS_ISCC_DK)}
                className="px-2.5 py-1.5 rounded-md bg-stone-800 border border-stone-700 hover:border-emerald-500 text-stone-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
              >
                🇩🇰 ISCC EU (Danish Manure -92.5 CI)
              </button>
              <button
                type="button"
                onClick={() => setInputText(SAMPLE_POS_REDCERT_DE)}
                className="px-2.5 py-1.5 rounded-md bg-stone-800 border border-stone-700 hover:border-emerald-500 text-stone-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
              >
                🇩🇪 REDcert-EU (German Biowaste +14.2 CI)
              </button>
              <button
                type="button"
                onClick={() => setInputText(SAMPLE_POS_ISCC_PLUS)}
                className="px-2.5 py-1.5 rounded-md bg-stone-800 border border-stone-700 hover:border-emerald-500 text-stone-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
              >
                🇳🇱 ISCC PLUS (Voluntary Scope 1)
              </button>
            </div>
          </div>

          {/* Input Text / Upload Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-stone-300 font-medium">Paste Certificate Text or Drop File:</label>
              <label className="cursor-pointer text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium">
                <UploadCloud className="h-3.5 w-3.5" />
                Upload .txt/.csv file
                <input type="file" accept=".txt,.csv,.json,.pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste raw text from an ISCC EU, REDcert-EU, or 2BSvs Proof of Sustainability (PoS) certificate..."
              rows={6}
              className="w-full rounded-lg border border-stone-700 bg-stone-950 p-3 text-stone-200 font-mono text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              data-testid="pos-raw-input"
            />
          </div>

          {/* Live Extraction Preview Card */}
          {parsed && (
            <div className="rounded-lg border border-stone-700 bg-stone-950/80 p-4 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${parsed.isValid ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span className="font-semibold text-stone-200">
                    {parsed.schemeLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">Confidence:</span>
                  <span className="px-2 py-0.5 rounded bg-stone-800 text-emerald-400 font-mono font-bold">
                    {parsed.confidenceScore}%
                  </span>
                </div>
              </div>

              {/* Parsed Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-2.5 rounded bg-stone-900 border border-stone-800">
                  <div className="text-stone-400 text-[11px]">Certificate #</div>
                  <div className="font-mono font-semibold text-stone-200 truncate" title={parsed.certificateNumber}>
                    {parsed.certificateNumber}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-stone-900 border border-stone-800">
                  <div className="text-stone-400 text-[11px]">Issuing Body</div>
                  <div className="font-semibold text-stone-200 truncate" title={parsed.issuingBody}>
                    {parsed.issuingBody}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-stone-900 border border-stone-800">
                  <div className="text-stone-400 text-[11px]">Origin Country</div>
                  <div className="font-semibold text-stone-200">
                    {parsed.countryCode} ({parsed.chainOfCustody})
                  </div>
                </div>

                <div className="p-2.5 rounded bg-stone-900 border border-stone-800">
                  <div className="text-stone-400 text-[11px]">Feedstock Substrate</div>
                  <div className="font-semibold text-emerald-300 truncate" title={parsed.primaryFeedstockName}>
                    {parsed.primaryFeedstockName}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-stone-900 border border-stone-800">
                  <div className="text-stone-400 text-[11px]">Certified CI</div>
                  <div className="font-mono font-bold text-amber-300">
                    {parsed.carbonIntensityGCo2Mj > 0 ? `+${parsed.carbonIntensityGCo2Mj}` : parsed.carbonIntensityGCo2Mj} gCO₂e/MJ
                  </div>
                </div>

                <div className="p-2.5 rounded bg-stone-900 border border-stone-800">
                  <div className="text-stone-400 text-[11px]">Volume / Batch</div>
                  <div className="font-mono font-bold text-stone-200">
                    {parsed.volumeMWh.toLocaleString()} MWh
                  </div>
                </div>
              </div>

              {/* Audit Warnings if any */}
              {parsed.auditNotes.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 space-y-1">
                  {parsed.auditNotes.map((note, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-stone-800 px-6 py-4 bg-stone-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!parsed || !parsed.isValid}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-950"
            data-testid="pos-apply-btn"
          >
            Apply to Trade Builder
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
