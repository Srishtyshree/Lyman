require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');

// ─── Helper: HTTPS GET as a Promise ──────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          reject(new Error('Invalid JSON response from NewsData'));
        }
      });
    }).on('error', reject);
  });
}

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Layman backend is running.', port: PORT });
});

// ─── Fetch News via NewsData.io ───────────────────────────────────────────────
app.get('/api/news', async (req, res) => {
  try {
    const { count = 10 } = req.query;
    const apiKey = process.env.NEWSDATA_API_KEY;

    if (!apiKey || apiKey === 'your_newsdata_api_key_here') {
      console.log('No NewsData key — returning fallback articles');
      return res.json({ articles: getFallbackArticles() });
    }

    // Free plan max size is 10 per request.
    // Make 3 parallel requests across different categories to get a larger pool.
    const categoryGroups = [
      'technology,science',
      'business',
      'entertainment,health',
    ];

    const requests = categoryGroups.map(cats =>
      httpsGet(`https://newsdata.io/api/1/latest?apikey=${apiKey}&category=${cats}&language=en&size=10`)
        .catch(err => { console.warn('NewsData request failed:', err.message); return null; })
    );

    const responses = await Promise.all(requests);

    // Merge all results, deduplicating by article_id
    const seen = new Set();
    const allResults = [];
    for (const r of responses) {
      if (!r || r.data?.status !== 'success' || !r.data?.results) continue;
      for (const item of r.data.results) {
        if (!seen.has(item.article_id)) {
          seen.add(item.article_id);
          allResults.push(item);
        }
      }
    }

    console.log(`NewsData merged pool: ${allResults.length} articles`);

    if (allResults.length === 0) {
      console.warn('No articles from NewsData — returning fallback');
      return res.json({ articles: getFallbackArticles() });
    }

    // IMPORTANT: On the free plan, `content` is always "ONLY AVAILABLE IN PAID PLANS".
    // We ONLY use `description` as real text. Filter out articles without a good description.
    const PLACEHOLDER_PATTERNS = [
      /get latest articles/i,
      /only available in paid/i,
      /read more at/i,
      /click here to read/i,
      /^\(MENAFN\)/i,
      /lottery result/i,
      /ssc result/i,
      /live draw/i,
      /prize winners/i,
    ];
    // Deduplicate by normalized headline (catches same story from multiple sources)
    const seenTitles = new Set();
    const quality = allResults.filter(item => {
      if (!item.title || !item.description) return false;
      const desc = item.description.trim();
      if (desc.length < 100) return false;
      // Skip non-Latin script content (Telugu, Arabic, Devanagari, Chinese, etc.)
      if (/[\u0900-\u097F\u0600-\u06FF\u0C00-\u0C7F\u4E00-\u9FFF\u3040-\u309F]/.test(desc)) return false;
      if (PLACEHOLDER_PATTERNS.some(p => p.test(desc) || p.test(item.title))) return false;
      // Near-duplicate detection by normalized title prefix
      const titleKey = item.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').slice(0, 50);
      if (seenTitles.has(titleKey)) return false;
      seenTitles.add(titleKey);
      return true;
    });

    console.log(`Quality articles after filter: ${quality.length} / ${allResults.length}`);

    const want = Math.max(parseInt(count), 6);
    const articles = quality
      .slice(0, want)
      .map((item, index) => ({
        id: item.article_id || `news-${Date.now()}-${index}`,
        headline: truncateHeadline(item.title),
        image: item.image_url || `https://picsum.photos/seed/${encodeURIComponent((item.title || '').slice(0, 12))}/400/300`,
        content: splitIntoCards(item.description),
        originalHeadline: item.title,
        originalContent: item.description,
        source: item.source_id || (item.creator && item.creator[0]) || 'News',
        url: item.link || '',
        publishedAt: item.pubDate ? item.pubDate.replace(' ', 'T') + 'Z' : new Date().toISOString(),
      }));

    console.log(`Returning ${articles.length} real articles`);

    // Pad with fallbacks if we don't have enough quality articles
    const merged = articles.length >= 4
      ? articles
      : [...articles, ...getFallbackArticles().slice(0, want - articles.length)];

    res.json({ articles: merged });
  } catch (error) {
    console.error('News fetch error:', error.message);

    res.json({ articles: getFallbackArticles() });
  }
});

