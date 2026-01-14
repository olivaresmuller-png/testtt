import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, Users, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { useAppStore } from '@/lib/StoreContext';
import type { Employee, LicenseType } from '@/lib/data';
import { AIRCRAFT_TYPES } from '@/lib/data';

type AircraftType = typeof AIRCRAFT_TYPES[number];

interface ParsedEmployee {
  name: string;
  initials: string;
  position: 'PM' | 'PS' | 'SE' | '';
  isMentor: boolean;
  licenses: { aircraft: AircraftType; license: LicenseType }[];
  certifications: string[];
  trainingPlanned: string[];
}

function isCellRed(workbook: XLSX.WorkBook, sheetName: string, cellAddress: string): boolean {
  const sheet = workbook.Sheets[sheetName];
  const cell = sheet[cellAddress];
  if (!cell || !cell.s) return false;
  
  const style = cell.s;
  if (style.font && style.font.color) {
    const color = style.font.color;
    if (color.rgb) {
      const rgb = color.rgb.toUpperCase();
      if (rgb === 'FF0000' || rgb === 'C00000' || rgb === 'FF3333' || 
          rgb.startsWith('FF') && rgb.charAt(2) <= '3' && rgb.charAt(4) <= '3') {
        return true;
      }
    }
    if (color.theme !== undefined && color.theme === 5) {
      return true;
    }
  }
  return false;
}

function colToLetter(col: number): string {
  let result = '';
  let c = col;
  while (c >= 0) {
    result = String.fromCharCode((c % 26) + 65) + result;
    c = Math.floor(c / 26) - 1;
  }
  return result;
}

const AIRCRAFT_COLUMNS: { col: number; aircraft: AircraftType; hasNeo?: boolean }[] = [
  { col: 5, aircraft: 'A220' },
  { col: 6, aircraft: 'A320 CF', hasNeo: true },
  { col: 7, aircraft: 'A330 RR' },
  { col: 8, aircraft: 'A343' },
  { col: 9, aircraft: 'A350' },
  { col: 10, aircraft: 'B777' },
];

const SKILL_COLUMNS: { col: number; skill: string }[] = [
  { col: 11, skill: 'RR Fan Blade' },
  { col: 12, skill: 'A220 RU' },
  { col: 13, skill: 'A320 RU' },
  { col: 14, skill: 'A320NEO RU' },
  { col: 15, skill: 'A330 RU' },
  { col: 16, skill: 'A343 RU' },
  { col: 17, skill: 'A350 RU' },
  { col: 18, skill: 'B777 RU' },
  { col: 19, skill: 'A32CFM Boro' },
  { col: 20, skill: 'A32PW Boro' },
  { col: 21, skill: 'A330RR Boro' },
  { col: 22, skill: 'A340 Boro' },
  { col: 23, skill: 'A350 Boro' },
  { col: 24, skill: 'B777 Boro' },
  { col: 25, skill: 'A220 Boro' },
  { col: 26, skill: 'Forklift' },
  { col: 27, skill: 'Walliclean' },
  { col: 28, skill: 'FUEL TANK' },
  { col: 29, skill: 'CYCLEAN' },
  { col: 30, skill: 'Cobra' },
];

function parseLicenseCell(value: string): LicenseType | null {
  if (!value) return null;
  const upper = value.toUpperCase().trim();
  if (upper === 'B1/2' || upper === 'B1-2') return 'B1/2';
  if (upper.startsWith('B1')) return 'B1';
  if (upper.startsWith('B2')) return 'B2';
  if (upper === 'A') return 'A';
  return null;
}

function hasNeoSuffix(value: string): boolean {
  if (!value) return false;
  const upper = value.toUpperCase().trim();
  return upper.includes('N') || upper.includes('NEO');
}

function parsePosition(value: string): { position: 'PM' | 'PS' | 'SE' | ''; isMentor: boolean } {
  if (!value) return { position: '', isMentor: false };
  const upper = value.toUpperCase().trim();
  const isMentor = upper.includes('GAS');
  
  let position: 'PM' | 'PS' | 'SE' | '' = '';
  if (upper.includes('PM')) position = 'PM';
  else if (upper.includes('PS')) position = 'PS';
  else if (upper.includes('SE')) position = 'SE';
  
  return { position, isMentor };
}

function hasSkillMark(value: string): boolean {
  if (!value) return false;
  const upper = String(value).toUpperCase().trim();
  return upper === 'X' || upper === 'YES' || upper === '1' || upper === 'TRUE';
}

