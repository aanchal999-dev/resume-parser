import Redis from 'ioredis';
import { ENV } from '../config/env';

/**
 * Dedicated Redis Publisher connection for broadcasting worker progress events
 * across microservice boundaries.
 */
const redisPublisher = new Redis({
  host: ENV.REDIS_HOST,
  port: ENV.REDIS_PORT,
});

/**
 * Publishes a real-time progress event to Redis Pub/Sub channel 'sse:batch:<batchId>'
 * so the API microservice can relay it to connected Angular browser screens.
 */
export function emitSSEEvent(batchId: string, payload: any): void {
  try {
    const channel = `sse:batch:${batchId}`;
    redisPublisher.publish(channel, JSON.stringify(payload));
  } catch (error: any) {
    console.error(`Error publishing SSE event for batch '${batchId}':`, error.message || error);
  }
}
