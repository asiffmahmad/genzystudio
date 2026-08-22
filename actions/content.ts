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
