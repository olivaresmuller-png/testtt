import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo, useRef } from 'react';
import { Employee, DayAssignment, ShiftCode, initialEmployees } from './data';
import { getScheduleForEmployee } from './scheduleData';
import { format, startOfWeek, addDays, eachDayOfInterval } from 'date-fns';
import * as db from './indexedDB';

const STORAGE_KEY = 'aerostaff_data';
const USE_INDEXED_DB = typeof indexedDB !== 'undefined';

interface StoredData {
  employees: Employee[];
  assignments: DayAssignment[];
  dailyTargets?: Record<string, number>;
  version: number;
  exportedAt: string;
}

function generateInitialAssignments(): DayAssignment[] {
  const assignments: DayAssignment[] = [];
  const start = new Date(2026, 0, 1);
  const end = new Date(2026, 11, 31);
  const days = eachDayOfInterval({ start, end });

  initialEmployees.forEach((employee) => {
    const schedule = getScheduleForEmployee(employee.name);
    
    days.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayOfWeek = day.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      let shiftCode: ShiftCode = schedule[dateStr] || (isWeekend ? '-' : 'Ea');
      
      assignments.push({
        date: dateStr,
        employeeId: employee.id,
        shiftCode,
      });
    });
  });

  return assignments;
}

function loadFromLocalStorage(): { employees: Employee[]; assignments: DayAssignment[]; dailyTargets?: Record<string, number> } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: StoredData = JSON.parse(stored);
      return { employees: data.employees, assignments: data.assignments, dailyTargets: data.dailyTargets };
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
  return null;
}

