import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntsogPrismaCapacityClient, CROSS_BORDER_IP_MAPPINGS } from '../logistics/entsogPrismaClient';

describe('ENTSOG & PRISMA Capacity Platform Client', () => {
  let client: EntsogPrismaCapacityClient;

  beforeEach(() => {
    client = new EntsogPrismaCapacityClient('https://transparency.entsog.eu/api/v1');
    vi.restoreAllMocks();
  });

  it('maps key European cross-border corridors to verified EIC point keys', () => {
    expect(CROSS_BORDER_IP_MAPPINGS['DK-DE']).toBeDefined();
    expect(CROSS_BORDER_IP_MAPPINGS['DK-DE'].eicCode).toBe('21Z000000000003Z');
    expect(CROSS_BORDER_IP_MAPPINGS['DE-FR'].ipName).toContain('Obergailbach');
    expect(CROSS_BORDER_IP_MAPPINGS['FR-ES'].eicCode).toBe('21Z000000000100C');
  });

  it('gracefully returns statutory TSO reserve tariffs when network is offline', async () => {
    // Mock network failure
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const summary = await client.fetchAuctionSummary('DK', 'DE', 'month');
    expect(summary.corridor).toBe('DK-DE');
    expect(summary.fromCountry).toBe('DK');
    expect(summary.toCountry).toBe('DE');
    expect(summary.isLiveApi).toBe(false);
    expect(summary.reserveTariffEurMwh).toBe(1.15);
    expect(summary.auctionPremiumEurMwh).toBe(0.05);
    expect(summary.totalDeliveredTariffEurMwh).toBe(1.20);
    expect(summary.sourcePlatform).toBe('PRISMA_PRIMARY_AUCTIONS');
  });

  it('correctly parses live ENTSOG REST payload and extracts auction premium', async () => {
    const mockApiResponse = {
      capacities: [
        {
          pointKey: '21Z000000000003Z',
          pointLabel: 'Ellund',
          reservePriceEurPerMWh: '1.1500',
          clearingPriceEurPerMWh: '1.2800',
          allocatedCapacityKWhH: 5000000,
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const summary = await client.fetchAuctionSummary('DK', 'DE', 'month');
    expect(summary.isLiveApi).toBe(true);
    expect(summary.reserveTariffEurMwh).toBe(1.15);
    expect(summary.clearingPriceEurMwh).toBe(1.28);
    expect(summary.auctionPremiumEurMwh).toBe(0.13);
    expect(summary.totalDeliveredTariffEurMwh).toBe(1.28);
    expect(summary.capacityStatus).toBe('CONGESTED');
    expect(summary.sourcePlatform).toBe('ENTSOG_TRANSPARENCY_PLATFORM');
  });

  it('handles domestic routing with zero cross-border tariffs', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

    const summary = await client.fetchAuctionSummary('DE', 'DE');
    expect(summary.reserveTariffEurMwh).toBe(0.0);
    expect(summary.auctionPremiumEurMwh).toBe(0.0);
    expect(summary.totalDeliveredTariffEurMwh).toBe(0.0);
  });
});
