"use client";

import React, {
  createContext,
  useContext,
  useState,
  FC,
  PropsWithChildren,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { TranscriptItem } from "@/app/types";
import { useLanguage } from "./LanguageContext";
import OpenAI from "openai";

// Cache for corrected text to avoid repeated API calls
const textCorrectionCache = new Map<string, string>();
// Track ongoing correction requests to prevent duplicates
const ongoingCorrections = new Set<string>();

type TranscriptContextValue = {
  transcriptItems: TranscriptItem[];
  addTranscriptMessage: (
    itemId: string,
    role: "user" | "assistant",
    text: string,
    isHidden?: boolean,
  ) => Promise<void>;
  updateTranscriptMessage: (itemId: string, text: string, isDelta: boolean) => Promise<void>;
  addTranscriptBreadcrumb: (title: string, data?: Record<string, any>) => void;
  toggleTranscriptItemExpand: (itemId: string) => void;
  updateTranscriptItem: (itemId: string, updatedProperties: Partial<TranscriptItem>) => void;
};

const TranscriptContext = createContext<TranscriptContextValue | undefined>(undefined);

// Script detection and correction functionality
async function correctTextScript(text: string, targetLanguage: string): Promise<string> {
  console.log(`[correctTextScript] Called with language: ${targetLanguage}, text: "${text}"`);
  
  // Only process Hindi for now
  if (targetLanguage !== 'Hindi' || !text.trim()) {
    console.log(`[correctTextScript] Skipping - language: ${targetLanguage}, empty: ${!text.trim()}`);
    return text;
  }

  // Check cache first
  const cacheKey = `${targetLanguage}:${text}`;
  if (textCorrectionCache.has(cacheKey)) {
    console.log(`[correctTextScript] Cache hit for: "${text}"`);
    return textCorrectionCache.get(cacheKey)!;
  }

  // Check if correction is already in progress to prevent memory leaks
  if (ongoingCorrections.has(cacheKey)) {
    console.log(`[correctTextScript] Correction already in progress for: "${text}"`);
    return text; // Return original text while correction is in progress
  }

  // Defensive check to prevent API cost waste
  if (!text || text.length > 500) {
    console.log(`[correctTextScript] Skipping - invalid text length: ${text?.length || 0}`);
    return text;
  }

  // Detect scripts
  const devanagariRegex = /[\u0900-\u097F]/;
  const urduArabicRegex = /[\u0600-\u06FF]/;
  
  const hasDevanagari = devanagariRegex.test(text);
  const hasUrduArabic = urduArabicRegex.test(text);
  
  console.log(`[correctTextScript] Script detection - Devanagari: ${hasDevanagari}, Urdu/Arabic: ${hasUrduArabic}`);
  
  // If text already contains Devanagari, it's likely correct
  if (hasDevanagari) {
    console.log(`[correctTextScript] Text already in Devanagari, returning as-is`);
    textCorrectionCache.set(cacheKey, text);
    return text;
  }

  // If text contains Urdu/Arabic script, transliterate to Devanagari
  if (hasUrduArabic) {
    console.log(`[correctTextScript] Urdu/Arabic script detected, starting transliteration...`);
    
    // Mark as ongoing
    ongoingCorrections.add(cacheKey);
    
    try {
      const openai = new OpenAI({
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true,
      });

      const correctionResponse = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are a language expert. Your task is to transliterate the given text from Arabic/Urdu script to Devanagari script for Hindi. Do not translate the meaning - only change the script. Preserve the original pronunciation and meaning."
          },
          {
            role: "user",
            content: `Please transliterate this text to Devanagari script: "${text}"`
          }
        ],
        temperature: 0,
        max_tokens: 500,
      });

      const correctedText = correctionResponse.choices[0].message.content || text;
      console.log(`[correctTextScript] Transliteration successful: "${text}" -> "${correctedText}"`);
      textCorrectionCache.set(cacheKey, correctedText);
      return correctedText;
    } catch (err) {
      console.error('[correctTextScript] Error during text script correction:', err);
      textCorrectionCache.set(cacheKey, text); // Cache original text to prevent retry
      return text;
    } finally {
      // Remove from ongoing corrections
      ongoingCorrections.delete(cacheKey);
    }
  }

  // If no script issues detected, return original text
  console.log(`[correctTextScript] No script issues detected, returning original text`);
  textCorrectionCache.set(cacheKey, text);
  return text;
}

