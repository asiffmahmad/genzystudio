import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Tasks API Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, priority, dueDate, recurrenceType } = req.body;
    
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'NORMAL',
        dueDate: dueDate ? new Date(dueDate) : null,
        recurrenceType,
        status: 'PENDING'
      }
    });

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Create Task Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.post('/:id/complete', async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Mark current task as completed
    await prisma.task.update({
      where: { id: taskId },
      data: { 
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    // Handle Recurrence Logic
    if (task.recurrenceType && task.recurrenceType !== 'NONE') {
      let nextDueDate = new Date();
      if (task.dueDate) {
        nextDueDate = new Date(task.dueDate);
      }
      
      if (task.recurrenceType === 'DAILY') {
        nextDueDate.setDate(nextDueDate.getDate() + 1);
      } else if (task.recurrenceType === 'WEEKLY') {
        nextDueDate.setDate(nextDueDate.getDate() + 7);
      } else if (task.recurrenceType === 'MONTHLY') {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }

      await prisma.task.create({
        data: {
          title: task.title,
          description: task.description,
          priority: task.priority,
          recurrenceType: task.recurrenceType,
          dueDate: nextDueDate,
          status: 'PENDING'
        }
      });
    }

    res.json({ success: true, message: 'Task completed' });
  } catch (error) {
    console.error('Complete Task Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
