'use server';

import prisma from '../lib/prisma';

export async function getScheduledPosts(start?: string, end?: string) {
  try {
    const scheduledPosts = await (prisma.scheduledPost as any).findMany({
      where: start && end
        ? { scheduledAt: { gte: new Date(start), lte: new Date(end) } }
        : {},
      include: { content: { select: { title: true } } },
      orderBy: { scheduledAt: 'asc' }
    });

    return { success: true, data: scheduledPosts };
  } catch (error) {
    console.error('Calendar Action Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
