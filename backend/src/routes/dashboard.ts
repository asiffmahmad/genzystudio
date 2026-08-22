import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    // Get basic stats
    const totalPosts = await prisma.content.count();
    const publishedPosts = await prisma.scheduledPost.count({ where: { status: 'PUBLISHED' } });
    const scheduledPosts = await prisma.scheduledPost.count({ where: { status: 'SCHEDULED' } });
    const draftPosts = await prisma.content.count({ where: { status: 'DRAFT' } });

    // Mock reach & engagement since we might not have real analytics yet
    const analytics = await prisma.analyticsSnapshot.aggregate({
      _sum: {
        reach: true,
        engagementRate: true,
        followers: true,
      }
    });

    // Upcoming posts
    const upcoming = await prisma.scheduledPost.findMany({
      where: { status: 'SCHEDULED' },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
    });

    // Recent posts
    const recent = await prisma.scheduledPost.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });

    res.json({
      success: true,
      stats: {
        totalPosts,
        publishedPosts,
        scheduledPosts,
        draftPosts,
        totalReach: analytics._sum.reach || 0,
        engagementRate: analytics._sum.engagementRate || 0,
        followers: analytics._sum.followers || 0,
        growth: "0%"
      },
      upcoming,
      recent
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