export function EmployeeImport() {
  const [open, setOpen] = useState(false);
  const [parsedEmployees, setParsedEmployees] = useState<ParsedEmployee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importData, assignments, employees: currentEmployees } = useAppStore();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setParsedEmployees([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      const employees: ParsedEmployee[] = [];
      
      for (let row = 1; row < jsonData.length; row++) {
        const rowData = jsonData[row];
        if (!rowData || rowData.length < 2) continue;

        const name = String(rowData[0] || '').trim();
        const initials = String(rowData[1] || '').trim().toUpperCase();
        
        if (!name || !initials || initials.length < 2) continue;

        const positionCell = String(rowData[3] || '');
        const { position, isMentor } = parsePosition(positionCell);

        const licenses: { aircraft: AircraftType; license: LicenseType }[] = [];
        const trainingPlanned: string[] = [];
        const excelRow = row + 1;

        for (const { col, aircraft, hasNeo } of AIRCRAFT_COLUMNS) {
          const cellValue = String(rowData[col] || '').trim();
          const license = parseLicenseCell(cellValue);
          
          if (license) {
            const cellAddress = colToLetter(col) + excelRow;
            const isTraining = isCellRed(workbook, sheetName, cellAddress);
            
            if (isTraining) {
              trainingPlanned.push(`${aircraft}: ${license}`);
            } else {
              licenses.push({ aircraft, license });
              
              if (hasNeo && hasNeoSuffix(cellValue)) {
                licenses.push({ aircraft: 'A320 NEO', license });
              }
            }
          }
        }

        const certifications: string[] = [];
        if (isMentor) {
          certifications.push('GAS Mentor');
        }

        for (const { col, skill } of SKILL_COLUMNS) {
          const cellValue = rowData[col];
          if (hasSkillMark(cellValue)) {
            const cellAddress = colToLetter(col) + excelRow;
            const isTraining = isCellRed(workbook, sheetName, cellAddress);
            
            if (isTraining) {
              trainingPlanned.push(skill);
            } else {
              certifications.push(skill);
            }
          }
        }

        employees.push({
          name,
          initials,
          position,
          isMentor,
          licenses,
          certifications,
          trainingPlanned,
        });
      }

      if (employees.length === 0) {
        setError('No valid employee data found. Make sure column A has names and column B has initials.');
      } else {
        setParsedEmployees(employees);
      }
    } catch (err) {
      setError(`Error reading file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImport = () => {
    const newEmployees: Employee[] = parsedEmployees.map((emp, index) => {
      // Try to find existing employee to preserve ID
      const existing = currentEmployees.find(e => e.initials === emp.initials);
      
      return {
        id: existing ? existing.id : `emp-${emp.initials.toLowerCase()}-${index}`,
        name: emp.name,
        initials: emp.initials,
        department: 'S/TMBA',
        role: emp.position === 'PM' ? 'PM' : emp.position === 'PS' ? 'PS' : emp.position === 'SE' ? 'SrEng' : 'Eng',
        grade: 100,
        skills: emp.licenses.map(l => ({
          aircraftType: l.aircraft,
          license: l.license,
        })),
        certifications: emp.certifications,
      };
    });

    importData({ employees: newEmployees, assignments });
    setOpen(false);
    setParsedEmployees([]);
  };

  const getLicenseBadgeColor = (license: LicenseType) => {
    switch (license) {
      case 'B1': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'B2': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'B1/2': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'A': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-import-employees">
          <Users className="w-4 h-4" />
          Import Employees
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import Employee Data from Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium">Expected Excel Format (Columns A-AE):</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-muted-foreground text-xs">
              <div><strong>A:</strong> Name | <strong>B:</strong> Initials | <strong>D:</strong> Position (PM/PS/SE/GAS)</div>
              <div><strong>F-K:</strong> Licenses (A220, A320, A330, A343, A350, B777)</div>
              <div><strong>L:</strong> RR Fan Blade | <strong>M-S:</strong> Run Up capabilities</div>
              <div><strong>T-Z:</strong> Borescope | <strong>AA-AE:</strong> Forklift, Walliclean, Tank, Cyclean, Cobra</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              data-testid="input-employee-file"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="gap-2"
              data-testid="button-select-employee-file"
            >
              <Upload className="w-4 h-4" />
              {isProcessing ? 'Processing...' : 'Select Excel File'}
            </Button>
            {parsedEmployees.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                {parsedEmployees.length} employees found
              </Badge>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {parsedEmployees.length > 0 && (
            <div className="flex-1 overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Name</th>
                    <th className="text-left p-2 font-medium">Code</th>
                    <th className="text-left p-2 font-medium">Position</th>
                    <th className="text-left p-2 font-medium">Licenses</th>
                    <th className="text-left p-2 font-medium">Skills</th>
                    <th className="text-left p-2 font-medium text-red-400">Training Planned</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedEmployees.map((emp, idx) => (
                    <tr key={idx} className="border-t hover:bg-muted/30">
                      <td className="p-2">{emp.name}</td>
                      <td className="p-2 font-mono font-medium">{emp.initials}</td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          {emp.position && (
                            <Badge variant="outline">{emp.position}</Badge>
                          )}
                          {emp.isMentor && (
                            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                              GAS
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {emp.licenses.map((l, i) => (
                            <Badge key={i} variant="outline" className={`text-xs ${getLicenseBadgeColor(l.license)}`}>
                              {l.aircraft}: {l.license}
                            </Badge>
                          ))}
                          {emp.licenses.length === 0 && (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {emp.certifications.filter(c => c !== 'GAS Mentor').slice(0, 4).map((cert, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                          {emp.certifications.filter(c => c !== 'GAS Mentor').length > 4 && (
                            <Badge variant="secondary" className="text-xs">
                              +{emp.certifications.filter(c => c !== 'GAS Mentor').length - 4}
                            </Badge>
                          )}
                          {emp.certifications.filter(c => c !== 'GAS Mentor').length === 0 && (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {emp.trainingPlanned.slice(0, 3).map((item, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-red-500/20 text-red-400 border-red-500/30">
                              {item}
                            </Badge>
                          ))}
                          {emp.trainingPlanned.length > 3 && (
                            <Badge variant="outline" className="text-xs bg-red-500/20 text-red-400 border-red-500/30">
                              +{emp.trainingPlanned.length - 3}
                            </Badge>
                          )}
                          {emp.trainingPlanned.length === 0 && (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {parsedEmployees.length > 0 && (
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => { setParsedEmployees([]); setError(null); }}>
                Cancel
              </Button>
              <Button onClick={handleImport} className="gap-2" data-testid="button-confirm-employee-import">
                <CheckCircle className="w-4 h-4" />
                Import {parsedEmployees.length} Employees
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
