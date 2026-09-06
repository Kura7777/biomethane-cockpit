import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { deskSync } from '../sync/deskSync';
import { SyncEvent, ToastNotification } from '../sync/types';

describe('Real-Time Desk Synchronization Engine', () => {
  it('initializes with a valid unique session ID and at least 1 active session', () => {
    expect(deskSync.sessionId).toBeDefined();
    expect(deskSync.sessionId).toMatch(/^SES-/);
    expect(deskSync.getActiveSessionCount()).toBeGreaterThanOrEqual(1);
  });

  it('allows subscribing and unsubscribing from toast notifications', () => {
    const received: ToastNotification[] = [];
    const unsubscribe = deskSync.onToast(t => {
      received.push(t);
    });

    deskSync.emitToast({
      id: 'TEST-TOAST-1',
      title: 'Test Deal Booked',
      message: 'Trader Chris booked 40,000 MWh',
      type: 'deal',
      timestamp: Date.now(),
    });

    expect(received.length).toBe(1);
    expect(received[0].id).toBe('TEST-TOAST-1');
    expect(received[0].type).toBe('deal');

    unsubscribe();

    deskSync.emitToast({
      id: 'TEST-TOAST-2',
      title: 'Should not receive',
      message: 'Unsubscribed',
      type: 'info',
      timestamp: Date.now(),
    });

    expect(received.length).toBe(1);
  });

  it('allows subscribing and unsubscribing from raw sync events', () => {
    const events: SyncEvent[] = [];
    const unsubscribe = deskSync.onSyncEvent(ev => {
      events.push(ev);
    });

    // Directly test internal handler for incoming peer events
    const peerEvent: SyncEvent = {
      type: 'MARKS_UPDATED',
      sessionId: 'PEER-SES-999',
      actor: 'Peer Risk Manager',
      role: 'RISK_MANAGER',
      timestamp: new Date().toISOString(),
      marketId: 'DE_THG',
      marketName: 'German THG',
      oldMid: 0.82,
      newMid: 0.85,
      changePct: 3.66,
    };

    (deskSync as any).handleIncomingMessage(peerEvent);

    expect(events.length).toBe(1);
    expect(events[0].sessionId).toBe('PEER-SES-999');
    expect(events[0].type).toBe('MARKS_UPDATED');

    unsubscribe();
  });

  it('generates toast notification when peer updates marks or books a deal', () => {
    const toasts: ToastNotification[] = [];
    const unsub = deskSync.onToast(t => toasts.push(t));

    // Peer mark update
    (deskSync as any).handleIncomingMessage({
      type: 'MARKS_UPDATED',
      sessionId: 'PEER-SES-123',
      actor: 'Marco P.',
      role: 'TRADER',
      timestamp: new Date().toISOString(),
      marketId: 'NL_ERE',
      marketName: 'Netherlands ERE',
      oldMid: 18.0,
      newMid: 18.5,
      changePct: 2.78,
    });

    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe('mark');
    expect(toasts[0].title).toContain('Desk Mark Updated: Netherlands ERE');
    expect(toasts[0].message).toContain('Marco P. updated mark to €18.500 (+2.78%)');

    // Peer deal booked
    (deskSync as any).handleIncomingMessage({
      type: 'DEAL_BOOKED',
      sessionId: 'PEER-SES-123',
      actor: 'Marco P.',
      role: 'TRADER',
      timestamp: new Date().toISOString(),
      dealId: 'DEAL-2026-9999',
      title: 'Danish Manure → NL ERE',
      volumeMWh: 40000,
      marketName: 'Netherlands ERE',
      netbackEur: 169.30,
    });

    expect(toasts.length).toBe(2);
    expect(toasts[1].type).toBe('deal');
    expect(toasts[1].title).toContain('New Trade Booked');
    expect(toasts[1].message).toContain('Marco P. booked 40,000 MWh');

    unsub();
  });

  it('filters out self-broadcasts without generating self-toasts', () => {
    const toasts: ToastNotification[] = [];
    const unsub = deskSync.onToast(t => toasts.push(t));

    // Message originating from our own session ID
    (deskSync as any).handleIncomingMessage({
      type: 'MARKS_UPDATED',
      sessionId: deskSync.sessionId,
      actor: 'Chris M.',
      role: 'TRADER',
      timestamp: new Date().toISOString(),
      marketId: 'DE_THG',
      marketName: 'German THG',
      oldMid: 0.80,
      newMid: 0.85,
      changePct: 6.25,
    });

    expect(toasts.length).toBe(0);
    unsub();
  });

  it('broadcasts methods execute without errors', () => {
    expect(() => {
      deskSync.broadcastMarksUpdated('NL_ERE', 'Netherlands ERE', 18.0, 18.5, 2.78);
      deskSync.broadcastDealBooked('DEAL-01', 'Test Trade', 10000, 'NL ERE', 160);
      deskSync.broadcastDealTransitioned('DEAL-01', 'PRICED', 'EXECUTED');
      deskSync.broadcastRoleChanged('RISK_MANAGER');
    }).not.toThrow();
  });

  it('deduplicates identical events arriving concurrently via BroadcastChannel and WebSocket', () => {
    const receivedToasts: ToastNotification[] = [];
    const unsub = deskSync.onToast(t => receivedToasts.push(t));

    const timestamp = new Date().toISOString();
    const dualChannelEvent: SyncEvent = {
      type: 'MARKS_UPDATED',
      sessionId: 'PEER-DUAL-999',
      actor: 'Elena R.',
      role: 'RISK_MANAGER',
      timestamp,
      marketId: 'FR_CPB',
      marketName: 'French CPB',
      oldMid: 25.0,
      newMid: 26.5,
      changePct: 6.0,
    };

    // First arrival (e.g. from BroadcastChannel)
    deskSync.handleIncomingMessage(dualChannelEvent);
    expect(receivedToasts.length).toBe(1);

    // Second arrival (e.g. from WebSocket relay)
    deskSync.handleIncomingMessage(dualChannelEvent);
    // Should NOT create a duplicate toast
    expect(receivedToasts.length).toBe(1);

    unsub();
  });

  it('supports WebSocket connection and message dispatch', () => {
    const sentMessages: string[] = [];
    const mockWs: any = {
      readyState: 1, // OPEN
      send: vi.fn((data: string) => sentMessages.push(data)),
      close: vi.fn(),
      onmessage: null,
    };

    deskSync.connectWebSocket(mockWs as unknown as WebSocket);
    expect(deskSync.isWebSocketConnected()).toBe(true);
    expect(deskSync.getWsStatus()).toBe('CONNECTED');

    // Broadcast a deal and confirm it is dispatched over WebSocket
    deskSync.broadcastDealBooked('DEAL-WS-01', 'Spanish Biomethane Trade', 25000, 'FR CPB', 145.5);
    expect(mockWs.send).toHaveBeenCalled();
    const sent = JSON.parse(sentMessages[sentMessages.length - 1]);
    expect(sent.type).toBe('DEAL_BOOKED');
    expect(sent.dealId).toBe('DEAL-WS-01');

    // Simulate incoming peer message from WebSocket
    const peerToasts: ToastNotification[] = [];
    const unsub = deskSync.onToast(t => peerToasts.push(t));

    const wsIncomingEvent: SyncEvent = {
      type: 'DEAL_TRANSITIONED',
      sessionId: 'REMOTE-NODE-WS',
      actor: 'Marcus V.',
      role: 'COMPLIANCE_OFFICER',
      timestamp: new Date().toISOString(),
      dealId: 'DEAL-WS-01',
      previousStatus: 'PRICED',
      newStatus: 'EXECUTED',
    };

    mockWs.onmessage({ data: JSON.stringify(wsIncomingEvent) });
    expect(peerToasts.length).toBe(1);
    expect(peerToasts[0].title).toContain('Trade Status: DEAL-WS-01');
    expect(peerToasts[0].message).toContain('Marcus V. transitioned status to EXECUTED');

    unsub();
  });
});

