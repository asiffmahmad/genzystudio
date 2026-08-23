'use server';

import prisma from '../lib/prisma';
import { providers } from '../lib/providers';

export async function createContent(data: { title: string; content: string; platforms: string[]; mediaUrl?: string }) {
  try {
    const { title, content, platforms, mediaUrl } = data;
    
    const newContent = await prisma.content.create({
      data: {
        title: title || 'Untitled Draft',
        content,
        status: 'DRAFT',
      }
    });

    if (platforms && Array.isArray(platforms)) {
      for (const platform of platforms) {
        await prisma.contentVariant.create({
          data: {
            contentId: newContent.id,
            platform,
            content: content,
            image: mediaUrl || null
          }
        });
      }
    }

    const fullContent = await prisma.content.findUnique({
      where: { id: newContent.id },
      include: { variants: true }
    });

    return { success: true, data: fullContent };
  } catch (error) {
    console.error('Create Content Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function publishContent(contentId: string) {
  try {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: { variants: true }
    });

    if (!content) {
      return { success: false, error: 'Content not found' };
    }

    const results = [];
    
    for (const variant of content.variants) {
      const provider = providers[variant.platform];
      if (provider) {
        const validation = provider.validate(variant.content || '');
        if (validation.valid) {
          const mediaUrls = variant.image ? [variant.image] : undefined;
          const result = await provider.publish(variant.content || '', mediaUrls);
          
          if (result.success) {
            results.push({ platform: variant.platform, success: true, url: result.url });
          } else {
            results.push({ platform: variant.platform, success: false, error: result.error });
          }
        } else {
           results.push({ platform: variant.platform, success: false, error: validation.reason });
        }
      }
    }

    await prisma.content.update({
      where: { id: contentId },
      data: { status: 'PUBLISHED' }
    });

    return { success: true, results };
  } catch (error) {
    console.error('Publish Content Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function getContents() {
  try {
    const contents = await prisma.content.findMany({
      include: { variants: true },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: contents };
  } catch (error) {
    console.error('Get Contents Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function deleteContent(contentId: string) {
  try {
    // 1. Delete scheduled posts from ScheduledPost table
    await prisma.scheduledPost.deleteMany({
      where: { contentId: contentId }
    });

    // 2. Manually delete variants first to avoid foreign key violations
    await prisma.contentVariant.deleteMany({
      where: { contentId: contentId }
    });

    // 3. Delete the master content record
    await prisma.content.delete({
      where: { id: contentId }
    });

    return { success: true, message: 'Post deleted successfully from database.' };
  } catch (error: any) {
    console.error('Delete Content Error:', error);
    return { success: false, error: error.message || 'Internal Server Error' };
  }
}

export async function scheduleContent(contentId: string, scheduledAt: string) {
  try {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: { variants: true }
    });

    if (!content) {
      return { success: false, error: 'Content not found' };
    }

    const scheduledDate = new Date(scheduledAt);

    // Create a ScheduledPost record for each variant/platform
    for (const variant of content.variants) {
      await prisma.scheduledPost.create({
        data: {
          contentId: contentId,
          platform: variant.platform,
          scheduledAt: scheduledDate,
          status: 'SCHEDULED'
        }
      });
    }

    // Update parent content status to SCHEDULED
    await prisma.content.update({
      where: { id: contentId },
      data: { status: 'SCHEDULED' }
    });

    return { success: true, message: 'Content scheduled successfully.' };
  } catch (error) {
    console.error('Schedule Content Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function updateScheduledTime(contentId: string, scheduledAt: string) {
  try {
    const scheduledDate = new Date(scheduledAt);
    await prisma.scheduledPost.updateMany({
      where: { contentId: contentId },
      data: { scheduledAt: scheduledDate }
    });
    return { success: true, message: 'Scheduled time updated successfully.' };
  } catch (error) {
    console.error('Update Scheduled Time Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function updateContent(contentId: string, data: { title: string; content: string }) {
  try {
    const { title, content } = data;
    await prisma.content.update({
      where: { id: contentId },
      data: { title, content }
    });
    await prisma.contentVariant.updateMany({
      where: { contentId: contentId },
      data: { content: content }
    });
    return { success: true };
  } catch (error) {
    console.error('Update Content Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function getScheduledTime(contentId: string) {
  try {
    const post = await prisma.scheduledPost.findFirst({
      where: { contentId: contentId }
    });
    return { success: true, data: post ? post.scheduledAt : null };
  } catch (error) {
    console.error('Get Scheduled Time Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
