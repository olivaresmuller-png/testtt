import { useState, useCallback, useEffect } from 'react';
import { Employee, DayAssignment, ShiftCode, initialEmployees } from './data';
import { getScheduleForEmployee } from './scheduleData';
import { format, startOfWeek, addDays, eachDayOfInterval } from 'date-fns';

const STORAGE_KEY = 'aerostaff_data';

interface StoredData {
  employees: Employee[];
  assignments: DayAssignment[];
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

function loadFromLocalStorage(): { employees: Employee[]; assignments: DayAssignment[] } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: StoredData = JSON.parse(stored);
      return { employees: data.employees, assignments: data.assignments };
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
  return null;
}

function saveToLocalStorage(employees: Employee[], assignments: DayAssignment[]) {
  try {
    const data: StoredData = {
      employees,
      assignments,
      version: 1,
      exportedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function exportData(employees: Employee[], assignments: DayAssignment[]): string {
  const data: StoredData = {
    employees,
    assignments,
    version: 1,
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function downloadExport(employees: Employee[], assignments: DayAssignment[]) {
  const json = exportData(employees, assignments);
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

export function useAppStore() {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const stored = loadFromLocalStorage();
    return stored?.employees ?? initialEmployees;
  });
  
  const [assignments, setAssignments] = useState<DayAssignment[]>(() => {
    const stored = loadFromLocalStorage();
    return stored?.assignments ?? generateInitialAssignments();
  });
  
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });

  useEffect(() => {
    saveToLocalStorage(employees, assignments);
  }, [employees, assignments]);

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

  const getAssignment = useCallback((date: string, employeeId: string): ShiftCode | undefined => {
    return assignments.find(a => a.date === date && a.employeeId === employeeId)?.shiftCode;
  }, [assignments]);

  const getWeekDates = useCallback((date: Date): string[] => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'));
  }, []);

  const importData = useCallback((data: { employees: Employee[]; assignments: DayAssignment[] }) => {
    setEmployees(data.employees);
    setAssignments(data.assignments);
  }, []);

  const resetToDefaults = useCallback(() => {
    setEmployees(initialEmployees);
    setAssignments(generateInitialAssignments());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    employees,
    assignments,
    selectedDate,
    setSelectedDate,
    addEmployee,
    removeEmployee,
    updateEmployee,
    updateAssignment,
    getAssignment,
    getWeekDates,
    importData,
    resetToDefaults,
  };
}
