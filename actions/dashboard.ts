'use server';

import prisma from '../lib/prisma';

export async function getDashboardStats() {
  try {
    const totalPosts = await prisma.content.count();
    const publishedPosts = await prisma.content.count({ where: { status: 'PUBLISHED' } });
    const scheduledPosts = await prisma.content.count({ where: { status: 'SCHEDULED' } });
    const draftPosts = await prisma.content.count({ where: { status: 'DRAFT' } });

    const upcoming = await prisma.content.findMany({
      where: { status: 'SCHEDULED' },
      orderBy: { scheduledAt: 'asc' },
      take: 5
    });

    const recent = await prisma.content.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 5
    });

    return {
      success: true,
      stats: {
        totalPosts,
        publishedPosts,
        scheduledPosts,
        draftPosts,
        totalReach: 124500, // Mock
        engagementRate: 4.2, // Mock
        followers: 15200, // Mock
        growth: '+12%', // Mock
      },
      upcoming,
      recent
    };
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