// ─── AI Chat Endpoint ─────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message, articleContext } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set in backend/.env' });
    }

    // Try gemini-2.5-flash first, fall back to gemini-2.0-flash
    let text = '';
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    
    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const prompt = `You are Layman, a friendly AI assistant for a news app. Explain news simply.

Article context: "${articleContext || 'General tech and business news'}"

User question: "${message}"

Rules:
- EXACTLY 1 or 2 short sentences
- Use everyday language, no jargon
- Be like a friend explaining something
- Do NOT say "Layman:" or any prefix`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        text = response.text().trim();
        console.log(`Gemini model used: ${modelName}`);
        break; // success, stop trying
      } catch (modelErr) {
        console.warn(`Model ${modelName} failed:`, modelErr.message?.slice(0, 100));
        if (modelName === modelsToTry[modelsToTry.length - 1]) throw modelErr;
        // else try next model
      }
    }

    res.json({ response: text });
  } catch (error) {
    console.error('AI chat error:', error.message);
    // Return a helpful message instead of crashing
    res.status(500).json({ 
      error: `AI error: ${error.message?.slice(0, 150)}. Check your GEMINI_API_KEY in backend/.env`
    });
  }
});

// ─── Generate Contextual Suggestions ─────────────────────────────────────────
app.post('/api/suggestions', async (req, res) => {
  try {
    const { articleContext, headline } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.json({ suggestions: getGenericSuggestions(headline) });
    }

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    let suggestions = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const prompt = `Generate 3 short questions a curious person would ask about this news article.

Headline: "${headline}"
Content: "${articleContext?.slice(0, 400)}"

Rules:
- Each question under 8 words
- Conversational and natural
- Directly about THIS article
- Return ONLY a JSON array like: ["Q1?", "Q2?", "Q3?"]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        const match = text.match(/\[.*?\]/s);
        if (match) {
          suggestions = JSON.parse(match[0]).slice(0, 3);
          if (suggestions.length === 3) break;
        }
      } catch (modelErr) {
        console.warn(`Suggestions model ${modelName} failed:`, modelErr.message?.slice(0, 80));
      }
    }

    res.json({ suggestions: suggestions || getGenericSuggestions(headline) });
  } catch (error) {
    console.error('Suggestions error:', error.message);
    res.json({ suggestions: getGenericSuggestions(headline) });
  }
});

// ─── Translate Article ───────────────────────────────────────────────────────
app.post('/api/translate', async (req, res) => {
  try {
    const { headline, content } = req.body;
    
    if (!headline && (!content || !content.length)) {
      return res.status(400).json({ error: 'Missing headline or content to translate' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(401).json({ error: 'Gemini API key is missing' });
    }

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    let resultJSON = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const prompt = `Translate the following news article headline and content into Hindi.
Maintain the exact structure: an object with a "headline" string and a "content" array of strings.
Do not add any markdown formatting, just pure JSON.

Input Headline: "${headline || ''}"
Input Content Array: ${JSON.stringify(content || [])}

Expected JSON format:
{
  "headline": "...",
  "content": ["...", "...", "..."]
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();
        
        // Clean up markdown block if Gemini adds it
        if (text.startsWith('\`\`\`json')) {
          text = text.substring(7);
          if (text.endsWith('\`\`\`')) text = text.substring(0, text.length - 3);
        } else if (text.startsWith('\`\`\`')) {
          text = text.substring(3);
          if (text.endsWith('\`\`\`')) text = text.substring(0, text.length - 3);
        }
        text = text.trim();

        resultJSON = JSON.parse(text);
        console.log(`Gemini translation successful using: ${modelName}`);
        break; // success
      } catch (modelErr) {
        console.warn(`Translation with ${modelName} failed:`, modelErr.message?.slice(0, 100));
        if (modelName === modelsToTry[modelsToTry.length - 1]) throw modelErr;
      }
    }

    res.json(resultJSON);
  } catch (error) {
    console.error('Translation error:', error.message);
    res.status(500).json({ error: 'Failed to translate content.' });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateHeadline(title) {
  if (!title) return 'Breaking News';
  const words = title.split(' ');
  if (words.length <= 9) return title;
  return words.slice(0, 8).join(' ') + '...';
}

function splitIntoCards(text) {
  // FIX: Always return 3 non-empty strings
  if (!text || text.trim().length < 10) {
    return [
      'This story is developing. Check the original source for the latest details.',
      'Tap the link icon above to read the full article from the original publisher.',
      'Stay tuned — more details will emerge as this story continues to develop.'
    ];
  }

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  // If only 1-2 sentences, pad with helpful context
  if (sentences.length === 1) {
    return [
      sentences[0].trim(),
      'Tap the link icon at the top to read the full original article.',
      'Use "Ask Layman" below to ask any questions about this story!'
    ];
  }
  
  if (sentences.length === 2) {
    return [
      sentences[0].trim(),
      sentences[1].trim(),
      'Tap the link icon to read the full story, or ask Layman any questions!'
    ];
  }

  // 3+ sentences — split evenly into 3 cards
  const chunkSize = Math.ceil(sentences.length / 3);
  const cards = [];
  for (let i = 0; i < 3; i++) {
    const chunk = sentences
      .slice(i * chunkSize, (i + 1) * chunkSize)
      .join(' ')
      .trim();
    // Never return an empty card
    cards.push(chunk || sentences[sentences.length - 1].trim());
  }
  return cards;
}

function getGenericSuggestions(headline) {
  const words = headline ? headline.split(' ') : [];
  const topic = words.slice(0, 3).join(' ') || 'this topic';
  return [
    `Why does ${topic} matter?`,
    'Who is behind this story?',
    'What will happen next?',
  ];
}

function getFallbackArticles() {
  return [
    {
      id: 'fallback-1',
      headline: 'Inside Y Combinator: Where Big Tech Gets Its Start',
      image: 'https://picsum.photos/seed/yc/400/300',
      content: [
        "Y Combinator recently raised $6 billion, is now raising another $4.3 billion, and plans to compete with OpenAI and Google by training AI that anyone can use.",
        "The prestigious startup accelerator has funded companies like Airbnb, Reddit, and Stripe — cementing its place as the cradle of Silicon Valley innovation.",
        "As it expands its scope, the focus is increasingly shifting toward deeply technical foundation models and AI infrastructure that powers the next generation."
      ],
      originalHeadline: "Y Combinator Advances Open-Source Foundation Models to Challenge AI Incumbents",
      originalContent: "Y Combinator has raised $6 billion and is seeking another $4.3 billion to accelerate large-scale foundation model development, aiming to challenge incumbents like OpenAI and Google through open-source AI infrastructure.",
      source: 'TechCrunch',
      url: 'https://techcrunch.com',
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'fallback-2',
      headline: 'This AI startup just raised $40M to build faster chips for ChatGPT',
      image: 'https://picsum.photos/seed/chips/400/300',
      content: [
        "A new hardware startup has secured $40 million in Series A funding to design highly efficient silicon specifically for large language models like ChatGPT.",
        "Their chips promise to reduce the power consumption of AI data centers by up to 60%, addressing one of the industry's biggest and most expensive bottlenecks.",
        "With major cloud providers already testing prototypes, they aim to start mass production by late next year — potentially reshaping the AI hardware market."
      ],
      originalHeadline: "Silicon startup secures $40 million to develop next-gen AI processing units",
      originalContent: "A specialized hardware firm has closed a $40 million funding round to develop chips optimized for transformer architectures.",
      source: 'The Verge',
      url: 'https://theverge.com',
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'fallback-3',
      headline: 'Joby Aviation Partners With Delta and Uber to Create Air Taxis',
      image: 'https://picsum.photos/seed/aviation/400/300',
      content: [
        "Joby Aviation announced a massive partnership to bring electric air taxis to major city airports — connecting passengers from neighborhoods directly to terminals.",
        "Passengers will book a seamless trip using the existing Uber app, making flying as easy as ordering a regular ride from your couch.",
        "This marks a key milestone in commercializing eVTOL (electric vertical takeoff) technology — potentially changing how millions of city dwellers travel."
      ],
      originalHeadline: "Joby Aviation, Delta, and Uber Form Strategic Alliance for Urban Air Mobility",
      originalContent: "Joby Aviation is collaborating with major transportation partners to integrate vertical takeoff services into existing infrastructure.",
      source: 'Bloomberg',
      url: 'https://bloomberg.com',
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'fallback-4',
      headline: 'Former OpenAI CTO Launches Thinking Machines Lab',
      image: 'https://picsum.photos/seed/openai/400/300',
      content: [
        "The former Chief Technology Officer of OpenAI has unveiled a new research lab called 'Thinking Machines Lab', focused entirely on artificial general intelligence.",
        "The new venture is backed by major tech investors and aims to build safer, more reliable AI — learning from the lessons of previous frontier AI companies.",
        "The team is already recruiting top talent from Google DeepMind and Anthropic, signaling serious ambitions in the race toward AGI."
      ],
      originalHeadline: "Ex-OpenAI CTO Unveils New Research Venture 'Thinking Machines Lab'",
      originalContent: "After departing OpenAI, the technical leader has founded a new entity dedicated to AGI safety and alignment.",
      source: 'Wired',
      url: 'https://wired.com',
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'fallback-5',
      headline: "Apple's First Foldable iPhone Is Rumored to Come Out in 2026",
      image: 'https://picsum.photos/seed/apple/400/300',
      content: [
        "Supply chain insiders suggest Apple is finalizing the design for its first foldable device — likely a flip-style iPhone that opens and closes like a clam shell.",
        "Apple reportedly solved the screen creasing problem that plagued Samsung and Motorola by using a new custom polymer blend developed in-house.",
        "Analysts predict a 2026 launch with a premium price tag, positioning it as the most exclusive iPhone ever made."
      ],
      originalHeadline: "Apple Supply Chain Prepares for Foldable Device Launch in Fiscal 2026",
      originalContent: "New reports from Asian manufacturing partners indicate that Apple is placing orders for specialized flexible displays.",
      source: 'MacRumors',
      url: 'https://macrumors.com',
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'fallback-6',
      headline: 'DoorDash Is Buying Deliveroo for About $3.9 Billion',
      image: 'https://picsum.photos/seed/doordash/400/300',
      content: [
        "DoorDash announced it will buy UK-based food delivery company Deliveroo for about $3.9 billion — its largest acquisition ever and a bold move into Europe.",
        "The deal gives DoorDash a foothold in 10 European countries where Deliveroo operates, directly challenging Uber Eats on its home turf.",
        "Analysts see this as a strategic bet on global delivery dominance, though regulators in the UK and Europe will likely scrutinize the deal closely."
      ],
      originalHeadline: "DoorDash Announces Acquisition of Deliveroo for $3.9 Billion",
      originalContent: "The American food delivery giant is expanding aggressively into Europe with its biggest-ever acquisition.",
      source: 'Financial Times',
      url: 'https://ft.com',
      publishedAt: new Date().toISOString(),
    },
  ];
}

app.listen(PORT, () => {
  console.log(`🚀 Layman backend running on port ${PORT}`);
  console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ set' : '❌ missing'}`);
  console.log(`   NEWSDATA_API_KEY: ${process.env.NEWSDATA_API_KEY ? '✅ set' : '❌ missing'}`);
});
