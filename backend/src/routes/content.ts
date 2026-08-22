import { Router } from 'express';
import prisma from '../prisma';
import { providers } from '../services/providers';

const router = Router();

// Create new content (draft)
router.post('/', async (req, res) => {
  try {
    const { title, content, platforms, mediaUrl } = req.body;
    
    // Create master content
    const newContent = await prisma.content.create({
      data: {
        title: title || 'Untitled Draft',
        content,
        status: 'DRAFT',
      }
    });

    // Create variants if platforms provided
    if (platforms && Array.isArray(platforms)) {
      for (const platform of platforms) {
        await prisma.contentVariant.create({
          data: {
            contentId: newContent.id,
            platform,
            content: content, // Default variant content to master content
            image: mediaUrl || null
          }
        });
      }
    }

    const fullContent = await prisma.content.findUnique({
      where: { id: newContent.id },
      include: { variants: true }
    });

    res.json({ success: true, data: fullContent });
  } catch (error) {
    console.error('Create Content Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.post('/:id/publish', async (req, res) => {
  try {
    const contentId = req.params.id;
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: { variants: true }
    });

    if (!content) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    const results = [];
    
    // Publish each variant
    for (const variant of content.variants) {
      const provider = providers[variant.platform];
      if (provider) {
        const validation = provider.validate(variant.content || '');
        if (validation.valid) {
          const mediaUrls = variant.image ? [variant.image] : undefined;
          const result = await provider.publish(variant.content || '', mediaUrls);
          
          if (result.success) {
            // Master content will be updated below
            results.push({ platform: variant.platform, success: true, url: result.url });
          } else {
            results.push({ platform: variant.platform, success: false, error: result.error });
          }
        } else {
           results.push({ platform: variant.platform, success: false, error: validation.reason });
        }
      }
    }

    // Update master content status
    await prisma.content.update({
      where: { id: contentId },
      data: { status: 'PUBLISHED' }
    });

    res.json({ success: true, results });
  } catch (error) {
    console.error('Publish Content Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
