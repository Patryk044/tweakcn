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
      
      const colors = themeState.styles.light;
      
      if (!colors || typeof colors !== 'object') {
        throw new Error('Brak prawidłowych kolorów do przesłania');
      }
      
       console.log('Wysyłanie kolorów do API:', Object.keys(colors).length, 'kolorów');
      
      const response = await fetch('/api/upload-theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(colors),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload theme: ${errorText}`);
      }

      toast({
        title: "Motyw został przesłany do aplikacji",
        description: "Wszystkie aplikacje teraz używają nowego motywu",
      });
    } catch (error) {
      console.error('Error uploading theme:', error);
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
      {isUploading ? "Przesyłanie..." : "Upload to apps"}
    </Button>
  );
}
