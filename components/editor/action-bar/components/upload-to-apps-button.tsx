"use client";

import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/editor-store";
import { Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface UploadToAppsButtonProps {
  disabled?: boolean;
}

export function UploadToAppsButton({ disabled }: UploadToAppsButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { themeState } = useEditorStore();

  const handleUpload = async () => {
    try {
      setIsUploading(true);
      
      const lightColors = themeState.styles.light;
      const darkColors = themeState.styles.dark;
      
      if (!lightColors || typeof lightColors !== 'object') {
        throw new Error('Brak prawidłowych kolorów jasnych do przesłania');
      }
      
      if (!darkColors || typeof darkColors !== 'object') {
        throw new Error('Brak prawidłowych kolorów ciemnych do przesłania');
      }
      
      console.log('[UPLOAD-TO-APPS] Eksportowanie do wszystkich aplikacji:');
      console.log(`[UPLOAD-TO-APPS] ${Object.keys(lightColors).length} light + ${Object.keys(darkColors).length} dark colors`);
      
      const exportData = {
        timestamp: new Date().toISOString(),
        preset: themeState.preset,
        version: '1.0.0',
        colors: {
          light: lightColors,
          dark: darkColors
        },
        targets: ['all']
      };
      
      const response = await fetch('/api/theme/color-export-unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to upload theme: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log('[UPLOAD-TO-APPS] Export results:', result.results);
      
      if (result.success) {
        toast({
          title: "Motyw przesłany do wszystkich aplikacji",
          description: `Sukces dla: ${result.targets.join(', ')}. Wszystkie aplikacje używają nowego motywu.`,
        });
      } else {
        const successTargets = Object.entries(result.results)
          .filter(([, success]) => success)
          .map(([target]) => target);
        
        const failedTargets = Object.entries(result.results)
          .filter(([, success]) => !success)
          .map(([target]) => target);
        
        toast({
          title: "Częściowy sukces eksportu",
          description: `Sukces: ${successTargets.join(', ')}. Błędy: ${failedTargets.join(', ')}.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error('[UPLOAD-TO-APPS] Export error:', error);
      toast({
        title: "Błąd przy przesyłaniu motywu",
        description: error instanceof Error ? error.message : "Nieznany błąd",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Button
      onClick={handleUpload}
      disabled={disabled || isUploading}
      size="sm"
      className="gap-2"
    >
      <Upload className="h-4 w-4" />
      {isUploading ? "Eksportowanie..." : "Export to all apps"}
    </Button>
  );
}
