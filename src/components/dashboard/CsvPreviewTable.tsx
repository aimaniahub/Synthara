'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Download, FileText, Database } from 'lucide-react';
import { downloadCSV, generateCSVFilename, getCSVStats, formatCSVForDisplay } from '@/lib/csv-utils';

interface CsvPreviewTableProps {
  csvContent: string;
  data: Array<Record<string, any>>;
  schema: Array<{ name: string; type: string; description: string }>;
  query: string;
  metadata?: {
    originalSources: number;
    refinedSources: number;
    dataRows: number;
    tablesFound: number;
    processingTime: number;
  };
  className?: string;
}

export function CsvPreviewTable({
  csvContent,
  data,
  schema,
  query,
  metadata,
  className = ''
}: CsvPreviewTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // Calculate pagination
  const totalRows = data.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
  const currentPageData = data.slice(startIndex, endIndex);

  // Get CSV statistics
  const stats = useMemo(() => getCSVStats(csvContent), [csvContent]);

  // Handle CSV download
  const handleDownload = () => {
    try {
      const filename = generateCSVFilename(query);
      downloadCSV(csvContent, filename);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  // Handle pagination
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  if (!csvContent || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            CSV Preview
          </CardTitle>
          <CardDescription>No data available to preview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No data generated yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              CSV Preview
            </CardTitle>
            <CardDescription>
              Showing {startIndex + 1}-{endIndex} of {totalRows} rows
              {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
            </CardDescription>
          </div>
          <Button onClick={handleDownload} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary">{totalRows}</div>
            <div className="text-sm text-muted-foreground">Total Rows</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary">{schema.length}</div>
            <div className="text-sm text-muted-foreground">Columns</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {Math.round(stats.fileSize / 1024)}KB
            </div>
            <div className="text-sm text-muted-foreground">File Size</div>
          </div>
          {metadata && (
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {Math.round(metadata.processingTime / 1000)}s
              </div>
              <div className="text-sm text-muted-foreground">Processing Time</div>
            </div>
          )}
        </div>

        {/* Schema Information */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Data Schema</h4>
          <div className="flex flex-wrap gap-2">
            {schema.map((column, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                <span className="font-medium">{column.name}</span>
                <span className="text-muted-foreground ml-1">({column.type})</span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {schema.map((column, index) => (
                    <TableHead key={index} className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium">{column.name}</span>
                        <span className="text-xs text-muted-foreground font-normal">
                          {column.type}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPageData.map((row, rowIndex) => (
                  <TableRow key={startIndex + rowIndex}>
                    {schema.map((column, colIndex) => (
                      <TableCell key={colIndex} className="max-w-xs">
                        <div className="truncate" title={String(row[column.name] || '')}>
                          {String(row[column.name] || '')}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Additional Metadata */}
        {metadata && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Sources processed: {metadata.originalSources} → {metadata.refinedSources} relevant</p>
            {metadata.tablesFound > 0 && (
              <p>Tables found: {metadata.tablesFound}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
