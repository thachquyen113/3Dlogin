import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('MISSING_GEMINI_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  app.post('/api/scholar-chat', async (req, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const { message, history, theme, userName } = body;

      const trimmedQuestion = typeof message === 'string' ? message.trim() : '';
      if (!trimmedQuestion) {
        res.status(400).json({ error: 'Please enter a question for the scholar.' });
        return;
      }

      const ai = getGenAIClient();

      const skyDescription =
        theme === 'dark'
          ? 'Outside the panoramic conservatory window, it is a serene starry night with a glowing cratered moon, star-shine flares, and occasional comets.'
          : 'Outside the panoramic conservatory window, sunlit clouds drift across a golden-hour sky while birds glide above the garden.';

      const visitor =
        typeof userName === 'string' && userName.trim() ? userName.trim() : 'friend';

      const systemInstruction = [
        'You are Professor Arthur Linnea, a warm, wise, gentle elderly botanist and natural philosopher sitting on a tufted sage-green sofa inside your walnut-paneled library study at Sylva Sanctuary.',
        `You are speaking with ${visitor}.`,
        'On your lap rests an illustrated 1753 folio of Flora Borealis, and curled up fast asleep on the sofa cushion right beside you is your marmalade-orange tabby cat named Barnaby.',
        'Around the room stand three walnut bookshelves filled with botanical, astronomical, and philosophical volumes, brass terrestrial globes, a warm brass floor reading lamp, and your walnut computer workstation.',
        skyDescription,
        'Respond in first person with calm warmth, gentle wit, and vivid sensory detail. Keep answers concise (2 to 4 sentences) so the conversation feels natural and intimate.',
      ].join(' ');

      const recentTurns = Array.isArray(history) ? history.slice(-8) : [];
      const contents = [
        ...recentTurns.map((entry) => ({
          role: entry && entry.role === 'scholar' ? 'model' : 'user',
          parts: [{ text: String((entry && entry.text) || '') }],
        })),
        {
          role: 'user',
          parts: [{ text: trimmedQuestion }],
        },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
        },
      });

      const replyText = response.text?.trim();
      if (!replyText) {
        res.status(502).json({
          error: 'The scholar paused in thought without a reply. Please ask again.',
        });
        return;
      }

      res.json({ reply: replyText });
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : String(err);

      if (
        rawMessage.includes('MISSING_GEMINI_API_KEY') ||
        rawMessage.includes('API_KEY_INVALID') ||
        rawMessage.includes('PERMISSION_DENIED') ||
        rawMessage.includes('403')
      ) {
        res.status(403).json({
          error:
            'Please verify or select a valid GEMINI_API_KEY in the Settings > Secrets panel to converse with Professor Linnea.',
        });
        return;
      }

      if (rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429')) {
        res.status(429).json({
          error:
            'Conversation quota reached. You can select a billing-enabled API key in Settings > Secrets for higher limits.',
        });
        return;
      }

      console.error('Scholar chat error:', err);
      res.status(500).json({
        error: 'Unable to reach Professor Linnea right now. Please try asking again in a moment.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sylva Sanctuary server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
