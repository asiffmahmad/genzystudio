import prisma from '../lib/prisma';

async function main() {
  console.log('--- CONTENT RECORDS ---');
  const contents = await prisma.content.findMany({
    include: { variants: true }
  });
  console.log(JSON.stringify(contents, null, 2));

  console.log('\n--- SCHEDULED POSTS ---');
  const posts = await prisma.scheduledPost.findMany();
  console.log(JSON.stringify(posts, null, 2));
}

main().catch(console.error);
