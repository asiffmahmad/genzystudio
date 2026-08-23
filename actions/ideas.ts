'use server';

import prisma from '../lib/prisma';

export async function getIdeas() {
  try {
    const ideas = await prisma.idea.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    return { success: true, data: ideas };
  } catch (error) {
    console.error('Get Ideas Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function createIdea(data: { title: string; description?: string; tags?: string; sourceUrl?: string; notes?: string }) {
  try {
    const { title, description, tags, sourceUrl, notes } = data;
    
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

    return { success: true, data: idea };
  } catch (error) {
    console.error('Create Idea Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function convertIdeaToContent(ideaId: string) {
  try {
    const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
    
    if (!idea) {
      return { success: false, error: 'Idea not found' };
    }

    const contentText = `${idea.description || ''}\n\n${idea.notes || ''}\n\nSource: ${idea.sourceUrl || ''}`;
    
    const newContent = await prisma.content.create({
      data: {
        title: idea.title,
        content: contentText,
        tags: idea.tags,
        status: 'DRAFT',
      }
    });

    await prisma.idea.update({
      where: { id: ideaId },
      data: { status: 'USED' }
    });

    return { success: true, data: newContent };
  } catch (error) {
    console.error('Convert Idea Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function updateIdea(ideaId: string, data: { title: string; description?: string; tags?: string; sourceUrl?: string; notes?: string; status?: string }) {
  try {
    const { title, description, tags, sourceUrl, notes, status } = data;
    const idea = await prisma.idea.update({
      where: { id: ideaId },
      data: {
        title: title || 'Untitled Idea',
        description,
        tags,
        sourceUrl,
        notes,
        status: status as any
      }
    });
    return { success: true, data: idea };
  } catch (error) {
    console.error('Update Idea Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function deleteIdea(ideaId: string) {
  try {
    await prisma.idea.delete({
      where: { id: ideaId }
    });
    return { success: true };
  } catch (error) {
    console.error('Delete Idea Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
