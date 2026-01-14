import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { Download, Upload, RefreshCw, CheckCircle, AlertCircle, Clock, FolderSync } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore, downloadExport, parseImportData } from '@/lib/StoreContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function SyncPage() {
  const { employees, assignments, importData, importMetadata, dailyTargets } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleExport = () => {
    if (employees && assignments) {
      downloadExport(employees, assignments, dailyTargets);
      toast.success('Data exported successfully!', {
        description: 'Save this file to your Teams folder for other computers to access'
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const data = parseImportData(content);
      if (data && importData) {
        importData(data);
        toast.success('Data imported successfully!', {
          description: `Loaded ${data.employees.length} employees and ${data.assignments.length} assignments`
        });
      } else {
        toast.error('Invalid file format', {
          description: 'Please select a valid AeroStaff sync file (.json)'
        });
      }
      setImporting(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const lastExportDate = importMetadata?.importedAt 
    ? new Date(importMetadata.importedAt) 
    : null;

  const totalAssignments = assignments.length;
  const hasData = employees.length > 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold tracking-tight flex items-center gap-3">
          <FolderSync className="w-8 h-8 text-primary" />
          Data Sync
        </h1>
        <p className="text-muted-foreground mt-1">Export and import all data to sync between computers</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
        data-testid="input-sync-file"
      />

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 border-2 hover:border-primary/50 transition-colors" data-testid="card-export">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-display font-semibold">Export All Data</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Create a backup file with all employees, assignments, and changes
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>{employees.length} employees</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>{totalAssignments} shift assignments</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>File will include today's date in filename</span>
            </div>
          </div>

          <Button 
            onClick={handleExport} 
            className="w-full mt-6 h-12 text-base"
            disabled={!hasData}
            data-testid="button-export"
          >
            <Download className="w-5 h-5 mr-2" />
            Export to File
          </Button>

          {!hasData && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              No data to export. Import schedule first.
            </p>
          )}
        </Card>

        <Card className="p-6 border-2 hover:border-primary/50 transition-colors" data-testid="card-import">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Upload className="w-7 h-7 text-emerald-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-display font-semibold">Import Data</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Load data from a sync file to update this computer
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>This will replace all current data</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Select a .json file from your Teams folder</span>
            </div>
            {lastExportDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4" />
                <span>Last import: {format(lastExportDate, 'MMM d, yyyy HH:mm')}</span>
              </div>
            )}
          </div>

          <Button 
            onClick={handleImportClick} 
            variant="outline"
            className="w-full mt-6 h-12 text-base border-2"
            disabled={importing}
            data-testid="button-import"
          >
            {importing ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Select File to Import
              </>
            )}
          </Button>
        </Card>
      </div>

      <Card className="p-6 bg-muted/30" data-testid="card-instructions">
        <h3 className="font-display font-semibold text-lg mb-4">How to Sync Between Computers</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
            <h4 className="font-semibold">Master Computer</h4>
            <p className="text-sm text-muted-foreground">
              Make all your changes (shifts, vacations, etc.) on the master laptop
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
            <h4 className="font-semibold">Export & Save</h4>
            <p className="text-sm text-muted-foreground">
              Click "Export to File" and save the .json file to your Teams folder
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
            <h4 className="font-semibold">Import on Others</h4>
            <p className="text-sm text-muted-foreground">
              On other computers, click "Import" and select the file from Teams
            </p>
          </div>
        </div>
      </Card>

      {hasData && (
        <Card className={cn(
          "p-4 border-2",
          lastExportDate ? "border-success/50 bg-success/5" : "border-amber-500/50 bg-amber-500/5"
        )} data-testid="card-status">
          <div className="flex items-center gap-3">
            {lastExportDate ? (
              <>
                <CheckCircle className="w-5 h-5 text-success" />
                <div>
                  <p className="font-medium">Data loaded from sync file</p>
                  <p className="text-sm text-muted-foreground">
                    Imported on {format(lastExportDate, 'EEEE, MMMM d, yyyy')} at {format(lastExportDate, 'HH:mm')}
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="font-medium">Using local data only</p>
                  <p className="text-sm text-muted-foreground">
                    Export your data to share with other computers
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
