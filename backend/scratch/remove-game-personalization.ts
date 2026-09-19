import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const gamesWithPersonalization = await prisma.$queryRaw`SELECT id, name, slug, "personalizationLevel" FROM games WHERE "personalizationLevel" = 'FULL'`;

  console.log(`Found ${(gamesWithPersonalization as any[]).length} games with FULL personalization.`);

  const result = await prisma.$executeRaw`UPDATE games SET "personalizationLevel" = 'GENERIC' WHERE "personalizationLevel" = 'FULL'`;

  console.log(`Updated games to GENERIC personalization.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
