const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const gamesWithPersonalization = await prisma.$queryRawUnsafe(`SELECT id, name, slug, "personalizationLevel" FROM games WHERE "personalizationLevel" = 'FULL'`);

  console.log(`Found ${gamesWithPersonalization.length} games with FULL personalization.`);

  const result = await prisma.$executeRawUnsafe(`UPDATE games SET "personalizationLevel" = 'GENERIC' WHERE "personalizationLevel" = 'FULL'`);

  console.log(`Updated games to GENERIC personalization. Rows affected: ${result}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
