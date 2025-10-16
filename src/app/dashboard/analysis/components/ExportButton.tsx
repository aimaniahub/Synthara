'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, FileText } from 'lucide-react';
import { pdfExportService } from '@/services/pdf-export-service';
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
}

export function ExportButton({ 
  datasetName, 
  profile, 
  insights, 
  rawData,
  className 
}: ExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const analysisDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const pdfBlob = await pdfExportService.generateReport({
        datasetName,
        analysisDate,
        profile,
        insights,
        rawData
      });

      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${datasetName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_analysis_report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Analysis report has been downloaded as PDF",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
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
          Generating PDF...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Export PDF Report
        </>
      )}
    </Button>
  );
}
