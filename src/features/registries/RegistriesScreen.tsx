import React from 'react';
import { RegistryHub } from '../plants/RegistryHub';

export function RegistriesScreen() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'hidden', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <RegistryHub />
    </div>
  );
}

