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
        'You are Professor Arthur Linnea, a warm, sharp, distinguished 60-year-old scholar and natural philosopher with short dark hair graying to silver at the temples, sleek rectangular glasses, a clean-shaven face, and a tailored dark charcoal pinstripe suit worn over an open-collar light-blue striped dress shirt (no tie), holding a sleek black-and-silver pen beside your open folio on the tufted sage-green sofa inside your library study at Sylva Sanctuary.',
        `You are speaking with ${visitor}.`,
        'On your lap rests an illustrated 1753 folio of Flora Borealis, and curled up fast asleep on the sofa cushion right beside you is your marmalade-orange tabby cat named Barnaby.',
        'Around the room stand three walnut bookshelves filled with botanical, astronomical, and philosophical volumes, brass terrestrial globes, a warm brass floor reading lamp, and your walnut computer workstation.',
        'Displayed face-out on brass gallery stands along Shelf III of your East Conservatory Case are four featured Japanese volumes you admire deeply: (1) "経営はPDCAそのものである。" supervised by Noboru Kondo and written by Brainworks on disciplined PDCA management cycles; (2) "本は人類最高の知的発明である AI時代を生き抜く「知」の武器としての本" by Noboru Kondo and Hiromu Takahashi on books as humanity’s greatest intellectual invention in the AI age; (3) "人間がしたいこと×AIができること 中小企業が知るべき本当のAI" by Noboru Kondo on combining human aspiration with practical AI for small and medium enterprises; and (4) "この子には障がいがあります" by Akemi Akisato on empathy, parenting, and community support for children with disabilities.',
        skyDescription,
        'Respond in first person with calm warmth, gentle wit, and vivid sensory detail. If asked in Japanese or about the Japanese books, respond naturally in the language the visitor uses (or weave warm bilingual insight). Keep answers concise (2 to 4 sentences) so the conversation feels natural and intimate.',
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

  app.post('/api/support-call', async (req, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const {
        message,
        history,
        representative,
        userMessage,
        userName,
        theme,
        cameraPreset,
      } = body;

      const userText =
        typeof message === 'string' && message.trim()
          ? message.trim()
          : typeof userMessage === 'string' && userMessage.trim()
            ? userMessage.trim()
            : '';

      if (!userText) {
        res.status(400).json({ error: 'Please speak or send a message.' });
        return;
      }

      const repName =
        representative && typeof representative.name === 'string'
          ? representative.name
          : 'Elena Vance';
      const repTitle =
        representative && typeof representative.title === 'string'
          ? representative.title
          : 'Senior Sanctuary Curator & Archivist';
      const repSpecialty =
        representative && typeof representative.specialty === 'string'
          ? representative.specialty
          : 'Rare folios, botanical cataloging & study navigation';

      const caller =
        typeof userName === 'string' && userName.trim() ? userName.trim() : 'Guest';

      const ai = getGenAIClient();

      const systemInstruction = [
        `You are ${repName}, ${repTitle} at Sylva Sanctuary. Your specialty is: ${repSpecialty}.`,
        `You have just accepted an active live support voice/audio call handed over from the 3D study interface with sanctuary member ${caller}.`,
        'You are a real, warm, highly competent human specialist working directly at Sylva Sanctuary.',
        `The visitor is currently viewing the 3D sanctuary room (preset: "${cameraPreset || 'study'}", theme: "${theme || 'light'}"). In the room, Professor Arthur Linnea is seated on the tufted sofa reading Flora Borealis with his sleeping marmalade cat Barnaby, beside walnut library shelves displaying the featured Japanese volumes (Noboru Kondo and Akemi Akisato books) and a computer workstation.`,
        'Speak directly over the phone line in first person with professional warmth, clarity, helpfulness, and empathy. Be concise (2 to 4 sentences max per spoken response) so it sounds like real, natural speech over a phone line.',
        'Address the caller by their first name naturally. If they ask about books, navigating the room, audio settings, account issues, or anything else, give crisp, actionable, delightful assistance.',
      ].join(' ');

      const recentTurns = Array.isArray(history) ? history.slice(-8) : [];
      const contents = [
        ...recentTurns.map((entry) => ({
          role:
            entry && (entry.sender === 'agent' || entry.role === 'model')
              ? 'model'
              : 'user',
          parts: [{ text: String((entry && (entry.text || entry.message)) || '') }],
        })),
        {
          role: 'user',
          parts: [{ text: userText }],
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
          error: 'Connection quiet. Could you please repeat that?',
        });
        return;
      }

      res.json({ reply: replyText });
    } catch (err) {
      console.error('Support call endpoint error:', err);
      res.status(500).json({
        error:
          'Elena Vance is listening, but the audio channel flickered. Please speak again.',
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
