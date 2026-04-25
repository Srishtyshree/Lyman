# Layman — AI Context File

## Project Overview
Layman is a React Native (Expo) mobile app that delivers tech/business/startup news in simple, layman's terms.

## Tech Stack
- **Frontend**: React Native + Expo (~54), React Navigation v7
- **Backend**: Node.js + Express (port 5000)
- **Auth & DB**: Supabase (email/password, saved_articles table)
- **AI**: Google Gemini 1.5 Flash via backend proxy
- **News**: NewsData.io free tier API
- **Font**: Plus Jakarta Sans (500Medium, 700Bold, 800ExtraBold)

## Color Palette
```
Primary Orange: #D97B47
Background Cream: #FAF4F0
Card White: #FDF7F3
Border Light: #EBE1DA
Border Warm: #DBC1B6
Text Dark: #2C2522
Text Medium: #55433A
Text Light: #8A7D77
Text Faint: #A09690
```

## Conventions
- Styles in separate `*.styles.js` files using `StyleSheet.create`
- Navigation: Stack navigator wraps Tab navigator; session-gated
- Context: `SavedContext` manages saved articles + Supabase sync
- Supabase: ENV vars via `EXPO_PUBLIC_` prefix for Expo
- Backend ENV: `GEMINI_API_KEY`, `NEWSDATA_API_KEY`, `PORT`
- Article shape: `{ id, headline, image, content: string[], originalHeadline, originalContent, source, publishedAt, url }`

## Key Files
- `frontend/src/screens/HomeScreen.js` — Featured carousel + Today's Picks
- `frontend/src/screens/ArticleDetailScreen.js` — Swipeable cards + Ask Layman chat
- `frontend/src/context/SavedContext.js` — Saved articles (local + Supabase)
- `backend/server.js` — Gemini AI proxy + NewsData.io proxy
- `frontend/src/utils/supabase.js` — Supabase client

## Database Schema (Supabase)
```sql
-- saved_articles table
create table saved_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  article_id text not null,
  headline text not null,
  image text,
  content text[],
  original_headline text,
  original_content text,
  source text,
  url text,
  saved_at timestamptz default now(),
  unique(user_id, article_id)
);

-- RLS
alter table saved_articles enable row level security;
create policy "Users can manage own saved articles"
  on saved_articles for all
  using (auth.uid() = user_id);
```

## Backend API Endpoints
- `GET  /api/health` — Health check
- `GET  /api/news?category=technology&count=10` — Fetch news via NewsData.io
- `POST /api/chat` — Gemini AI chat { message, articleContext }
- `POST /api/suggestions` — Generate 3 context-aware questions { articleContext }

## Rules
- All AI responses: 1-2 sentences, simple everyday language
- Headlines: conversational/casual, 48-52 chars (7-9 words)
- Content cards: exactly 3 per article, swipeable horizontally
- Never hardcode API keys — always use .env files
