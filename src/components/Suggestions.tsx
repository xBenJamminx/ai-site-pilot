'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import type { Suggestion } from '../types';

export interface SuggestionsProps {
  suggestions: Suggestion[];
  onSelect: (text: string) => void;
  isVisible?: boolean;
  isFullscreen?: boolean;
  suggestionsToShow?: number;
  rotationInterval?: number;
}

export function Suggestions({
  suggestions,
  onSelect,
  isVisible = true,
  isFullscreen = false,
  suggestionsToShow = 3,
  rotationInterval = 5000,
}: SuggestionsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Rotate suggestions
  useEffect(() => {
    if (!isVisible || suggestions.length <= suggestionsToShow) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.ceil(suggestions.length / suggestionsToShow));
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [isVisible, suggestions.length, suggestionsToShow, rotationInterval]);

  // Get current suggestions to display
  const currentSuggestions = suggestions.slice(
    currentIndex * suggestionsToShow,
    currentIndex * suggestionsToShow + suggestionsToShow
  );

  const totalPages = Math.ceil(suggestions.length / suggestionsToShow);

  if (!isVisible || suggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="pt-2"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 pilot-text-muted">
            <Zap className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-wider font-medium">Try asking</span>
          </div>
          {/* Pagination dots */}
          {totalPages > 1 && (
            <div className="flex gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentIndex
                      ? 'pilot-dot-active w-3'
                      : 'pilot-dot-inactive w-1.5 hover:opacity-75'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className={`flex gap-2 ${isFullscreen ? 'flex-row flex-wrap' : 'flex-col'}`}
          >
            {currentSuggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion.text}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onSelect(suggestion.text)}
                className="pilot-suggestion group flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left transition-all duration-200"
              >
                {suggestion.icon && <span className="text-base">{suggestion.icon}</span>}
                <span>{suggestion.text}</span>
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
