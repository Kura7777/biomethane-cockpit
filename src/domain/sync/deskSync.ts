import { SyncEvent, ToastNotification } from './types';
import { getSessionState } from '../auth/authStore';
import { DealStatus } from '../deals/types';
import { Role } from '../auth/types';

export const DESK_SYNC_CHANNEL_NAME = 'biomethane_desk_sync_v1';

export class DeskSyncEngine {
  public readonly sessionId: string;
  private channel: BroadcastChannel | null = null;
  private ws: WebSocket | null = null;
  private wsUrl: string | null = null;
  private wsReconnectTimer: any = null;
  private isDestroyed = false;

  private peerSessions: Map<string, number> = new Map(); // sessionId -> lastSeenTimestamp
  private seenEvents = new Set<string>(); // deduplication cache for BC + WS dual delivery
  private heartbeatIntervalId: any = null;
  private pruneIntervalId: any = null;

  private toastListeners = new Set<(toast: ToastNotification) => void>();
  private sessionCountListeners = new Set<(count: number) => void>();
  private eventListeners = new Set<(event: SyncEvent) => void>();

  constructor() {
    this.sessionId = `SES-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    this.initChannel();
    this.initWebSocket();
    this.startHeartbeat();
  }

  private initChannel(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(DESK_SYNC_CHANNEL_NAME);
        this.channel.onmessage = (ev: MessageEvent<SyncEvent>) => {
          this.handleIncomingMessage(ev.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization failed, falling back to standalone session', err);
      }
    }
  }

  public initWebSocket(customUrl?: string): void {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;

    try {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const defaultUrl = `${protocol}//${window.location.host}/ws/sync`;
      this.wsUrl = customUrl || this.wsUrl || defaultUrl;

      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        this.sendHeartbeat();
      };

      ws.onmessage = (ev: MessageEvent) => {
        try {
          const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
          this.handleIncomingMessage(data);
        } catch (err) {
          console.warn('Failed to parse incoming WebSocket message', err);
        }
      };

      ws.onerror = () => {
        // Handled silently; onclose will manage reconnection
      };

