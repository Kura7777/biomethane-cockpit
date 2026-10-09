import React from 'react';
import { PlantTabCommercial } from './PlantTabCommercial';
import { PlantTabTechnical } from './PlantTabTechnical';
import { PlantTabCompliance } from './PlantTabCompliance';
import { BiomethanePlant, TraderDeskOverride } from '../../../domain/plants/types';
import { PlantDrawerTheme } from './plantDrawerTheme';

interface PlantTabAllDetailsProps {
  plant: BiomethanePlant;
  isExpanded: boolean;
  isDark: boolean;
  t: PlantDrawerTheme;
  ciValue: number;
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
  handleAuditPlantDiligence: () => void;
  copyToClipboard: (text: string, label: string) => void;
}

export function PlantTabAllDetails(props: PlantTabAllDetailsProps) {
  const { isExpanded, plant, isDark, t, ciValue, contactQuality, handleAuditPlantDiligence } = props;

  if (isExpanded) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
          gap: '28px',
          alignItems: 'start',
          width: '100%'
        }}
      >
        <PlantTabCommercial {...props} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          <PlantTabTechnical plant={plant} ciValue={ciValue} isDark={isDark} t={t} />
          <PlantTabCompliance plant={plant} isDark={isDark} t={t} contactQuality={contactQuality} handleAuditPlantDiligence={handleAuditPlantDiligence} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
      <PlantTabCommercial {...props} />
      <PlantTabTechnical plant={plant} ciValue={ciValue} isDark={isDark} t={t} />
      <PlantTabCompliance plant={plant} isDark={isDark} t={t} contactQuality={contactQuality} handleAuditPlantDiligence={handleAuditPlantDiligence} />
    </div>
  );
}
