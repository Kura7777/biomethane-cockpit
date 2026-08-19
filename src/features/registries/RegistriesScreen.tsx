import React from 'react';
import { RegistryHub } from '../plants/RegistryHub';

export function RegistriesScreen() {
  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-stone-950 text-stone-100 font-sans">
      <RegistryHub />
    </div>
  );
}
