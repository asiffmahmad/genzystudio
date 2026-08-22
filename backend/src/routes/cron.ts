import { Router } from 'express';
import prisma from '../prisma';
import { providers } from '../services/providers';

const router = Router();

router.post('/publish', async (req, res) => {
  try {
    // 1. Authenticate the cron request
    const cronSecret = req.headers['authorization'];
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // 2. Find due scheduled posts
    const now = new Date();
    const duePosts = await prisma.scheduledPost.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now }
      },
      include: {
        content: {
          include: { variants: true }
        }
      }
    });

    const results = [];

    // 3. Process each due post
    for (const post of duePosts) {
      // Find the specific variant for this platform
      const variant = post.content.variants.find(v => v.platform === post.platform);
      
      if (!variant) {
        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: { status: 'FAILED', errorMessage: `No variant found for platform ${post.platform}` }
        });
        continue;
      }

      // Idempotency check: Already published?
      const alreadyPublished = await prisma.publicationResult.findFirst({
        where: {
          scheduledPostId: post.id,
          platform: post.platform,
          success: true
        }
      });

      if (alreadyPublished) {
        // Skip it
        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: { status: 'PUBLISHED', publishedAt: alreadyPublished.createdAt }
        });
        continue;
      }

      // 4. Lock/claim it
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { status: 'PUBLISHING', lastAttemptAt: new Date() }
      });

      const provider = providers[post.platform];
      if (!provider) {
        await recordFailure(post.id, post.platform, 'Provider not found');
        continue;
      }

      const validation = provider.validate(variant.content || '');
      if (!validation.valid) {
        await recordFailure(post.id, post.platform, `Validation failed: ${validation.reason}`);
        continue;
      }

      try {
        // 5. Publish via provider
        const publishResult = await provider.publish(variant.content || '');

        if (publishResult.success) {
          // Store result
          await prisma.publicationResult.create({
            data: {
              scheduledPostId: post.id,
              platform: post.platform,
              success: true,
              providerId: publishResult.url // storing url in providerId for reference
            }
          });

          // Update status
          await prisma.scheduledPost.update({
            where: { id: post.id },
            data: { status: 'PUBLISHED', publishedAt: new Date() }
          });

          // Also update the variant status to sync with the scheduled post
          await prisma.contentVariant.update({
            where: { id: variant.id },
            data: { status: 'PUBLISHED', publishedUrl: publishResult.url, publishedAt: new Date() }
          });
          
          results.push({ post: post.id, success: true });
        } else {
          await recordFailure(post.id, post.platform, publishResult.error || 'Unknown publishing error');
        }
      } catch (err: any) {
        await recordFailure(post.id, post.platform, err.message);
      }
    }

    res.json({ success: true, processed: duePosts.length, results });
  } catch (error) {
    console.error('Cron Publish Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

async function recordFailure(postId: string, platform: string, errorMsg: string) {
  await prisma.publicationResult.create({
    data: {
      scheduledPostId: postId,
      platform,
      success: false,
      errorMessage: errorMsg
    }
  });

  const post = await prisma.scheduledPost.findUnique({ where: { id: postId } });
  if (!post) return;

  const newRetryCount = post.retryCount + 1;
  const newStatus = newRetryCount >= post.maxRetries ? 'FAILED' : 'SCHEDULED';

  await prisma.scheduledPost.update({
    where: { id: postId },
    data: {
      status: newStatus,
      errorMessage: errorMsg,
      retryCount: newRetryCount
    }
  });
}

export default router;
