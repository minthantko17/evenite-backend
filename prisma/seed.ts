import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const universities = [
    { name: 'Chiang Mai University', domain: 'cmu.ac.th' },
    // maybe add more universities here later
  ];

  for (const uni of universities) {
    await prisma.university.upsert({
      where: { domain: uni.domain },
      update: {},
      create: {
        name: uni.name,
        domain: uni.domain,
        isActive: true,
      },
    });
  }

  console.log('Seeded universities successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // To run this seed: npx prisma db seed