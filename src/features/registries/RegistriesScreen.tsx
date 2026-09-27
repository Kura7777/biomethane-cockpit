import React from 'react';
import { RegistryHub } from '../plants/RegistryHub';
import { PageShell } from '../../shared/ui/PageShell';

export function RegistriesScreen() {
  return (
    <PageShell
      className="registries-shell"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'hidden' }}
    >
      <RegistryHub />
    </PageShell>
  );
}

