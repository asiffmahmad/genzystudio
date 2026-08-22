import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    let whereClause = {};
    if (start && end) {
      whereClause = {
        scheduledAt: {
          gte: new Date(start as string),
          lte: new Date(end as string)
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

    res.json({ success: true, data: scheduledPosts });
  } catch (error) {
    console.error('Calendar API Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
