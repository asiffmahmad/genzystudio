'use server';

import prisma from '../lib/prisma';

export async function getScheduledPosts(start?: string, end?: string) {
  try {
    let whereClause = {};
    if (start && end) {
      whereClause = {
        scheduledAt: {
          gte: new Date(start),
          lte: new Date(end)
        }
      };
    }

    const scheduledPosts = await prisma.scheduledPost.findMany({
      where: whereClause,
      include: {
        content: {
          select: {
            title: true
          }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    return { success: true, data: scheduledPosts };
  } catch (error) {
    console.error('Calendar Action Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
