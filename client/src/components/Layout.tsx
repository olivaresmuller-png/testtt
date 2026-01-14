import { Link, useLocation } from 'wouter';
import { 
  Calendar, 
  Users, 
  BarChart3, 
  Plane, 
  Settings,
  Menu,
  X,
  Wrench,
  Download,
  Upload,
  RotateCcw,
  Sun,
  Moon,
  GraduationCap,
  FolderSync
} from 'lucide-react';
import { useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { downloadExport, parseImportData } from '@/lib/StoreContext';
import { Employee, DayAssignment } from '@/lib/data';
import { toast } from 'sonner';

const navItems = [
  { path: '/', label: 'Dashboard', icon: BarChart3 },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/employees', label: 'Employees', icon: Users },
  { path: '/skills', label: 'Skills Matrix', icon: Plane },
  { path: '/aerostaff', label: 'AeroStaff', icon: Wrench },
  { path: '/training', label: 'Training', icon: GraduationCap },
  { path: '/sync', label: 'Data Sync', icon: FolderSync },
];

interface ImportData {
  employees: Employee[];
  assignments: DayAssignment[];
  version?: number;
  exportedAt?: string;
}

interface LayoutProps {
  children: React.ReactNode;
  employees?: Employee[];
  assignments?: DayAssignment[];
  dailyTargets?: Record<string, number>;
  onImport?: (data: ImportData) => void;
  onReset?: () => void;
  onLoadDemo?: () => void;
}

export function Layout({ children, employees, assignments, dailyTargets, onImport, onReset, onLoadDemo }: LayoutProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleExport = () => {
    if (employees && assignments) {
      downloadExport(employees, assignments, dailyTargets);
      toast.success('Data exported successfully!', {
        description: 'Save this file to your cloud storage (Google Drive, OneDrive, Dropbox)'
      });
    }
    setSettingsOpen(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const data = parseImportData(content);
      if (data && onImport) {
        onImport(data);
        toast.success('Data imported successfully!', {
          description: `Loaded ${data.employees.length} employees`
        });
        setSettingsOpen(false);
      } else {
        toast.error('Invalid file format', {
          description: 'Please select a valid AeroStaff backup file'
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
      toast.success('Data reset to defaults');
    }
    setResetConfirmOpen(false);
    setSettingsOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-background">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      <aside className="hidden lg:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Plane className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg tracking-tight">AeroStaff v4.0</h1>
              <p className="text-xs text-sidebar-foreground/60">Manpower Planner</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-1">
          <div 
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
            data-testid="button-theme-toggle"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
          <div 
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
            data-testid="button-settings"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </div>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Plane className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">TMBA Planner</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="button-theme-toggle-mobile"
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              data-testid="button-settings-mobile"
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              data-testid="button-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="absolute top-full left-0 right-0 bg-card border-b border-border p-4 space-y-1 animate-slide-in">
            {navItems.map((item) => {
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <div
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <main className="flex-1 overflow-auto lg:p-0 pt-16 lg:pt-0">
        {children}
      </main>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Data Management
            </DialogTitle>
            <DialogDescription>
              Export your data to sync across computers, or import a backup file.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Sync Across Computers</h4>
              <p className="text-xs text-muted-foreground">
                Export your data and save it to Google Drive, OneDrive, or Dropbox. 
                Then import on any other computer.
              </p>
            </div>

            <div className="grid gap-3">
              <Button 
                onClick={handleExport} 
                className="w-full justify-start gap-3"
                variant="outline"
                data-testid="button-export"
              >
                <Download className="w-4 h-4" />
                Export Data
                <span className="ml-auto text-xs text-muted-foreground">Download .json</span>
              </Button>

              <Button 
                onClick={handleImportClick} 
                className="w-full justify-start gap-3"
                variant="outline"
                data-testid="button-import"
              >
                <Upload className="w-4 h-4" />
                Import Data
                <span className="ml-auto text-xs text-muted-foreground">Load .json</span>
              </Button>

              <div className="border-t pt-3 mt-2 space-y-2">
                <Button 
                  onClick={() => {
                    if (onLoadDemo) {
                      onLoadDemo();
                      toast.success('Demo data loaded');
                      setSettingsOpen(false);
                    }
                  }} 
                  className="w-full justify-start gap-3"
                  variant="ghost"
                  data-testid="button-load-demo"
                >
                  <Users className="w-4 h-4" />
                  Load Demo Data
                  <span className="ml-auto text-xs text-muted-foreground">Populate example</span>
                </Button>

                <Button 
                  onClick={() => setResetConfirmOpen(true)} 
                  className="w-full justify-start gap-3"
                  variant="ghost"
                  data-testid="button-reset"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Defaults
                  <span className="ml-auto text-xs text-muted-foreground">Clear all changes</span>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset to Defaults?</DialogTitle>
            <DialogDescription>
              This will delete all your changes and restore the original data. 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset} data-testid="button-confirm-reset">
              Reset Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
