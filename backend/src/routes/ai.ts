import { Router } from 'express';
import Groq from 'groq-sdk';
import prisma from '../prisma';

const router = Router();

// Initialize Groq only if API key is provided
let groq: Groq | null = null;
if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-api-key') {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = await prisma.aiSuggestion.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('AI Suggestions Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.post('/generate', async (req, res) => {
  try {
    if (!groq) {
      return res.status(503).json({ success: false, error: 'Groq API is not configured. Please add GROQ_API_KEY to your .env file.' });
    }

    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ success: false, error: 'Topic is required' });
    }

    const prompt = `Generate a highly engaging social media content suggestion for the topic: "${topic}".
    Return ONLY a valid JSON object with the following fields:
    - title: A short catchy title
    - whyItMatters: A brief reason why the audience cares
    - suggestedPlatform: The best platform for this (LinkedIn, X, Instagram, Facebook)
    - suggestedHook: A scroll-stopping opening line
    - suggestedContent: The main body of the post
    - suggestedHashtags: Comma separated hashtags
    - potentialAudience: Who this targets
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192',
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from Groq');
    }

    const parsed = JSON.parse(content);

    // Persist to database
    const suggestion = await prisma.aiSuggestion.create({
      data: {
        title: parsed.title,
        topic,
        whyItMatters: parsed.whyItMatters,
        suggestedPlatform: parsed.suggestedPlatform,
        suggestedHook: parsed.suggestedHook,
        suggestedContent: parsed.suggestedContent,
        suggestedHashtags: parsed.suggestedHashtags,
        potentialAudience: parsed.potentialAudience,
        priority: 'MEDIUM',
        status: 'NEW'
      }
    });

    res.json({ success: true, data: suggestion });
  } catch (error) {
    console.error('Groq Generation Error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate content' });
  }
});

router.post('/suggestions/:id/use', async (req, res) => {
  try {
    const id = req.params.id;
    
    const suggestion = await prisma.aiSuggestion.findUnique({ where: { id } });
    if (!suggestion) {
      return res.status(404).json({ success: false, error: 'Suggestion not found' });
    }

    // Convert to content draft
    const newContent = await prisma.content.create({
      data: {
        title: suggestion.title,
        content: `${suggestion.suggestedHook}\n\n${suggestion.suggestedContent}`,
        hashtags: suggestion.suggestedHashtags,
        status: 'DRAFT',
      }
    });

    // Mark suggestion as USED
    await prisma.aiSuggestion.update({
      where: { id },
      data: { status: 'USED' }
    });

    res.json({ success: true, data: newContent });
  } catch (error) {
    console.error('Convert AI Suggestion Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
