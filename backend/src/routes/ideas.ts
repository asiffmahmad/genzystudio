import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const ideas = await prisma.idea.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ success: true, data: ideas });
  } catch (error) {
    console.error('Ideas API Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, tags, sourceUrl, notes } = req.body;
    
    const idea = await prisma.idea.create({
      data: {
        title: title || 'Untitled Idea',
        description,
        tags,
        sourceUrl,
        notes,
        status: 'IDEA'
      }
    });

    res.json({ success: true, data: idea });
  } catch (error) {
    console.error('Create Idea Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.post('/:id/convert', async (req, res) => {
  try {
    const ideaId = req.params.id;
    const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
    
    if (!idea) {
      return res.status(404).json({ success: false, error: 'Idea not found' });
    }

    // Convert Idea to Content
    const contentText = `${idea.description || ''}\n\n${idea.notes || ''}\n\nSource: ${idea.sourceUrl || ''}`;
    
    const newContent = await prisma.content.create({
      data: {
        title: idea.title,
        content: contentText,
        tags: idea.tags,
        status: 'DRAFT',
      }
    });

    // Mark Idea as USED
    await prisma.idea.update({
      where: { id: ideaId },
      data: { status: 'USED' }
    });

    res.json({ success: true, data: newContent });
  } catch (error) {
    console.error('Convert Idea Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
