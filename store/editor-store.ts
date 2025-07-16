import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ThemeEditorState } from "@/types/editor";
import { defaultThemeState } from "@/config/theme";
import { getPresetThemeStyles } from "@/utils/theme-preset-helper";
import { isDeepEqual } from "@/lib/utils";
import { langflowColorExporter } from "@/utils/theme-exporter-langflow";

const MAX_HISTORY_COUNT = 30;
const HISTORY_OVERRIDE_THRESHOLD_MS = 500; // 0.5 seconds

interface ThemeHistoryEntry {
  state: ThemeEditorState;
  timestamp: number;
}

interface EditorStore {
  themeState: ThemeEditorState;
  themeCheckpoint: ThemeEditorState | null;
  history: ThemeHistoryEntry[];
  future: ThemeHistoryEntry[];
  setThemeState: (state: ThemeEditorState) => void;
  applyThemePreset: (preset: string) => void;
  saveThemeCheckpoint: () => void;
  restoreThemeCheckpoint: () => void;
  resetToCurrentPreset: () => void;
  hasThemeChangedFromCheckpoint: () => boolean;
  hasUnsavedChanges: () => boolean;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  exportToLangflow: () => Promise<boolean>;
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      themeState: defaultThemeState,
      themeCheckpoint: null,
      history: [],
      future: [],
      setThemeState: (newState: ThemeEditorState) => {
        const oldThemeState = get().themeState;
        let currentHistory = get().history;
        let currentFuture = get().future;

        // Check if only currentMode changed
        const oldStateWithoutMode = { ...oldThemeState, currentMode: undefined };
        const newStateWithoutMode = { ...newState, currentMode: undefined };

        if (
          isDeepEqual(oldStateWithoutMode, newStateWithoutMode) &&
          oldThemeState.currentMode !== newState.currentMode
        ) {
          // Only currentMode changed
          // Just update themeState without affecting history or future
          set({ themeState: newState });
          return;
        }

        const currentTime = Date.now();

        // If other things changed, or if it's an actual identical state set (though less likely here)
        // Proceed with history logic
        const lastHistoryEntry =
          currentHistory.length > 0 ? currentHistory[currentHistory.length - 1] : null;

        if (
          !lastHistoryEntry ||
          currentTime - lastHistoryEntry.timestamp >= HISTORY_OVERRIDE_THRESHOLD_MS
        ) {
          // Add a new history entry
          currentHistory = [...currentHistory, { state: oldThemeState, timestamp: currentTime }];
          currentFuture = [];
        }

        if (currentHistory.length > MAX_HISTORY_COUNT) {
          currentHistory.shift(); // Remove the oldest entry
        }

        set({
          themeState: newState,
          history: currentHistory,
          future: currentFuture,
        });
      },
      applyThemePreset: (preset: string) => {
        const currentThemeState = get().themeState;
        const oldHistory = get().history;
        const currentTime = Date.now();

        const newStyles = getPresetThemeStyles(preset);
        const newThemeState: ThemeEditorState = {
          ...currentThemeState,
          preset,
          styles: newStyles,
          hslAdjustments: defaultThemeState.hslAdjustments,
        };

        const newHistoryEntry = { state: currentThemeState, timestamp: currentTime };
        let updatedHistory = [...oldHistory, newHistoryEntry];
        if (updatedHistory.length > MAX_HISTORY_COUNT) {
          updatedHistory.shift();
        }

        set({
          themeState: newThemeState,
          themeCheckpoint: newThemeState, // Applying a preset also updates the checkpoint
          history: updatedHistory,
          future: [],
        });
      },
      saveThemeCheckpoint: () => {
        set({ themeCheckpoint: get().themeState });
      },
      restoreThemeCheckpoint: () => {
        const checkpoint = get().themeCheckpoint;
        if (checkpoint) {
          const oldThemeState = get().themeState;
          const oldHistory = get().history;
          const currentTime = Date.now();

          const newHistoryEntry = { state: oldThemeState, timestamp: currentTime };
          let updatedHistory = [...oldHistory, newHistoryEntry];
          if (updatedHistory.length > MAX_HISTORY_COUNT) {
            updatedHistory.shift();
          }

          set({
            themeState: {
              ...checkpoint,
              currentMode: get().themeState.currentMode,
            },
            history: updatedHistory,
            future: [],
          });
        } else {
          console.warn("No theme checkpoint available to restore to.");
        }
      },
      hasThemeChangedFromCheckpoint: () => {
        const checkpoint = get().themeCheckpoint;
        return !isDeepEqual(get().themeState, checkpoint);
      },
      hasUnsavedChanges: () => {
        const themeState = get().themeState;
        const presetThemeStyles = getPresetThemeStyles(themeState.preset ?? "default");
        const stylesChanged = !isDeepEqual(themeState.styles, presetThemeStyles);
        const hslChanged = !isDeepEqual(
          themeState.hslAdjustments,
          defaultThemeState.hslAdjustments
        );
        return stylesChanged || hslChanged;
      },
      resetToCurrentPreset: () => {
        const currentThemeState = get().themeState;

        const presetThemeStyles = getPresetThemeStyles(currentThemeState.preset ?? "default");
        const newThemeState: ThemeEditorState = {
          ...currentThemeState,
          styles: presetThemeStyles,
          hslAdjustments: defaultThemeState.hslAdjustments,
        };

        set({
          themeState: newThemeState,
          themeCheckpoint: newThemeState,
          history: [],
          future: [],
        });
      },
      undo: () => {
        const history = get().history;
        if (history.length === 0) {
          return;
        }

        const currentThemeState = get().themeState;
        const future = get().future;

        const lastHistoryEntry = history[history.length - 1];
        const newHistory = history.slice(0, -1);

        const newFutureEntry = { state: currentThemeState, timestamp: Date.now() };
        const newFuture = [newFutureEntry, ...future];

        set({
          themeState: {
            ...lastHistoryEntry.state,
            currentMode: currentThemeState.currentMode,
          },
          themeCheckpoint: lastHistoryEntry.state,
          history: newHistory,
          future: newFuture,
        });
      },
      redo: () => {
        const future = get().future;
        if (future.length === 0) {
          return;
        }
        const history = get().history;

        const firstFutureEntry = future[0];
        const newFuture = future.slice(1);

        const currentThemeState = get().themeState;

        const newHistoryEntry = { state: currentThemeState, timestamp: Date.now() };
        let updatedHistory = [...history, newHistoryEntry];
        if (updatedHistory.length > MAX_HISTORY_COUNT) {
          updatedHistory.shift();
        }

        set({
          themeState: {
            ...firstFutureEntry.state,
            currentMode: currentThemeState.currentMode,
          },
          themeCheckpoint: firstFutureEntry.state,
          history: updatedHistory,
          future: newFuture,
        });
      },
      canUndo: () => get().history.length > 0,
      canRedo: () => get().future.length > 0,
      exportToLangflow: async () => {
        const themeState = get().themeState;
        try {
          const lightColors = themeState.styles.light;
          const darkColors = themeState.styles.dark;
          
          if (!lightColors || !darkColors) {
            console.error('[TWEAKCN] Brak kolorów light/dark');
            return false;
          }
          
          const exportData = {
            timestamp: new Date().toISOString(),
            preset: themeState.preset,
            version: '1.0.0',
            colors: {
              light: lightColors,
              dark: darkColors
            },
            targets: ['langflow', 'openwebui', 'litellm'] 
          };
          
          try {
            const response = await fetch('/api/theme/color-export-unified', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(exportData),
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log('[TWEAKCN] Kolory wyeksportowane do Langflow');
              console.log(`[TWEAKCN] Sync: ${Object.keys(lightColors).length} light + ${Object.keys(darkColors).length} dark colors`);
              console.log('[TWEAKCN] Export result:', result);
              return true;
            } else {
              console.warn('[TWEAKCN] Export response not OK, trying localStorage fallback');
              
              try {
                const { langflowColorExporter } = await import('@/utils/theme-exporter-langflow');
                const cssOverride = langflowColorExporter.generateLangflowCSS(lightColors, darkColors);
                
                localStorage.setItem('tweakcn-export', JSON.stringify(exportData));
                localStorage.setItem('tweakcn-css-override', cssOverride);
                localStorage.setItem('tweakcn-export-timestamp', new Date().toISOString());
                
                console.log('[TWEAKCN] Export saved to localStorage');
                return true;
              } catch (localStorageError) {
                console.error('[TWEAKCN] LocalStorage fallback failed:', localStorageError);
                return false;
              }
            }
          } catch (fetchError) {
            console.warn('[TWEAKCN] API call failed, using localStorage fallback:', fetchError);
            localStorage.setItem('tweakcn-export', JSON.stringify(exportData));
            console.log('[TWEAKCN] Kolory zapisane lokalnie (dev mode)');
            console.log(`[TWEAKCN] ${Object.keys(lightColors).length} light + ${Object.keys(darkColors).length} dark colors`);
            return true;
          }
        } catch (error) {
          console.error('[TWEAKCN] Błąd eksportu do Langflow:', error);
          return false;
        }
      },
    }),
    {
      name: "editor-storage",
    }
  )
);