function saveToLocalStorage(employees: Employee[], assignments: DayAssignment[], dailyTargets: Record<string, number>) {
  try {
    const data: StoredData = {
      employees,
      assignments,
      dailyTargets,
      version: 1,
      exportedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function exportData(employees: Employee[], assignments: DayAssignment[], dailyTargets?: Record<string, number>): string {
  const data: StoredData = {
    employees,
    assignments,
    dailyTargets,
    version: 1,
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function downloadExport(employees: Employee[], assignments: DayAssignment[], dailyTargets?: Record<string, number>) {
  const json = exportData(employees, assignments, dailyTargets);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aerostaff_backup_${format(new Date(), 'yyyy-MM-dd_HHmm')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportData(jsonString: string): StoredData | null {
  try {
    const data = JSON.parse(jsonString);
    if (data.employees && data.assignments) {
      return data as StoredData;
    }
  } catch (e) {
    console.error('Failed to parse import data:', e);
  }
  return null;
}

interface ImportMetadata {
  importedAt: string;
  employeeCount: number;
  assignmentCount: number;
  dateRange?: { start: string; end: string };
}

interface AppStoreState {
  employees: Employee[];
  assignments: DayAssignment[];
  dailyTargets: Record<string, number>;
  selectedDate: Date;
  importMetadata: ImportMetadata | null;
  setSelectedDate: (date: Date) => void;
  setDailyTarget: (date: string, target: number) => void;
  addEmployee: (employee: Omit<Employee, 'id'>) => void;
  removeEmployee: (id: string) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  updateAssignment: (date: string, employeeId: string, shiftCode: ShiftCode) => void;
  getAssignment: (date: string, employeeId: string) => ShiftCode | undefined;
  getWeekDates: (date: Date) => string[];
  importData: (data: { employees: Employee[]; assignments: DayAssignment[]; dailyTargets?: Record<string, number> }) => void;
  resetToDefaults: () => void;
  loadDemoData: () => void;
}

const StoreContext = createContext<AppStoreState | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const stored = loadFromLocalStorage();
    return stored?.employees ?? [];
  });
  
  const [assignments, setAssignments] = useState<DayAssignment[]>(() => {
    const stored = loadFromLocalStorage();
    return stored?.assignments ?? [];
  });

  const [dailyTargets, setDailyTargetsState] = useState<Record<string, number>>(() => {
    const stored = loadFromLocalStorage();
    return stored?.dailyTargets ?? {};
  });
  
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.getFullYear(), today.getMonth(), diff);
  });
  
  const [importMetadata, setImportMetadata] = useState<ImportMetadata | null>(() => {
    try {
      const stored = localStorage.getItem('aerostaff_import_metadata');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  
  useEffect(() => {
    if (USE_INDEXED_DB && !isInitializedRef.current) {
      isInitializedRef.current = true;
      db.hasData().then(hasData => {
        if (hasData) {
          Promise.all([db.loadEmployees(), db.loadAssignments()]).then(([emps, assigns]) => {
            if (emps.length > 0) setEmployees(emps);
            if (assigns.length > 0) setAssignments(assigns);
          });
        }
      }).catch(console.error);
    }
  }, []);
  
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToLocalStorage(employees, assignments, dailyTargets);
      if (USE_INDEXED_DB) {
        Promise.all([
          db.saveEmployees(employees),
          db.saveAssignments(assignments)
        ]).catch(console.error);
      }
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [employees, assignments, dailyTargets]);

  const assignmentIndex = useMemo(() => {
    const index = new Map<string, ShiftCode>();
    assignments.forEach(a => {
      index.set(`${a.date}|${a.employeeId}`, a.shiftCode);
    });
    return index;
  }, [assignments]);
  
  useEffect(() => {
    if (importMetadata) {
      localStorage.setItem('aerostaff_import_metadata', JSON.stringify(importMetadata));
    }
  }, [importMetadata]);

  const addEmployee = useCallback((employee: Omit<Employee, 'id'>) => {
    const newEmployee: Employee = {
      ...employee,
      id: Date.now().toString(),
    };
    setEmployees(prev => [...prev, newEmployee]);
  }, []);

  const removeEmployee = useCallback((id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    setAssignments(prev => prev.filter(a => a.employeeId !== id));
  }, []);

  const updateEmployee = useCallback((id: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const updateAssignment = useCallback((date: string, employeeId: string, shiftCode: ShiftCode) => {
    setAssignments(prev => {
      const existing = prev.findIndex(a => a.date === date && a.employeeId === employeeId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { date, employeeId, shiftCode };
        return updated;
      }
      return [...prev, { date, employeeId, shiftCode }];
    });
  }, []);

  const setDailyTarget = useCallback((date: string, target: number) => {
    setDailyTargetsState(prev => ({ ...prev, [date]: target }));
  }, []);

  const getAssignment = useCallback((date: string, employeeId: string): ShiftCode | undefined => {
    return assignmentIndex.get(`${date}|${employeeId}`);
  }, [assignmentIndex]);

  const getWeekDates = useCallback((date: Date): string[] => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'));
  }, []);

  const importData = useCallback((data: { employees: Employee[]; assignments: DayAssignment[]; dailyTargets?: Record<string, number> }) => {
    setEmployees(data.employees);
    setAssignments(data.assignments);
    if (data.dailyTargets) {
      setDailyTargetsState(data.dailyTargets);
    }
    
    // Calculate date range from assignments
    const dates = data.assignments.map(a => a.date).sort();
    const dateRange = dates.length > 0 ? { start: dates[0], end: dates[dates.length - 1] } : undefined;
    
    setImportMetadata({
      importedAt: new Date().toISOString(),
      employeeCount: data.employees.length,
      assignmentCount: data.assignments.length,
      dateRange,
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setEmployees(initialEmployees);
    setAssignments(generateInitialAssignments());
    setImportMetadata(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('aerostaff_import_metadata');
    if (USE_INDEXED_DB) {
      db.clearAllData().catch(console.error);
    }
  }, []);

  const loadDemoData = useCallback(() => {
    setEmployees(initialEmployees);
    setAssignments(generateInitialAssignments());
    setDailyTargetsState({});
    setImportMetadata(null);
  }, []);

  const value: AppStoreState = {
    employees,
    assignments,
    dailyTargets,
    selectedDate,
    importMetadata,
    setSelectedDate,
    setDailyTarget,
    addEmployee,
    removeEmployee,
    updateEmployee,
    updateAssignment,
    getAssignment,
    getWeekDates,
    importData,
    resetToDefaults,
    loadDemoData,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useAppStore must be used within a StoreProvider');
  }
  return context;
}
