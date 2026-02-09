import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { store } from '../store';
import { Stream, StreamStatus, SLOT_TARIFFS } from '../types';

const router = Router();

/**
 * POST /api/streams
 * Create a new stream.
 * Body: { broadcasterId: string }
 */
router.post('/', (req: Request, res: Response) => {
  const { broadcasterId } = req.body;

  if (!broadcasterId) {
    res.status(400).json({ error: 'broadcasterId is required' });
    return;
  }

  const stream: Stream = {
    id: uuid(),
    status: StreamStatus.ACTIVE,
    createdAt: new Date(),
    endedAt: null,
    broadcasterId,
    controlEnabled: true,
  };

  store.createStream(stream);

  console.log(
    `[STREAM] Created stream ${stream.id} by broadcaster ${broadcasterId}`
  );

  res.status(201).json({
    streamId: stream.id,
    status: stream.status,
    createdAt: stream.createdAt.toISOString(),
  });
});

/**
 * GET /api/streams
 * List active streams.
 */
router.get('/', (_req: Request, res: Response) => {
  const streams = store.getActiveStreams().map((s) => ({
    streamId: s.id,
    createdAt: s.createdAt.toISOString(),
    broadcasterId: s.broadcasterId,
    controlEnabled: s.controlEnabled,
  }));

  res.json(streams);
});

/**
 * GET /api/tariffs
 * Get available slot tariffs.
 */
router.get('/config/tariffs', (_req: Request, res: Response) => {
  res.json(SLOT_TARIFFS);
});

/**
 * GET /api/streams/:streamId
 * Get stream details.
 */
router.get('/:streamId', (req: Request, res: Response) => {
  const streamId = req.params.streamId as string;
  const stream = store.getStream(streamId);
  if (!stream) {
    res.status(404).json({ error: 'Stream not found' });
    return;
  }

  res.json({
    streamId: stream.id,
    status: stream.status,
    createdAt: stream.createdAt.toISOString(),
    endedAt: stream.endedAt?.toISOString() || null,
    broadcasterId: stream.broadcasterId,
    controlEnabled: stream.controlEnabled,
  });
});

export default router;
