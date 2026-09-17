import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { SyncEvent, SyncEventType, SyncStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export async function processSyncEvent(
  event: { eventId: string; deviceId: string; type: SyncEventType; timestamp: string; payload: Record<string, unknown> },
): Promise<{ success: boolean; eventId: string; error?: string }> {
  let syncEvent;
  const existing = await prisma.syncEvent.findUnique({ where: { eventId: event.eventId } });
  if (existing) {
    if (existing.status === 'PROCESSED') {
      return { success: true, eventId: event.eventId };
    }
    syncEvent = await prisma.syncEvent.update({
      where: { id: existing.id },
      data: { status: 'PENDING', errorMessage: null },
    });
  } else {
    syncEvent = await prisma.syncEvent.create({
      data: {
        eventId: event.eventId,
        deviceId: event.deviceId,
        eventType: event.type,
        payload: event.payload as any,
        status: 'PENDING',
      },
    });
  }

  try {
    switch (event.type) {
      case 'GAME_ATTEMPT': {
        const payload = event.payload as {
          sessionId: string;
          questionId: string;
          correct: boolean;
          responseTimeMs?: number;
          difficulty: string;
          score?: number;
          offlineEventId?: string;
          patientId: string;
          gameId: string;
          sessionStartedAt?: string;
        };

        if (payload.offlineEventId) {
          const existingAttempt = await prisma.attempt.findUnique({
            where: { offlineEventId: payload.offlineEventId },
          });
          if (existingAttempt) {
            await prisma.syncEvent.update({
              where: { id: syncEvent.id },
              data: { status: 'PROCESSED', processedAt: new Date() },
            });
            return { success: true, eventId: event.eventId };
          }
        }

        let session = await prisma.session.findUnique({ where: { id: payload.sessionId } });
        if (!session) {
          session = await prisma.session.create({
            data: {
              id: payload.sessionId,
              patientId: payload.patientId,
              gameId: payload.gameId,
              startedAt: payload.sessionStartedAt ? new Date(payload.sessionStartedAt) : new Date(),
              offlineCreated: true,
              offlineEventId: payload.offlineEventId || `offline-${uuidv4()}`,
            },
          });
        }

        await prisma.attempt.create({
          data: {
            sessionId: payload.sessionId,
            questionId: payload.questionId,
            correct: payload.correct,
            responseTimeMs: payload.responseTimeMs ?? null,
            difficulty: payload.difficulty as import('@prisma/client').GameDifficulty,
            score: payload.score ?? null,
            offlineEventId: payload.offlineEventId,
          },
        });

        break;
      }

      case 'SESSION_START': {
        const payload = event.payload as {
          sessionId: string;
          patientId: string;
          gameId: string;
          startedAt?: string;
          offlineEventId?: string;
        };

        let existingSession: { id: string } | null = null;
        if (payload.offlineEventId) {
          existingSession = await prisma.session.findUnique({
            where: { offlineEventId: payload.offlineEventId },
            select: { id: true },
          });
        }
        if (!existingSession) {
          existingSession = await prisma.session.findUnique({
            where: { id: payload.sessionId },
            select: { id: true },
          });
        }

        if (!existingSession) {
          await prisma.session.create({
            data: {
              id: payload.sessionId,
              patientId: payload.patientId,
              gameId: payload.gameId,
              startedAt: payload.startedAt ? new Date(payload.startedAt) : new Date(),
              offlineCreated: true,
              offlineEventId: payload.offlineEventId,
            },
          });
        }
        break;
      }

      case 'SESSION_END': {
        const payload = event.payload as {
          sessionId: string;
          endedAt?: string;
          completionStatus?: string;
        };

        await prisma.session.update({
          where: { id: payload.sessionId },
          data: {
            endedAt: payload.endedAt ? new Date(payload.endedAt) : new Date(),
            completionStatus: (payload.completionStatus as 'COMPLETED' | 'PARTIAL' | 'ABANDONED' | 'TIMEOUT') || 'COMPLETED',
          },
        });
        break;
      }

      case 'MOOD_CHECKIN': {
        const payload = event.payload as {
          patientId: string;
          mood: string;
          notes?: string;
        };

        await prisma.caregiverMoodCheckin.create({
          data: {
            patientId: payload.patientId,
            mood: payload.mood as 'HAPPY' | 'NEUTRAL' | 'SAD',
            notes: payload.notes,
          },
        });
        break;
      }

      case 'REMINDER_DISMISSED': {
        const payload = event.payload as { reminderId: string };

        await prisma.reminder.update({
          where: { id: payload.reminderId },
          data: { active: false },
        });
        break;
      }

      case 'PERSONALIZATION_UPDATE': {
        const payload = event.payload as {
          patientId: string;
          level?: string;
          photosMetadata?: Record<string, unknown>;
          voiceMetadata?: Record<string, unknown>;
          preferences?: Record<string, unknown>;
        };

        await prisma.personalization.upsert({
          where: { patientId: payload.patientId },
          update: {
            ...(payload.level && { level: payload.level as 'GENERIC' | 'FULL' }),
            ...(payload.photosMetadata && { photosMetadata: payload.photosMetadata as any }),
            ...(payload.voiceMetadata && { voiceMetadata: payload.voiceMetadata as any }),
            ...(payload.preferences && { preferences: payload.preferences as any }),
          },
          create: {
            patientId: payload.patientId,
            level: (payload.level as 'GENERIC' | 'FULL') || 'GENERIC',
            photosMetadata: (payload.photosMetadata || undefined) as any,
            voiceMetadata: (payload.voiceMetadata || undefined) as any,
            preferences: (payload.preferences || undefined) as any,
          },
        });
        break;
      }
    }

    await prisma.syncEvent.update({
      where: { id: syncEvent.id },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });

    return { success: true, eventId: event.eventId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('sync.failed', {
      eventId: event.eventId,
      error: { name: error instanceof Error ? error.name : 'Error', message: errorMessage },
    });

    await prisma.syncEvent.update({
      where: { id: syncEvent.id },
      data: { status: 'FAILED', errorMessage },
    });

    return { success: false, eventId: event.eventId, error: errorMessage };
  }
}

export async function processSyncBatch(
  events: Array<{ eventId: string; deviceId: string; type: SyncEventType; timestamp: string; payload: Record<string, unknown> }>,
): Promise<Array<{ eventId: string; success: boolean; error?: string }>> {
  const results: Array<{ eventId: string; success: boolean; error?: string }> = [];

  for (const event of events) {
    const result = await processSyncEvent(event);
    results.push(result);
  }

  return results;
}

export async function getSyncStatus(
  deviceId: string,
): Promise<{ pending: number; processed: number; failed: number }> {
  const [pending, processed, failed] = await Promise.all([
    prisma.syncEvent.count({ where: { deviceId, status: 'PENDING' } }),
    prisma.syncEvent.count({ where: { deviceId, status: 'PROCESSED' } }),
    prisma.syncEvent.count({ where: { deviceId, status: 'FAILED' } }),
  ]);

  return { pending, processed, failed };
}

export async function retryFailedEvents(
  deviceId: string,
): Promise<{ retried: number }> {
  const failedEvents = await prisma.syncEvent.findMany({
    where: { deviceId, status: 'FAILED' },
    orderBy: { createdAt: 'asc' },
  });

  let retried = 0;

  for (const event of failedEvents) {
    await prisma.syncEvent.update({
      where: { id: event.id },
      data: { status: 'PENDING', errorMessage: null },
    });

    const result = await processSyncEvent({
      eventId: event.eventId,
      deviceId: event.deviceId,
      type: event.eventType,
      timestamp: event.createdAt.toISOString(),
      payload: event.payload as Record<string, unknown>,
    });

    if (result.success) retried++;
  }

  return { retried };
}
