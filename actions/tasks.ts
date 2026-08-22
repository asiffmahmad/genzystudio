'use server';

import prisma from '../lib/prisma';

export async function getTasks() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { dueDate: 'asc' }
    });
    return { success: true, data: tasks };
  } catch (error) {
    console.error('Get Tasks Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function completeTask(taskId: string) {
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'COMPLETED' }
    });

    if (task.recurrenceType && task.recurrenceType !== 'NONE') {
      const nextDate = new Date(task.dueDate || new Date());
      if (task.recurrenceType === 'DAILY') nextDate.setDate(nextDate.getDate() + 1);
      if (task.recurrenceType === 'WEEKLY') nextDate.setDate(nextDate.getDate() + 7);
      if (task.recurrenceType === 'MONTHLY') nextDate.setMonth(nextDate.getMonth() + 1);

      await prisma.task.create({
        data: {
          title: task.title,
          description: task.description,
          priority: task.priority,
          recurrenceType: task.recurrenceType,
          dueDate: nextDate,
          status: 'PENDING'
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Complete Task Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
