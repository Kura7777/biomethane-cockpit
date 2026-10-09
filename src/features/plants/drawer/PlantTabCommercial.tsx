import { BiomethanePlant, TraderDeskOverride } from '../../../domain/plants/types';
import { PlantDrawerTheme } from './plantDrawerTheme';
import { PlantCommercialAlerts } from './PlantCommercialAlerts';
import { PlantCompanyCard } from './PlantCompanyCard';
import { PlantContactMatrix } from './PlantContactMatrix';

interface PlantTabCommercialProps {
  plant: BiomethanePlant;
  isExpanded: boolean;
  isDark: boolean;
  t: PlantDrawerTheme;
  deskOverride: TraderDeskOverride | null;
  isEditingOverride: boolean;
  setIsEditingOverride: (val: boolean) => void;
  setOverrideSignatory: (val: string) => void;
  targetOperator: string;
  websiteUrl: string;
  linkedinCompanyUrl: string | null;
  contactQuality: {
    confidence: string;
    isPersonalEmail: boolean;
    officialRegister: { registerName: string; searchUrl?: string; url?: string };
  };
  officialRegister: { registerName: string; searchUrl?: string; url?: string };
  copyToClipboard: (text: string, label: string) => void;
}

export function PlantTabCommercial({
  plant,
  isExpanded,
  isDark,
  t,
  deskOverride,
  isEditingOverride,
  setIsEditingOverride,
  setOverrideSignatory,
  targetOperator,
  websiteUrl,
  linkedinCompanyUrl,
  contactQuality,
  officialRegister,
  copyToClipboard,
}: PlantTabCommercialProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
      {/* 1. Alerts & Match Signals */}
      <PlantCommercialAlerts
        plant={plant}
        isDark={isDark}
        t={t}
        deskOverride={deskOverride}
        isEditingOverride={isEditingOverride}
        setIsEditingOverride={setIsEditingOverride}
        setOverrideSignatory={setOverrideSignatory}
        contactQuality={contactQuality}
      />

      {/* 2. Core Entity & Researched SPV Details */}
      <PlantCompanyCard
        plant={plant}
        isExpanded={isExpanded}
        isDark={isDark}
        t={t}
        copyToClipboard={copyToClipboard}
      />

      {/* 3. Researched Contacts, Leads & Verification Links */}
      <PlantContactMatrix
        plant={plant}
        isDark={isDark}
        t={t}
        targetOperator={targetOperator}
        websiteUrl={websiteUrl}
        linkedinCompanyUrl={linkedinCompanyUrl}
        officialRegister={officialRegister}
        copyToClipboard={copyToClipboard}
      />
    </div>
  );
}
