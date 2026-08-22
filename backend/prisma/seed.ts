import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Create user
  const user = await prisma.user.upsert({
    where: { email: 'admin@genzydev.com' },
    update: {},
    create: {
      email: 'admin@genzydev.com',
      password: 'password123', // In a real app this would be hashed
    },
  });

  // Create mock social accounts
  await prisma.socialAccount.createMany({
    data: [
      {
        platform: 'LinkedIn',
        accountName: 'GenzyDev',
        accountType: 'COMPANY',
        connectionStatus: 'CONNECTED',
      },
      {
        platform: 'X',
        accountName: '@GenzyDev',
        connectionStatus: 'CONNECTED',
      }
    ],
    skipDuplicates: true
  });

  // Create content
  const content = await prisma.content.create({
    data: {
      title: 'Spring Boot 4 is here',
      content: 'Spring Boot 4 introduces massive changes...',
      status: 'DRAFT',
      variants: {
        create: [
          {
            platform: 'LinkedIn',
            content: 'Spring Boot 4 introduces massive changes for enterprise Java...',
          },
          {
            platform: 'X',
            content: 'Spring Boot 4 is out! 🚀\n\nWhat are your thoughts on the new features?',
          }
        ]
      }
    }
  });

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
