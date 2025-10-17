'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, FileText } from 'lucide-react';
import { getDOCXExportService } from '@/services/docx-export-service';
import { type DatasetProfile } from '@/services/analysis-service';

interface ExportButtonProps {
  datasetName: string;
  profile: DatasetProfile;
  insights: {
    columnInsights: any[];
    deepInsights: any;
  };
  rawData?: Record<string, any>[];
  className?: string;
  exportType?: 'text-only' | 'text-with-tables';
}

export function ExportButton({ 
  datasetName, 
  profile, 
  insights, 
  rawData,
  className,
  exportType = 'text-with-tables'
}: ExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') {
      toast({
        title: "Export Failed",
        description: "DOCX export is only available in the browser.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    setProgress(0);
    
    try {
      const analysisDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      setProgress(20);

      // Generate DOCX
      const docxService = getDOCXExportService();
      const docxBuffer = await docxService.generateReport({
        datasetName,
        analysisDate,
        profile,
        insights,
        rawData,
        exportType
      }).catch((error) => {
        console.error('DOCX generation failed:', error);
        throw new Error(`Failed to generate DOCX report: ${error.message || 'Unknown error'}`);
      });

      setProgress(80);

      // Create download link
      const blob = new Blob([docxBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${datasetName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_analysis_report.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(100);

      toast({
        title: "Export Successful",
        description: `Analysis report has been downloaded as DOCX (${exportType})`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate DOCX report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      className={className}
      variant="outline"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {progress > 0 ? `Generating DOCX... ${progress}%` : 'Generating DOCX...'}
        </>
      ) : (
        <>
          <FileText className="h-4 w-4 mr-2" />
          Export DOCX Report
        </>
      )}
    </Button>
  );
}
