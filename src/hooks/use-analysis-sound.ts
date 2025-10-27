
"use client";

import { useRef, useCallback } from 'react';
import { useToast } from './use-toast';

export function useAnalysisSound() {
  const { toast } = useToast();

  const playSound = useCallback(async () => {
    // This is a mock function since the API route was removed.
    console.log("playSound called (mock)");
    toast({
        title: "Analysis Started",
        description: "Sound effect would play here.",
    })
  }, [toast]);
  
  const stopSound = useCallback(() => {
    // This is a mock function.
    console.log("stopSound called (mock)");
  }, []);

  return { playSound, stopSound };
}
