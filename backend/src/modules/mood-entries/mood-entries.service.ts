import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export async function getByPatient(patientId: string) {
  return prisma.moodEntry.findMany({
    where: { patientId },
    orderBy: { date: 'desc' },
  });
}

export async function getByPatientAndUser(patientId: string, userId: string) {
  return prisma.moodEntry.findMany({
    where: { patientId, userId },
    orderBy: { date: 'desc' },
  });
}

export async function create(data: {
  patientId: string;
  mood: string;
  note?: string;
  date?: string;
}, userId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
  if (!patient) throw new NotFoundError('Patient not found');

  const newEntry = await prisma.moodEntry.create({
    data: {
      patientId: data.patientId,
      userId,
      mood: data.mood,
      note: data.note,
      date: data.date ? new Date(data.date) : new Date(),
    },
  });

  // Check for Caregiver Mood Alert (3 consecutive negative moods)
  const recentMoods = await prisma.moodEntry.findMany({
    where: { patientId: data.patientId, userId },
    orderBy: { date: 'desc' },
    take: 3,
  });

  if (recentMoods.length === 3) {
    const isConsistentlyNegative = recentMoods.every((m) => m.mood === 'bad' || m.mood === 'exhausted');
    if (isConsistentlyNegative) {
      const existingAlert = await prisma.alert.findFirst({
        where: {
          patientId: data.patientId,
          type: 'CAREGIVER_SUPPORT',
          status: 'ACTIVE',
        },
      });

      if (!existingAlert) {
        await prisma.alert.create({
          data: {
            patientId: data.patientId,
            type: 'CAREGIVER_SUPPORT',
            severity: 'HIGH',
            message: 'Caregiver has logged 3 consecutive negative moods. Consider checking in or offering support.',
            metadata: { userId },
          },
        });
      }
    }
  }

  return newEntry;
}

export async function remove(id: string) {
  const existing = await prisma.moodEntry.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Mood entry not found');
  await prisma.moodEntry.delete({ where: { id } });
  return { message: 'Mood entry deleted successfully' };
}
