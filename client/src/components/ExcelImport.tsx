import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/StoreContext';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ParsedShift {
  employeeInitials: string;
  date: string;
  shiftCode: string;
}

interface ImportResult {
  total: number;
  matched: number;
  unmatched: string[];
  shifts: ParsedShift[];
  dateRange: { start: string; end: string } | null;
}

const MONTH_MAP: Record<string, number> = {
  'jan': 0, 'feb': 1, 'mar': 2, 'mär': 2, 'apr': 3, 'may': 4, 'mai': 4, 'jun': 5,
  'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'okt': 9, 'nov': 10, 'dec': 11, 'dez': 11
};

export function ExcelImport() {
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { employees, updateAssignment } = useAppStore();

  const parseMonthFromRow = (row: any[]): number => {
    const rowStr = row.join(' ').toLowerCase();
    for (const [key, val] of Object.entries(MONTH_MAP)) {
      if (rowStr.includes(key)) {
        return val;
      }
    }
    return new Date().getMonth();
  };

  const parseFile = async (file: File) => {
    setParsing(true);
    setError(null);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
      
      if (jsonData.length < 8) {
        throw new Error('Excel file does not have enough rows. Expected at least 8 rows.');
      }

      const monthRow = jsonData[4] || [];
      const dayRow = jsonData[5] || [];
      const weekdayRow = jsonData[6] || [];

      const month = parseMonthFromRow(monthRow);
      
      let year = new Date().getFullYear();
      for (let i = 0; i < Math.min(5, jsonData.length); i++) {
        const rowStr = jsonData[i].join(' ');
        const yearMatch = rowStr.match(/20\d{2}/);
        if (yearMatch) {
          year = parseInt(yearMatch[0]);
          break;
        }
      }

      const dates: { col: number; dateStr: string }[] = [];
      
      for (let col = 3; col < dayRow.length; col++) {
        const dayValue = dayRow[col];
        if (!dayValue) continue;
        
        const dayStr = String(dayValue).trim();
        const dayNum = parseInt(dayStr, 10);
        
        if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) continue;

        let currentMonth = month;
        const monthCellStr = String(monthRow[col] || '').toLowerCase();
        for (const [key, val] of Object.entries(MONTH_MAP)) {
          if (monthCellStr.includes(key)) {
            currentMonth = val;
            break;
          }
        }

        let currentYear = year;
        if (currentMonth < month && month >= 10 && currentMonth <= 2) {
          currentYear = year + 1;
        }
        
        const dateObj = new Date(currentYear, currentMonth, dayNum);
        if (!isNaN(dateObj.getTime())) {
          dates.push({
            col,
            dateStr: format(dateObj, 'yyyy-MM-dd')
          });
        }
      }

      if (dates.length === 0) {
        throw new Error('Could not find valid dates in row 6. Make sure day numbers (1-31) are in row 6 starting from column D.');
      }

      const shifts: ParsedShift[] = [];
      const unmatchedEmployees = new Set<string>();
      
      const dataStartRow = 7;
      
      for (let row = dataStartRow; row < jsonData.length; row++) {
        const rowData = jsonData[row];
        if (!rowData || rowData.length < 4) continue;
        
        const initialsCell = rowData[2];
        if (!initialsCell) continue;
        
        const initials = String(initialsCell).trim().toUpperCase();
        
        if (initials.length < 2 || initials.length > 6) continue;
        if (/\d/.test(initials)) continue;
        if (initials.includes('(') || initials.includes('ENGINEER') || initials.includes('MANAGER') || 
            initials.includes('SUPERVISOR') || initials.includes('PRODUCTION') || initials.includes('HEAD') ||
            initials.includes('TMB') || initials.includes('EMPLOYEE') || initials.includes('SENIOR') ||
            initials.includes('EXTERNAL') || initials.includes('CODE') || initials.includes('3/4')) continue;
        
        const employee = employees.find(e => e.initials.toUpperCase() === initials);
        
        if (!employee) {
          if (initials.match(/^[A-Z]{3,5}$/)) {
            unmatchedEmployees.add(initials);
          }
          continue;
        }
        
        for (const dateInfo of dates) {
          const shiftCell = rowData[dateInfo.col];
          if (!shiftCell) continue;
          
          const shiftCode = String(shiftCell).trim();
          if (!shiftCode || shiftCode === '-' || shiftCode === '') continue;
          
          shifts.push({
            employeeInitials: initials,
            date: dateInfo.dateStr,
            shiftCode
          });
        }
      }

      const sortedDates = dates.map(d => d.dateStr).sort();
      const dateRange = sortedDates.length > 0 
        ? { start: sortedDates[0], end: sortedDates[sortedDates.length - 1] }
        : null;

      setResult({
        total: shifts.length,
        matched: new Set(shifts.map(s => s.employeeInitials)).size,
        unmatched: Array.from(unmatchedEmployees),
        shifts,
        dateRange
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse Excel file');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!result) return;
    
    setImporting(true);
    
    try {
      for (const shift of result.shifts) {
        const employee = employees.find(e => e.initials.toUpperCase() === shift.employeeInitials);
        if (employee) {
          updateAssignment(shift.date, employee.id, shift.shiftCode as any);
        }
      }
      
      setOpen(false);
      setResult(null);
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setOpen(false);
    setResult(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-import-excel">
          <FileSpreadsheet className="w-4 h-4" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import Shift Schedule from Excel
          </DialogTitle>
          <DialogDescription>
            Upload Excel file with shifts. Format: Row 5 = Month, Row 6 = Day, Row 7 = Weekday, Column C = Employee code, Column D+ = Shifts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing}
            className="w-full gap-2"
            variant="outline"
          >
            {parsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Select Excel File
              </>
            )}
          </Button>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">File parsed successfully</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Shifts found:</span>
                    <span className="ml-2 font-medium">{result.total}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Employees matched:</span>
                    <span className="ml-2 font-medium">{result.matched}</span>
                  </div>
                </div>

                {result.dateRange && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Date range:</span>
                    <span className="ml-2 font-medium">
                      {result.dateRange.start} to {result.dateRange.end}
                    </span>
                  </div>
                )}
              </div>

              {result.unmatched.length > 0 && (
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-600 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Unmatched employees ({result.unmatched.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.unmatched.slice(0, 10).map(code => (
                      <Badge key={code} variant="outline" className="text-xs">
                        {code}
                      </Badge>
                    ))}
                    {result.unmatched.length > 10 && (
                      <Badge variant="outline" className="text-xs">
                        +{result.unmatched.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {result.shifts.length > 0 && (
                <ScrollArea className="h-[150px] border rounded-lg">
                  <div className="p-2 space-y-1">
                    {result.shifts.slice(0, 50).map((shift, idx) => (
                      <div key={idx} className="flex justify-between text-xs px-2 py-1 hover:bg-muted/50 rounded">
                        <span className="font-mono">{shift.employeeInitials}</span>
                        <span className="text-muted-foreground">{shift.date}</span>
                        <Badge variant="secondary" className="text-xs">{shift.shiftCode}</Badge>
                      </div>
                    ))}
                    {result.shifts.length > 50 && (
                      <div className="text-center text-xs text-muted-foreground py-2">
                        ... and {result.shifts.length - 50} more shifts
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!result || result.total === 0 || importing}
            className="gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Import {result?.total || 0} Shifts
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