      ws.onclose = () => {
        this.ws = null;
        if (!this.isDestroyed) {
          clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = setTimeout(() => {
            if (!this.isDestroyed) {
              this.initWebSocket(this.wsUrl || undefined);
            }
          }, 5000);
          if (this.wsReconnectTimer && typeof this.wsReconnectTimer.unref === 'function') {
            this.wsReconnectTimer.unref();
          }
        }
      };
    } catch (err) {
      console.warn('WebSocket initialization failed, falling back to BroadcastChannel', err);
    }
  }

  public connectWebSocket(customWs: WebSocket): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
    this.ws = customWs;
    customWs.onmessage = (ev: MessageEvent) => {
      try {
        const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        this.handleIncomingMessage(data);
      } catch (err) {
        console.warn('Failed to parse mock/custom WebSocket message', err);
      }
    };
  }

  public getWsStatus(): 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' {
    if (!this.ws) return 'DISCONNECTED';
    if (this.ws.readyState === WebSocket.OPEN) return 'CONNECTED';
    if (this.ws.readyState === WebSocket.CONNECTING) return 'CONNECTING';
    return 'DISCONNECTED';
  }

  public isWebSocketConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private startHeartbeat(): void {
    if (typeof window === 'undefined') return;

    // Send immediate initial heartbeat
    this.sendHeartbeat();

    this.heartbeatIntervalId = setInterval(() => {
      this.sendHeartbeat();
    }, 3000);
    if (this.heartbeatIntervalId && typeof this.heartbeatIntervalId.unref === 'function') {
      this.heartbeatIntervalId.unref();
    }

    this.pruneIntervalId = setInterval(() => {
      this.pruneDeadPeers();
    }, 4000);
    if (this.pruneIntervalId && typeof this.pruneIntervalId.unref === 'function') {
      this.pruneIntervalId.unref();
    }
  }

  private sendHeartbeat(): void {
    const session = getSessionState();
    this.broadcast({
      type: 'PEER_HEARTBEAT',
      sessionId: this.sessionId,
      actor: session.user.name,
      role: session.activeRole,
      timestamp: new Date().toISOString(),
    });
  }

  private pruneDeadPeers(): void {
    const now = Date.now();
    let changed = false;
    for (const [peerId, lastSeen] of this.peerSessions.entries()) {
      if (now - lastSeen > 8000) {
        this.peerSessions.delete(peerId);
        changed = true;
      }
    }
    if (changed) {
      this.notifySessionCount();
    }
  }

  public handleIncomingMessage(event: SyncEvent): void {
    if (!event || event.sessionId === this.sessionId) {
      // Ignore self-broadcasts
      return;
    }

    // Deduplicate events arriving concurrently via BroadcastChannel and WebSocket
    const dedupKey = `${event.sessionId}_${event.type}_${event.timestamp}`;
    if (this.seenEvents.has(dedupKey)) {
      return;
    }
    this.seenEvents.add(dedupKey);
    if (this.seenEvents.size > 500) {
      const arr = Array.from(this.seenEvents);
      arr.slice(0, 100).forEach(k => this.seenEvents.delete(k));
    }

    // Record peer presence
    const isNewPeer = !this.peerSessions.has(event.sessionId);
    this.peerSessions.set(event.sessionId, Date.now());
    if (isNewPeer) {
      this.notifySessionCount();
    }

    // Dispatch raw event to listeners
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in sync event listener', err);
      }
    });

    // Generate toast notifications for actionable peer events
    switch (event.type) {
      case 'MARKS_UPDATED': {
        const changeStr =
          event.changePct != null
            ? ` (${event.changePct >= 0 ? '+' : ''}${event.changePct.toFixed(2)}%)`
            : '';
        this.emitToast({
          id: `TOAST-${Date.now()}-${Math.random()}`,
          title: `Desk Mark Updated: ${event.marketName}`,
          message: `${event.actor} updated mark to €${event.newMid.toFixed(3)}${changeStr}`,
          type: 'mark',
          timestamp: Date.now(),
        });
        break;
      }
      case 'DEAL_BOOKED': {
        this.emitToast({
          id: `TOAST-${Date.now()}-${Math.random()}`,
          title: `New Trade Booked: ${event.title}`,
          message: `${event.actor} booked ${event.volumeMWh.toLocaleString()} MWh for ${event.marketName} (Net: €${event.netbackEur.toFixed(2)})`,
          type: 'deal',
          timestamp: Date.now(),
        });
        break;
      }
      case 'DEAL_TRANSITIONED': {
        this.emitToast({
          id: `TOAST-${Date.now()}-${Math.random()}`,
          title: `Trade Status: ${event.dealId}`,
          message: `${event.actor} transitioned status to ${event.newStatus}`,
          type: 'deal',
          timestamp: Date.now(),
        });
        break;
      }
      case 'ROLE_CHANGED': {
        break;
      }
      case 'PEER_HEARTBEAT':
      default:
        break;
    }
  }

  private notifySessionCount(): void {
    const count = this.getActiveSessionCount();
    this.sessionCountListeners.forEach(listener => {
      try {
        listener(count);
      } catch (err) {
        console.error('Error in session count listener', err);
      }
    });
  }

  public getActiveSessionCount(): number {
    return this.peerSessions.size + 1;
  }

  public broadcast(event: SyncEvent): void {
    // 1. BroadcastChannel (cross-tab same-origin)
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch (err) {
        console.warn('Failed to broadcast sync event over BroadcastChannel', err);
      }
    }

    // 2. WebSocket (cross-window, cross-node, remote server)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(event));
      } catch (err) {
        console.warn('Failed to broadcast sync event over WebSocket', err);
      }
    }
  }

  public broadcastMarksUpdated(
    marketId: string,
    marketName: string,
    oldMid: number | null,
    newMid: number,
    changePct: number | null
  ): void {
    const session = getSessionState();
    this.broadcast({
      type: 'MARKS_UPDATED',
      sessionId: this.sessionId,
      actor: session.user.name,
      role: session.activeRole,
      timestamp: new Date().toISOString(),
      marketId,
      marketName,
      oldMid,
      newMid,
      changePct,
    });
  }

  public broadcastDealBooked(
    dealId: string,
    title: string,
    volumeMWh: number,
    marketName: string,
    netbackEur: number
  ): void {
    const session = getSessionState();
    this.broadcast({
      type: 'DEAL_BOOKED',
      sessionId: this.sessionId,
      actor: session.user.name,
      role: session.activeRole,
      timestamp: new Date().toISOString(),
      dealId,
      title,
      volumeMWh,
      marketName,
      netbackEur,
    });
  }

  public broadcastDealTransitioned(
    dealId: string,
    previousStatus: DealStatus | null,
    newStatus: DealStatus
  ): void {
    const session = getSessionState();
    this.broadcast({
      type: 'DEAL_TRANSITIONED',
      sessionId: this.sessionId,
      actor: session.user.name,
      role: session.activeRole,
      timestamp: new Date().toISOString(),
      dealId,
      previousStatus,
      newStatus,
    });
  }

  public broadcastRoleChanged(newRole: Role): void {
    const session = getSessionState();
    this.broadcast({
      type: 'ROLE_CHANGED',
      sessionId: this.sessionId,
      actor: session.user.name,
      role: newRole,
      timestamp: new Date().toISOString(),
      newRole,
    });
  }

  public emitToast(toast: ToastNotification): void {
    this.toastListeners.forEach(listener => {
      try {
        listener(toast);
      } catch (err) {
        console.error('Error in toast listener', err);
      }
    });
  }

  public onToast(listener: (toast: ToastNotification) => void): () => void {
    this.toastListeners.add(listener);
    return () => {
      this.toastListeners.delete(listener);
    };
  }

  public onSessionCountChange(listener: (count: number) => void): () => void {
    this.sessionCountListeners.add(listener);
    return () => {
      this.sessionCountListeners.delete(listener);
    };
  }

  public onSyncEvent(listener: (event: SyncEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.heartbeatIntervalId) clearInterval(this.heartbeatIntervalId);
    if (this.pruneIntervalId) clearInterval(this.pruneIntervalId);
    if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.peerSessions.clear();
    this.seenEvents.clear();
    this.toastListeners.clear();
    this.sessionCountListeners.clear();
    this.eventListeners.clear();
  }
}

export const deskSync = new DeskSyncEngine();
