import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns: { key: string; label: string }[];
}

export const ExportButton = ({ data, filename, columns }: ExportButtonProps) => {
  const [exporting, setExporting] = useState(false);

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      if (value instanceof Date) {
        return value.toLocaleString('pt-AO');
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  const exportToCSV = () => {
    setExporting(true);
    try {
      // Create CSV header
      const header = columns.map(col => `"${col.label}"`).join(',');
      
      // Create CSV rows
      const rows = data.map(item => {
        return columns.map(col => {
          const keys = col.key.split('.');
          let value: unknown = item;
          for (const key of keys) {
            value = (value as Record<string, unknown>)?.[key];
          }
          const formatted = formatValue(value);
          // Escape quotes and wrap in quotes
          return `"${formatted.replace(/"/g, '""')}"`;
        }).join(',');
      });

      // Combine header and rows
      const csv = [header, ...rows].join('\n');
      
      // Add BOM for Excel UTF-8 compatibility
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csv;

      // Create blob and download
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${data.length} registos exportados com sucesso!`);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  const exportToJSON = () => {
    setExporting(true);
    try {
      const exportData = data.map(item => {
        const row: Record<string, unknown> = {};
        columns.forEach(col => {
          const keys = col.key.split('.');
          let value: unknown = item;
          for (const key of keys) {
            value = (value as Record<string, unknown>)?.[key];
          }
          row[col.label] = value;
        });
        return row;
      });

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${data.length} registos exportados com sucesso!`);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Download className="w-4 h-4 mr-1" />
              Exportar
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Exportar CSV (Excel)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <Download className="w-4 h-4 mr-2" />
          Exportar JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
