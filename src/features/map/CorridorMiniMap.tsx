import React, { useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { EUROPEAN_HUBS } from './mapData';
import { Maximize2, Activity, Zap, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { getCountryFlag } from '../commercial/PlantScannerTable';

interface CorridorMiniMapProps {
  originCountry: string;
  targetCountry: string;
  plantName?: string;
  plantCoords?: [number, number] | null;
  transitSteps?: string[];
  distanceKm?: number;
  logisticsCostEur?: number;
  deliveryMode?: string;
}

export function CorridorMiniMap({
  originCountry,
  targetCountry,
  plantName,
  transitSteps = [],
  distanceKm = 0,
  logisticsCostEur = 0,
  deliveryMode = 'PIPELINE_GRID'
}: CorridorMiniMapProps) {
  const navigate = useNavigate();
  const patternId = useId();

  const originHub = EUROPEAN_HUBS.find(h => h.iso === originCountry);
  const targetHub = EUROPEAN_HUBS.find(h => h.iso === targetCountry);

  const originLabel = plantName || originHub?.name || originCountry;
  const targetLabel = targetHub ? `${targetHub.name} Hub` : `${targetCountry} Grid`;

  const hopsCount = Math.max(0, transitSteps.length - 1);
  const routeNodesLabel = transitSteps.length > 0 
    ? transitSteps.join(' ➔ ') 
    : `${originCountry} ➔ ${targetCountry}`;

  const intermediateHubs = transitSteps
    .filter(iso => iso !== originCountry && iso !== targetCountry)
    .map(iso => EUROPEAN_HUBS.find(h => h.iso === iso)?.name || iso);

  return (
    <div className="relative w-full h-full min-h-[220px] rounded-lg overflow-hidden border border-[var(--color-divider)] bg-[var(--color-bg)] flex flex-col shadow-sm select-none">
      <style>{`
        @keyframes pipelinePulse {
          0% { stroke-dashoffset: 40; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-pipeline-flow {
          stroke-dasharray: 8 6;
          animation: pipelinePulse 1.2s linear infinite;
        }
      `}</style>

      {/* Header Overlay: Route Title & Telemetry */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-panel-header)] border-b border-[var(--color-divider)] z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
          <span className="font-mono text-xs font-bold text-zinc-400">
            Pipeline Corridor Topology
          </span>
          <span className="font-mono text-xs font-bold text-cyan-300 truncate">
            {routeNodesLabel}
          </span>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 shrink-0 font-semibold">
            {hopsCount === 0 ? 'Direct Grid' : `${hopsCount} Transit ${hopsCount === 1 ? 'Hop' : 'Hops'}`}
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/map?origin=${originCountry}&target=${targetCountry}`)}
          title="Open Full Continental Logistics Map"
          className="flex items-center gap-1 bg-[var(--color-surface)] hover:bg-[var(--color-subtier)] border border-[var(--color-divider)] hover:border-cyan-500/50 px-2 py-0.5 rounded text-zinc-300 hover:text-cyan-300 transition-colors font-mono text-xs cursor-pointer shrink-0 ml-2"
        >
          <Maximize2 className="w-3 h-3 text-cyan-400" />
          <span className="hidden sm:inline">Inspect Map</span>
        </button>
      </div>

      {/* SVG Vector Topology Canvas */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden flex items-center justify-center p-2">
        <svg
          viewBox="0 0 600 180"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
        >
          <defs>
            {/* Continental Grid Mesh Pattern */}
            <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--color-divider)" strokeWidth="0.8" />
              <circle cx="24" cy="24" r="0.8" fill="var(--color-divider)" />
            </pattern>

            {/* Glowing Pipeline Filters */}
            <filter id={`glow-${patternId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Linear Gradient for Pipeline */}
            <linearGradient id={`grad-${patternId}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--chart-6)" />
              <stop offset="50%" stopColor="var(--chart-1)" />
              <stop offset="100%" stopColor="var(--chart-5)" />
            </linearGradient>
          </defs>

          {/* Grid Background */}
          <rect width="600" height="180" fill={`url(#${patternId})`} />

          {/* Pipeline Conduit Shadow */}
          <path
            d="M 90 90 Q 250 50, 300 90 T 510 90"
            fill="none"
            stroke="var(--color-bg)"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Outer High-Pressure Conduit Pipe */}
          <path
            d="M 90 90 Q 250 50, 300 90 T 510 90"
            fill="none"
            stroke="var(--color-divider)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Active Flow Glow Line */}
          <path
            d="M 90 90 Q 250 50, 300 90 T 510 90"
            fill="none"
            stroke={`url(#grad-${patternId})`}
            strokeWidth="3"
            filter={`url(#glow-${patternId})`}
            opacity="0.65"
            strokeLinecap="round"
          />

          {/* Animated High-Velocity Flow Dots */}
          <path
            d="M 90 90 Q 250 50, 300 90 T 510 90"
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="animate-pipeline-flow"
          />

          {/* Distance Telemetry Pill on Pipeline (Clean dynamic positioning without node collisions) */}
          <g transform={`translate(300, ${intermediateHubs.length > 0 ? 134 : 76})`}>
            <rect
              x="-65"
              y="-12"
              width="130"
              height="24"
              rx="12"
              fill="var(--color-bg)"
              stroke="var(--color-divider)"
              strokeWidth="1"
            />
            <text
              x="0"
              y="4"
              textAnchor="middle"
              fill="var(--color-muted)"
              fontFamily="monospace"
              fontSize="12"
              fontWeight="bold"
            >
              {distanceKm > 0 ? `${distanceKm.toLocaleString()} km` : 'Direct Grid Intertie'}
            </text>
          </g>

          {/* Intermediate Compression Hubs (if multi-hop) */}
          {intermediateHubs.map((hubName, idx) => {
            const step = (380 - 220) / (intermediateHubs.length + 1);
            const cx = 220 + (idx + 1) * step;
            const cy = 76;
            return (
              <g key={idx} transform={`translate(${cx}, ${cy})`}>
                <circle r="7" fill="var(--color-bg)" stroke="var(--chart-1)" strokeWidth="2" />
                <circle r="2.5" fill="var(--chart-1)" />
                <rect
                  x="-45"
                  y="-27"
                  width="90"
                  height="18"
                  rx="4"
                  fill="var(--color-bg)"
                  stroke="var(--color-divider)"
                  strokeWidth="0.8"
                />
                <text
                  x="0"
                  y="-14"
                  textAnchor="middle"
                  fill="var(--chart-1)"
                  fontFamily="monospace"
                  fontSize="12"
                  fontWeight="600"
                >
                  {hubName.length > 10 ? `${hubName.slice(0, 9)}…` : hubName}
                </text>
              </g>
            );
          })}

          {/* ORIGIN FACILITY NODE (Left) */}
          <g transform="translate(90, 90)">
            {/* Outer Pulse Rings */}
            <circle r="24" fill="var(--chart-6)" opacity="0.08" />
            <circle r="16" fill="var(--chart-6)" opacity="0.15" />
            <circle r="10" fill="var(--color-bg)" stroke="var(--chart-6)" strokeWidth="2.5" />
            <circle r="4" fill="var(--chart-6)" />

            {/* Flag & ISO Badge */}
            <foreignObject x="-95" y="-58" width="190" height="44">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--color-bg)]/95 border border-emerald-500/50 shadow-md font-mono text-xs text-emerald-300 font-bold whitespace-nowrap">
                  <span>{getCountryFlag(originCountry)}</span>
                  <span>{originCountry} · {plantName ? 'Facility' : 'Origin Hub'}</span>
                </div>
              </div>
            </foreignObject>

            {/* Name Label */}
            <text
              x="0"
              y="34"
              textAnchor="middle"
              fill="var(--color-text)"
              fontFamily="monospace"
              fontSize="12"
              fontWeight="bold"
            >
              {originLabel.length > 18 ? `${originLabel.slice(0, 16)}...` : originLabel}
            </text>
            <text
              x="0"
              y="50"
              textAnchor="middle"
              fill="var(--chart-6)"
              fontFamily="monospace"
              fontSize="12"
            >
              Grid Injected
            </text>
          </g>

          {/* TARGET DESTINATION NODE (Right) */}
          <g transform="translate(510, 90)">
            {/* Outer Pulse Rings */}
            <circle r="24" fill="var(--chart-1)" opacity="0.08" />
            <circle r="16" fill="var(--chart-1)" opacity="0.15" />
            <circle r="10" fill="var(--color-bg)" stroke="var(--chart-1)" strokeWidth="2.5" />
            <circle r="4" fill="var(--chart-1)" />

            {/* Flag & Market Badge */}
            <foreignObject x="-95" y="-58" width="190" height="44">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--color-bg)]/95 border border-cyan-500/50 shadow-md font-mono text-xs text-cyan-300 font-bold whitespace-nowrap">
                  <span>{getCountryFlag(targetCountry)}</span>
                  <span>{targetCountry} · Compliance Hub</span>
                </div>
              </div>
            </foreignObject>

            {/* Name Label */}
            <text
              x="0"
              y="34"
              textAnchor="middle"
              fill="var(--color-text)"
              fontFamily="monospace"
              fontSize="12"
              fontWeight="bold"
            >
              {targetLabel.length > 18 ? `${targetLabel.slice(0, 16)}...` : targetLabel}
            </text>
            <text
              x="0"
              y="50"
              textAnchor="middle"
              fill="var(--chart-1)"
              fontFamily="monospace"
              fontSize="12"
            >
              Virtual Trading Point
            </text>
          </g>
        </svg>
      </div>

      {/* Bottom Telemetry HUD Ribbon */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-panel-header)] border-t border-[var(--color-divider)] text-zinc-300 font-mono text-xs z-10">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-cyan-300 font-semibold text-xs">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>{deliveryMode.replace(/_/g, ' ')}</span>
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400 text-xs">
            Path: <strong className="text-zinc-200 tabular-nums">{distanceKm > 0 ? `${distanceKm.toLocaleString()} km` : 'Direct injection'}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-400">Transmission Tariff:</span>
          <span className="font-bold text-amber-300 tabular-nums text-xs">
            €{logisticsCostEur.toFixed(2)}/MWh
          </span>
        </div>
      </div>
    </div>
  );
}

