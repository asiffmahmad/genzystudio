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

export async function createTask(data: { title: string; description?: string; priority?: string; dueDate?: string | null; recurrenceType?: string }) {
  try {
    const { title, description, priority, dueDate, recurrenceType } = data;
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'NORMAL',
        dueDate: dueDate ? new Date(dueDate) : null,
        recurrenceType: recurrenceType || 'NONE',
        status: 'PENDING'
      }
    });
    return { success: true, data: task };
  } catch (error) {
    console.error('Create Task Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function updateTask(taskId: string, data: { title: string; description?: string; priority?: string; dueDate?: string | null; recurrenceType?: string; status?: string }) {
  try {
    const { title, description, priority, dueDate, recurrenceType, status } = data;
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        title,
        description,
        priority: priority || 'NORMAL',
        dueDate: dueDate ? new Date(dueDate) : null,
        recurrenceType: recurrenceType || 'NONE',
        status: status as any
      }
    });
    return { success: true, data: task };
  } catch (error) {
    console.error('Update Task Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function deleteTask(taskId: string) {
  try {
    await prisma.task.delete({
      where: { id: taskId }
    });
    return { success: true };
  } catch (error) {
    console.error('Delete Task Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
