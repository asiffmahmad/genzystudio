import prisma from '../lib/prisma';

async function main() {
  console.log('--- SCHEDULED POSTS ---');
  const posts = await prisma.scheduledPost.findMany();
  console.log(JSON.stringify(posts, null, 2));

  console.log('\n--- PUBLICATION RESULTS ---');
  const results = await prisma.publicationResult.findMany();
  console.log(JSON.stringify(results, null, 2));
  
  console.log('\n--- SYSTEM TIME ---');
  console.log('Current Server Date/Time:', new Date().toISOString());
}

main().catch(console.error);
