/**
 * Chart to Image Conversion Utilities
 * Convert HTML canvas elements to base64 images for PDF export
 */

import html2canvas from 'html2canvas';

export interface ChartImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'png' | 'jpeg';
}

export class ChartImageConverter {
  /**
   * Convert a canvas element to base64 image
   */
  static canvasToBase64(
    canvas: HTMLCanvasElement, 
    options: ChartImageOptions = {}
  ): string {
    const {
      width = canvas.width,
      height = canvas.height,
      quality = 0.8,
      format = 'png'
    } = options;

    // Create a new canvas with desired dimensions
    const newCanvas = document.createElement('canvas');
    newCanvas.width = width;
    newCanvas.height = height;
    
    const ctx = newCanvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Draw the original canvas onto the new one with scaling
    ctx.drawImage(canvas, 0, 0, width, height);
    
    return newCanvas.toDataURL(`image/${format}`, quality);
  }

  /**
   * Convert a chart container element to base64 image
   */
  static elementToBase64(
    element: HTMLElement,
    options: ChartImageOptions = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const {
        width = element.offsetWidth,
        height = element.offsetHeight,
        quality = 0.8,
        format = 'png'
      } = options;

      // Use html2canvas for better conversion
      html2canvas(element, {
        width,
        height,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      }).then((canvas: HTMLCanvasElement) => {
        const base64 = canvas.toDataURL(`image/${format}`, quality);
        resolve(base64);
      }).catch((error) => {
        // Fallback: try to find canvas elements within the element
        const canvas = element.querySelector('canvas');
        if (canvas) {
          try {
            const base64 = this.canvasToBase64(canvas as HTMLCanvasElement, options);
            resolve(base64);
          } catch (fallbackError) {
            reject(fallbackError);
          }
        } else {
          reject(new Error('No canvas element found and html2canvas failed'));
        }
      });
    });
  }

  /**
   * Create a placeholder image for charts that can't be converted
   */
  static createPlaceholderImage(
    title: string,
    options: ChartImageOptions = {}
  ): string {
    const {
      width = 400,
      height = 300
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    // Title
    ctx.fillStyle = '#6c757d';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, width / 2, height / 2 - 20);

    // Subtitle
    ctx.font = '12px Arial';
    ctx.fillText('Chart visualization not available in PDF', width / 2, height / 2 + 10);

    return canvas.toDataURL('image/png');
  }
}

/**
 * Chart data structure for PDF export
 */
export interface ChartData {
  title: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'histogram';
  data: any;
  element?: HTMLElement;
  imageData?: string;
}

/**
 * Process charts for PDF export
 */
export async function processChartsForPDF(
  charts: ChartData[],
  options: ChartImageOptions = {}
): Promise<ChartData[]> {
  const processedCharts: ChartData[] = [];

  for (const chart of charts) {
    try {
      if (chart.element) {
        const imageData = await ChartImageConverter.elementToBase64(chart.element, options);
        processedCharts.push({
          ...chart,
          imageData
        });
      } else {
        // Create placeholder
        const imageData = ChartImageConverter.createPlaceholderImage(chart.title, options);
        processedCharts.push({
          ...chart,
          imageData
        });
      }
    } catch (error) {
      console.warn(`Failed to process chart "${chart.title}":`, error);
      // Add placeholder
      const imageData = ChartImageConverter.createPlaceholderImage(chart.title, options);
      processedCharts.push({
        ...chart,
        imageData
      });
    }
  }

  return processedCharts;
}
