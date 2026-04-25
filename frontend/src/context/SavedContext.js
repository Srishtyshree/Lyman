import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

const SavedContext = createContext();

export const SavedProvider = ({ children }) => {
  const [savedArticles, setSavedArticles] = useState([]);
  const [userId, setUserId] = useState(null);
  // Track whether Supabase table exists (to avoid repeated failed calls)
  const [supabaseAvailable, setSupabaseAvailable] = useState(true);

  // Listen for auth state and load saved articles
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadSavedArticles(session.user.id);
      } else {
        setUserId(null);
        setSavedArticles([]);
      }
    });

    // Load for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadSavedArticles(session.user.id);
      }
    });

    return () => authListener?.subscription?.unsubscribe();
  }, []);

  const loadSavedArticles = async (uid) => {
    if (!supabaseAvailable) return;
    try {
      const { data, error } = await supabase
        .from('saved_articles')
        .select('*')
        .eq('user_id', uid)
        .order('saved_at', { ascending: false });

      if (error) {
        // Table might not exist yet — that's OK, just use local state
        console.warn('Supabase load error (table may not exist yet):', error.message);
        setSupabaseAvailable(false);
        return;
      }

      if (data) {
        const articles = data.map(row => ({
          id: row.article_id,
          headline: row.headline,
          image: row.image,
          content: row.content || [],
          originalHeadline: row.original_headline,
          originalContent: row.original_content,
          source: row.source,
          url: row.url,
          publishedAt: row.saved_at || new Date().toISOString(),
        }));
        setSavedArticles(articles);
      }
    } catch (err) {
      console.warn('Could not load saved articles:', err.message);
      setSupabaseAvailable(false);
    }
  };

  const toggleSave = useCallback(async (article) => {
    const alreadySaved = savedArticles.some(a => a.id === article.id);

    if (alreadySaved) {
      // ✅ Update local state immediately — always works even without Supabase
      setSavedArticles(prev => prev.filter(a => a.id !== article.id));

      // Try to sync to Supabase in background — DO NOT revert on failure
      if (userId && supabaseAvailable) {
        supabase
          .from('saved_articles')
          .delete()
          .eq('user_id', userId)
          .eq('article_id', article.id)
          .then(({ error }) => {
            if (error) {
              console.warn('Supabase delete failed (not reverting):', error.message);
              if (error.code === '42P01') setSupabaseAvailable(false); // table doesn't exist
            }
          });
      }
    } else {
      // ✅ Update local state immediately — always works even without Supabase
      setSavedArticles(prev => [article, ...prev]);

      // Try to sync to Supabase in background — DO NOT revert on failure
      if (userId && supabaseAvailable) {
        supabase
          .from('saved_articles')
          .upsert({
            user_id: userId,
            article_id: article.id,
            headline: article.headline,
            image: article.image,
            content: article.content,
            original_headline: article.originalHeadline,
            original_content: article.originalContent,
            source: article.source || '',
            url: article.url || '',
          }, { onConflict: 'user_id,article_id' })
          .then(({ error }) => {
            if (error) {
              console.warn('Supabase upsert failed (not reverting):', error.message);
              if (error.code === '42P01') setSupabaseAvailable(false); // table doesn't exist
            }
          });
      }
    }
  }, [savedArticles, userId, supabaseAvailable]);

  const isArticleSaved = useCallback((articleId) => {
    return savedArticles.some(a => a.id === articleId);
  }, [savedArticles]);

  return (
    <SavedContext.Provider value={{ savedArticles, toggleSave, isArticleSaved }}>
      {children}
    </SavedContext.Provider>
  );
};

export const useSaved = () => {
  const context = useContext(SavedContext);
  if (!context) {
    throw new Error('useSaved must be used within a SavedProvider');
  }
  return context;
};
