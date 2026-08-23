import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { providers } from '@/lib/providers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!isVercelCron && cronSecret && cronSecret !== 'your-cron-secret-here' && authHeader !== `Bearer ${cronSecret}`) {
      const url = new URL(request.url);
      const queryKey = url.searchParams.get('key');
      if (queryKey !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const now = new Date();
    // Fetch all scheduled posts that are due to publish
    const duePosts = await prisma.scheduledPost.findMany({
      where: {
        scheduledAt: { lte: now },
        status: 'SCHEDULED'
      }
    });

    if (duePosts.length === 0) {
      return NextResponse.json({ success: true, message: 'No scheduled posts due.' });
    }

    const results = [];

    for (const post of duePosts) {
      try {
        // Update status to PUBLISHING to prevent race conditions
        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: { status: 'PUBLISHING', lastAttemptAt: new Date() }
        });

        // Retrieve the platform-specific variant content
        const variant = await prisma.contentVariant.findFirst({
          where: {
            contentId: post.contentId,
            platform: post.platform
          }
        });

        if (!variant) {
          throw new Error(`Content variant not found for platform ${post.platform}`);
        }

        const provider = providers[post.platform];
        if (!provider) {
          throw new Error(`Provider not found for platform ${post.platform}`);
        }

        // Validate post limits
        const validation = provider.validate(variant.content || '');
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.reason}`);
        }

        // Execute social publish call
        const mediaUrls = variant.image ? [variant.image] : undefined;
        const publishResult = await provider.publish(variant.content || '', mediaUrls);

        if (publishResult.success) {
          await prisma.scheduledPost.update({
            where: { id: post.id },
            data: {
              status: 'PUBLISHED',
              publishedAt: new Date()
            }
          });

          // Log in publication results history
          await prisma.publicationResult.create({
            data: {
              scheduledPostId: post.id,
              platform: post.platform,
              success: true,
              providerId: publishResult.url || 'success'
            }
          });

          results.push({ id: post.id, platform: post.platform, success: true });
        } else {
          throw new Error(publishResult.error || 'Publish call returned failure status');
        }
      } catch (err: any) {
        console.error(`[Cron Publish] Failed scheduled post ID ${post.id}:`, err);
        const nextRetry = post.retryCount + 1;
        const isFailed = nextRetry >= post.maxRetries;

        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: {
            status: isFailed ? 'FAILED' : 'SCHEDULED', // reschedule or fail permanently
            retryCount: nextRetry,
            errorMessage: err.message || 'Unknown publishing error'
          }
        });

        await prisma.publicationResult.create({
          data: {
            scheduledPostId: post.id,
            platform: post.platform,
            success: false,
            errorMessage: err.message || 'Unknown publishing error'
          }
        });

        results.push({ id: post.id, platform: post.platform, success: false, error: err.message });
      }
    }

    // Update parent Content status if all associated scheduled posts for it are done
    const contentIds = Array.from(new Set(duePosts.map(p => p.contentId)));
    for (const contentId of contentIds) {
      const remaining = await prisma.scheduledPost.count({
        where: {
          contentId,
          status: 'SCHEDULED'
        }
      });
      if (remaining === 0) {
        await prisma.content.update({
          where: { id: contentId },
          data: { status: 'PUBLISHED' }
        });
      }
    }

    return NextResponse.json({ success: true, processedCount: duePosts.length, results });
  } catch (error: any) {
    console.error('[Cron Publish] Top-level handler failure:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