export const TranscriptProvider: FC<PropsWithChildren> = ({ children }) => {
  const [transcriptItems, setTranscriptItems] = useState<TranscriptItem[]>([]);
  
  // Use language context properly - hooks must be called consistently
  const { preferredLanguage } = useLanguage();

  function newTimestampPretty(): string {
    const now = new Date();
    const time = now.toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const ms = now.getMilliseconds().toString().padStart(3, "0");
    return `${time}.${ms}`;
  }

  const addTranscriptMessage: TranscriptContextValue["addTranscriptMessage"] = async (itemId, role, text = "", isHidden = false) => {
    // Apply script correction for both user and assistant messages when Hindi is selected
    let correctedText = text;
    console.log(`[DEBUG] addTranscriptMessage called: role=${role}, text="${text}", language=${preferredLanguage}, isHidden=${isHidden}`);
    
    if (text && preferredLanguage === 'Hindi') {
      console.log(`[Script Correction] Processing ${role} text for language: ${preferredLanguage}`);
      console.log(`[Script Correction] Original text: "${text}"`);
      correctedText = await correctTextScript(text, preferredLanguage);
      console.log(`[Script Correction] Corrected text: "${correctedText}"`);
    }

    setTranscriptItems((prev) => {
      if (prev.some((log) => log.itemId === itemId && log.type === "MESSAGE")) {
        console.warn(`[addTranscriptMessage] skipping; message already exists for itemId=${itemId}, role=${role}, text=${text}`);
        return prev;
      }

      const newItem: TranscriptItem = {
        itemId,
        type: "MESSAGE",
        role,
        title: correctedText,
        expanded: false,
        timestamp: newTimestampPretty(),
        createdAtMs: Date.now(),
        status: "IN_PROGRESS",
        isHidden,
      };

      return [...prev, newItem];
    });
  };

  const updateTranscriptMessage: TranscriptContextValue["updateTranscriptMessage"] = async (itemId, newText, append = false) => {
    // Apply script correction to updated text when Hindi is selected
    let correctedText = newText;
    console.log(`[DEBUG] updateTranscriptMessage called: itemId=${itemId}, newText="${newText}", language=${preferredLanguage}, append=${append}`);
    
    if (newText && preferredLanguage === 'Hindi') {
      console.log(`[Script Correction UPDATE] Processing text for language: ${preferredLanguage}`);
      console.log(`[Script Correction UPDATE] Original text: "${newText}"`);
      correctedText = await correctTextScript(newText, preferredLanguage);
      console.log(`[Script Correction UPDATE] Corrected text: "${correctedText}"`);
    }
    
    setTranscriptItems((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId && item.type === "MESSAGE") {
          return {
            ...item,
            title: append ? (item.title ?? "") + correctedText : correctedText,
          };
        }
        return item;
      })
    );
  };

  const addTranscriptBreadcrumb: TranscriptContextValue["addTranscriptBreadcrumb"] = (title, data) => {
    setTranscriptItems((prev) => [
      ...prev,
      {
        itemId: `breadcrumb-${uuidv4()}`,
        type: "BREADCRUMB",
        title,
        data,
        expanded: false,
        timestamp: newTimestampPretty(),
        createdAtMs: Date.now(),
        status: "DONE",
        isHidden: false,
      },
    ]);
  };

  const toggleTranscriptItemExpand: TranscriptContextValue["toggleTranscriptItemExpand"] = (itemId) => {
    setTranscriptItems((prev) =>
      prev.map((log) =>
        log.itemId === itemId ? { ...log, expanded: !log.expanded } : log
      )
    );
  };

  const updateTranscriptItem: TranscriptContextValue["updateTranscriptItem"] = (itemId, updatedProperties) => {
    setTranscriptItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId ? { ...item, ...updatedProperties } : item
      )
    );
  };

  return (
    <TranscriptContext.Provider
      value={{
        transcriptItems,
        addTranscriptMessage,
        updateTranscriptMessage,
        addTranscriptBreadcrumb,
        toggleTranscriptItemExpand,
        updateTranscriptItem,
      }}
    >
      {children}
    </TranscriptContext.Provider>
  );
};

export function useTranscript() {
  const context = useContext(TranscriptContext);
  if (!context) {
    throw new Error("useTranscript must be used within a TranscriptProvider");
  }
  return context;
}