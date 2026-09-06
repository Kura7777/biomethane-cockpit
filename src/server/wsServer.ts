import type http from 'node:http';
import type net from 'node:net';
import crypto from 'node:crypto';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export function encodeWsFrame(data: string): Buffer {
  const payload = Buffer.from(data, 'utf-8');
  const len = payload.length;
  let header: Buffer;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text frame
    header[1] = len;
  } else if (len <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

export function encodePongFrame(payload: Buffer = Buffer.alloc(0)): Buffer {
  const header = Buffer.alloc(2);
  header[0] = 0x8a; // FIN + pong
  header[1] = payload.length;
  return Buffer.concat([header, payload]);
}

export function encodeCloseFrame(): Buffer {
  return Buffer.from([0x88, 0x00]);
}

const activeSockets = new Set<net.Socket>();

export function getWsClientCount(): number {
  return activeSockets.size;
}

export function broadcastWsMessage(message: string, originSocket?: net.Socket): void {
  const frame = encodeWsFrame(message);
  for (const socket of activeSockets) {
    if (socket !== originSocket && !socket.destroyed && socket.writable) {
      try {
        socket.write(frame);
      } catch (err) {
        console.warn('Failed to broadcast WS frame to peer socket', err);
      }
    }
  }
}

export function closeAllWsClients(): void {
  const closeFrame = encodeCloseFrame();
  for (const socket of activeSockets) {
    try {
      socket.write(closeFrame);
      socket.end();
    } catch {
      // Ignored
    }
  }
  activeSockets.clear();
}

export function handleWsUpgrade(
  req: http.IncomingMessage,
  socket: net.Socket,
  head: Buffer
): boolean {
  const url = req.url || '';
  if (!url.startsWith('/ws/sync') && !url.startsWith('/api/v1/ws')) {
    return false;
  }

  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return true;
  }

  const accept = crypto
    .createHash('sha1')
    .update(key + WS_GUID)
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '\r\n',
  ];

  socket.write(headers.join('\r\n'));
  activeSockets.add(socket);

  let buffer = head && head.length > 0 ? Buffer.from(head) : Buffer.alloc(0);

  socket.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 2) {
      const opcode = buffer[0] & 0x0f;
      const masked = (buffer[1] & 0x80) !== 0;
      let len = buffer[1] & 0x7f;
      let offset = 2;

      if (len === 126) {
        if (buffer.length < 4) break;
        len = buffer.readUInt16BE(2);
        offset = 4;
      } else if (len === 127) {
        if (buffer.length < 10) break;
        len = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      let mask: Buffer | null = null;
      if (masked) {
        if (buffer.length < offset + 4) break;
        mask = buffer.subarray(offset, offset + 4);
        offset += 4;
      }

      if (buffer.length < offset + len) break;

      const payload = Buffer.from(buffer.subarray(offset, offset + len));
      if (masked && mask) {
        for (let i = 0; i < len; i++) {
          payload[i] ^= mask[i % 4];
        }
      }

      buffer = buffer.subarray(offset + len);

      if (opcode === 0x1) {
        // Text frame: broadcast to all other active sockets
        const text = payload.toString('utf-8');
        broadcastWsMessage(text, socket);
      } else if (opcode === 0x8) {
        // Close frame
        socket.write(encodeCloseFrame());
        socket.end();
      } else if (opcode === 0x9) {
        // Ping frame -> respond with Pong
        socket.write(encodePongFrame(payload));
      }
    }
  });

  const cleanup = () => {
    activeSockets.delete(socket);
  };

  socket.on('close', cleanup);
  socket.on('end', cleanup);
  socket.on('error', cleanup);

  return true;
}

export function attachWebSocketServer(server: any): void {
  if (!server || typeof server.on !== 'function') return;

  // Prevent duplicate upgrade handlers if attached multiple times
  const existingListeners = typeof server.listeners === 'function' ? server.listeners('upgrade') : [];
  const alreadyAttached = existingListeners.some(
    (fn: any) => fn.__biomethane_desk_ws === true
  );
  if (alreadyAttached) return;

  const upgradeListener = (req: http.IncomingMessage, socket: any, head: Buffer) => {
    handleWsUpgrade(req, socket as net.Socket, head);
  };
  (upgradeListener as any).__biomethane_desk_ws = true;

  server.on('upgrade', upgradeListener);
}

