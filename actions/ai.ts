'use server';

import prisma from '../lib/prisma';
import axios from 'axios';

export async function getAiSuggestions() {
  try {
    const suggestions = await prisma.aiSuggestion.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: suggestions };
  } catch (error) {
    console.error('Get AI Suggestions Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function generateAiSuggestion(topic: string) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'GROQ_API_KEY is missing' };
    }

    const prompt = `You are a social media expert. Generate a highly engaging post about: "${topic}".
    Format the response EXACTLY as a JSON object with these keys:
    - title (string: short catchy title)
    - suggestedPlatform (string: e.g., LinkedIn, X, Instagram)
    - suggestedHook (string: the opening line)
    - suggestedContent (string: the main body of the post)
    - suggestedHashtags (string: 3-5 relevant hashtags)
    - potentialAudience (string: who this is for)
    - whyItMatters (string: why this topic is important)
    Ensure the response is valid JSON and nothing else.`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-8b-8192',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const aiContent = JSON.parse(response.data.choices[0].message.content);

    const suggestion = await prisma.aiSuggestion.create({
      data: {
        title: aiContent.title || topic,
        topic: topic,
        whyItMatters: aiContent.whyItMatters || '',
        suggestedPlatform: aiContent.suggestedPlatform || 'LinkedIn',
        suggestedHook: aiContent.suggestedHook || '',
        suggestedContent: aiContent.suggestedContent || '',
        suggestedHashtags: aiContent.suggestedHashtags || '',
        potentialAudience: aiContent.potentialAudience || '',
        status: 'NEW'
      }
    });

    return { success: true, data: suggestion };
  } catch (error: any) {
    console.error('Generate AI Error:', error.response?.data || error.message);
    return { success: false, error: 'Failed to generate AI suggestion' };
  }
}

export async function useAiSuggestion(id: string) {
  try {
    const suggestion = await prisma.aiSuggestion.findUnique({ where: { id } });
    
    if (!suggestion) {
      return { success: false, error: 'Suggestion not found' };
    }

    const contentText = `${suggestion.suggestedHook}\n\n${suggestion.suggestedContent}\n\n${suggestion.suggestedHashtags}`;
    
    await prisma.content.create({
      data: {
        title: suggestion.title,
        content: contentText,
        status: 'DRAFT',
      }
    });

    await prisma.aiSuggestion.update({
      where: { id },
      data: { status: 'USED' }
    });

    return { success: true };
  } catch (error) {
    console.error('Use AI Suggestion Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
