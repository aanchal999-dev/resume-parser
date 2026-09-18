import { Response } from 'express';
import Redis from 'ioredis';
import { ENV } from '../config/env';

/**
 * Stores active Express Response HTTP streams grouped by batchId.
 */
const sseClientsMap = new Map<string, Response[]>();

/**
 * Dedicated Redis Subscriber connection for cross-microservice progress events.
 * Listens to Pub/Sub channels emitted by Worker containers.
 */
const redisSubscriber = new Redis({
  host: ENV.REDIS_HOST,
  port: ENV.REDIS_PORT,
});

/**
 * Subscribe to pattern 'sse:batch:*' in Redis Pub/Sub
 */
redisSubscriber.psubscribe('sse:batch:*', (err, count) => {
  if (err) {
    console.error('Failed to subscribe to Redis SSE channel:', err);
  } else {
    console.log(`Subscribed to Redis SSE pattern 'sse:batch:*'. Active channels: ${count}`);
  }
});

/**
 * Handles incoming Redis Pub/Sub messages published by background Worker containers,
 * and relays them directly to connected Angular clients via Server-Sent Events (SSE).
 */
redisSubscriber.on('pmessage', (pattern, channel, message) => {
  const batchId = channel.replace('sse:batch:', '');
  const clients = sseClientsMap.get(batchId);
  if (clients && clients.length > 0) {
    const dataString = `data: ${message}\n\n`;
    clients.forEach(client => client.write(dataString));
  }
});

/**
 * Registers an HTTP response stream for real-time Server-Sent Events (SSE) progress updates.
 * Configures standard SSE HTTP headers: Content-Type: text/event-stream, Cache-Control: no-cache.
 */
export function addSSEClient(batchId: string, res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!sseClientsMap.has(batchId)) {
    sseClientsMap.set(batchId, []);
  }

  const clients = sseClientsMap.get(batchId)!;
  clients.push(res);

  // Send initial connection handshake event to Angular client
  res.write(`data: ${JSON.stringify({ status: 'CONNECTED', batchId, message: 'SSE Stream Connected' })}\n\n`);

  // Cleanup stream reference on browser disconnect
  res.on('close', () => {
    const currentClients = sseClientsMap.get(batchId) || [];
    const updatedClients = currentClients.filter(client => client !== res);
    if (updatedClients.length > 0) {
      sseClientsMap.set(batchId, updatedClients);
    } else {
      sseClientsMap.delete(batchId);
    }
  });
}

/**
 * Emits a real-time progress update event directly to all subscribed HTTP clients for a batch
 */
export function emitSSEEvent(batchId: string, payload: any): void {
  const clients = sseClientsMap.get(batchId);
  if (clients && clients.length > 0) {
    const dataString = `data: ${JSON.stringify(payload)}\n\n`;
    clients.forEach(client => client.write(dataString));
  }
}
