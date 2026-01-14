import { useState, useMemo, useEffect, useCallback, memo, useRef } from 'react';
import { useDebounce } from 'use-debounce';
import { format, addDays, subDays } from 'date-fns';
import {
  Plane, Users, Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Check, X, RefreshCw,
  AlertTriangle, Wrench, ClipboardList, Printer, ArrowRightLeft, Play, HardDrive, Fuel, Forklift, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/StoreContext';
import { initialEmployees, AIRCRAFT_TYPES, isOnDuty, canWorkOnAircraft } from '@/lib/data';

type Priority = 'low' | 'normal' | 'high' | 'urgent';
type SpecialSkill = 'FUEL TANK' | 'Walliclean' | 'Forklift' | 'CYCLEAN' | 'Cobra' | 'Cee Bee';

const SPECIAL_SKILLS: SpecialSkill[] = ['FUEL TANK', 'Walliclean', 'Forklift', 'CYCLEAN', 'Cobra', 'Cee Bee'];

const SKILL_LABELS: Record<SpecialSkill, { label: string; color: string }> = {
  'FUEL TANK': { label: 'Fuel Tank Entry', color: 'bg-amber-500' },
  'Walliclean': { label: 'Walliclean', color: 'bg-cyan-500' },
  'Forklift': { label: 'Forklift', color: 'bg-orange-500' },
  'CYCLEAN': { label: 'Cyclean', color: 'bg-teal-500' },
  'Cobra': { label: 'Cobra', color: 'bg-red-500' },
  'Cee Bee': { label: 'Cee-Bee', color: 'bg-indigo-500' },
};

interface Aircraft {
  id: string;
  registration: string;
  type: string;
  company: string;
}

interface DutyStatus {
  date: string;
  employeeId: string;
  onDuty: boolean;
}

interface WorkRequirement {
  id: string;
  date: string;
  aircraftId: string;
  b1Required: number;
  b2Required: number;
  catARequired: number;
  b1Hours: number;
  b2Hours: number;
  catAHours: number;
  b1TotalHours: number;
  b2TotalHours: number;
  catATotalHours: number;
  priority: Priority;
  specialSkillsRequired: SpecialSkill[];
  boroscopeRequired: boolean;
  engineRunRequired: boolean;
}

const HOURS_PER_PERSON = 8;

const calcPersonsFromHours = (totalHours: number): number => {
  if (totalHours <= 0) return 0;
  return Math.ceil(totalHours / HOURS_PER_PERSON);
};

interface Assignment {
  id: string;
  date: string;
  aircraftId: string;
  employeeId: string;
  role: 'B1' | 'B2' | 'Cat A/Helper';
  isManualOverride: boolean;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; order: number }> = {
  urgent: { label: 'Urgent', color: 'bg-red-500', order: 0 },
  high: { label: 'High', color: 'bg-orange-500', order: 1 },
  normal: { label: 'Normal', color: 'bg-blue-500', order: 2 },
  low: { label: 'Low', color: 'bg-gray-500', order: 3 },
};

const initialAircraft: Aircraft[] = [
  // A350 Fleet
  { id: 'a350-1', registration: 'HB-IFA', type: 'A350', company: 'LX' },
  { id: 'a350-2', registration: 'HB-IFB', type: 'A350', company: 'LX' },
  { id: 'a350-3', registration: 'HB-IFC', type: 'A350', company: 'LX' },
  { id: 'a350-4', registration: 'HB-IFD', type: 'A350', company: 'LX' },
  { id: 'a350-5', registration: 'HB-IFE', type: 'A350', company: 'LX' },
  { id: 'a350-6', registration: 'HB-IHA', type: 'A350', company: 'WK' },
  { id: 'a350-7', registration: 'HB-IHB', type: 'A350', company: 'WK' },
  { id: 'a350-8', registration: 'HB-IHC', type: 'A350', company: 'WK' },
  { id: 'a350-9', registration: 'HB-IHD', type: 'A350', company: 'WK' },
  { id: 'a350-10', registration: 'HB-IHE', type: 'A350', company: 'WK' },
  { id: 'a350-11', registration: 'HB-IHF', type: 'A350', company: 'WK' },
  // A320 CF Fleet
  { id: 'a320cf-1', registration: 'HB-IHX', type: 'A320 CF', company: 'WK' },
  { id: 'a320cf-2', registration: 'HB-IHY', type: 'A320 CF', company: 'WK' },
  { id: 'a320cf-3', registration: 'HB-IHZ', type: 'A320 CF', company: 'WK' },
  { id: 'a320cf-4', registration: 'HB-IJI', type: 'A320 CF', company: 'LX' },
  { id: 'a320cf-5', registration: 'HB-IJJ', type: 'A320 CF', company: 'LX' },
  { id: 'a320cf-6', registration: 'HB-IJK', type: 'A320 CF', company: 'LX' },
  { id: 'a320cf-7', registration: 'HB-IJL', type: 'A320 CF', company: 'LX' },
  { id: 'a320cf-8', registration: 'HB-IJM', type: 'A320 CF', company: 'LX' },
  { id: 'a320cf-9', registration: 'HB-IJN', type: 'A320 CF', company: 'LX' },
  { id: 'a320cf-10', registration: 'HB-IJO', type: 'A320 CF', company: 'LX' },
  { id: 'a320cf-11', registration: 'HB-IJP', type: 'A320 CF', company: 'LX' },
  { id: 'a320cf-12', registration: 'HB-IJQ', type: 'A320 CF', company: 'LX' },
  { id: 'a320cf-13', registration: 'HB-IJR', type: 'A320 CF', company: 'LX' },
  { id: 'a320cf-14', registration: 'HB-IJU', type: 'A320 CF', company: 'WK' },
  { id: 'a320cf-15', registration: 'HB-IJV', type: 'A320 CF', company: 'WK' },
  { id: 'a320cf-16', registration: 'HB-IJW', type: 'A320 CF', company: 'WK' },
  { id: 'a320cf-17', registration: 'HB-JJK', type: 'A320 CF', company: 'WK' },
  { id: 'a320cf-18', registration: 'HB-JJL', type: 'A320 CF', company: 'WK' },
  { id: 'a320cf-19', registration: 'HB-JJM', type: 'A320 CF', company: 'WK' },
  { id: 'a320cf-20', registration: 'HB-JJN', type: 'A320 CF', company: 'WK' },
  { id: 'a320cf-21', registration: 'HB-JLP', type: 'A320 CF', company: 'WK' },
  { id: 'a320cf-22', registration: 'HB-JLQ', type: 'A320 CF', company: 'WK' },
  { id: 'a320cf-23', registration: 'HB-JLR', type: 'A320 CF', company: 'WK' },
  { id: 'a320cf-24', registration: 'HB-JLS', type: 'A320 CF', company: 'WK' },
  { id: 'a320cf-25', registration: 'HB-JLT', type: 'A320 CF', company: 'WK' },
  // A321 RR Fleet (compatible with A320 NEO/CF licenses)
  { id: 'a321rr-1', registration: 'HB-IOD', type: 'A321RR', company: 'LX' },
  { id: 'a321rr-2', registration: 'HB-IOF', type: 'A321RR', company: 'LX' },
  { id: 'a321rr-3', registration: 'HB-IOH', type: 'A321RR', company: 'LX' },
  { id: 'a321rr-4', registration: 'HB-IOM', type: 'A321RR', company: 'LX' },
  { id: 'a321rr-5', registration: 'HB-ION', type: 'A321RR', company: 'LX' },
  { id: 'a321rr-6', registration: 'HB-IOO', type: 'A321RR', company: 'LX' },
  // A321 NEO Fleet (compatible with A320 NEO licenses)
  { id: 'a321neo-1', registration: 'HB-JPA', type: 'A321 NEO', company: 'LX' },
  { id: 'a321neo-2', registration: 'HB-JPB', type: 'A321 NEO', company: 'LX' },
  { id: 'a321neo-3', registration: 'HB-JPC', type: 'A321 NEO', company: 'LX' },
  { id: 'a321neo-4', registration: 'HB-JPD', type: 'A321 NEO', company: 'LX' },
  { id: 'a321neo-5', registration: 'HB-JPE', type: 'A321 NEO', company: 'LX' },
  { id: 'a321neo-6', registration: 'HB-JPF', type: 'A321 NEO', company: 'LX' },
  { id: 'a321neo-7', registration: 'HB-JPG', type: 'A321 NEO', company: 'LX' },
  { id: 'a321neo-8', registration: 'HB-JPH', type: 'A321 NEO', company: 'LX' },
  // A220 Fleet
  { id: 'a220-1', registration: 'HB-JBA', type: 'A220', company: 'LX' },
  { id: 'a220-2', registration: 'HB-JBB', type: 'A220', company: 'LX' },
  { id: 'a220-3', registration: 'HB-JBC', type: 'A220', company: 'LX' },
  { id: 'a220-4', registration: 'HB-JBD', type: 'A220', company: 'LX' },
  { id: 'a220-5', registration: 'HB-JBE', type: 'A220', company: 'LX' },
  { id: 'a220-6', registration: 'HB-JBF', type: 'A220', company: 'LX' },
  { id: 'a220-7', registration: 'HB-JBG', type: 'A220', company: 'LX' },
  { id: 'a220-8', registration: 'HB-JBH', type: 'A220', company: 'LX' },
  { id: 'a220-9', registration: 'HB-JBI', type: 'A220', company: 'LX' },
  { id: 'a220-10', registration: 'HB-JCA', type: 'A220', company: 'LX' },
  { id: 'a220-11', registration: 'HB-JCB', type: 'A220', company: 'LX' },
  { id: 'a220-12', registration: 'HB-JCC', type: 'A220', company: 'LX' },
  { id: 'a220-13', registration: 'HB-JCD', type: 'A220', company: 'LX' },
  { id: 'a220-14', registration: 'HB-JCE', type: 'A220', company: 'LX' },
  { id: 'a220-15', registration: 'HB-JCF', type: 'A220', company: 'LX' },
  { id: 'a220-16', registration: 'HB-JCG', type: 'A220', company: 'LX' },
  { id: 'a220-17', registration: 'HB-JCH', type: 'A220', company: 'LX' },
  { id: 'a220-18', registration: 'HB-JCI', type: 'A220', company: 'LX' },
  { id: 'a220-19', registration: 'HB-JCJ', type: 'A220', company: 'LX' },
  { id: 'a220-20', registration: 'HB-JCK', type: 'A220', company: 'LX' },
  { id: 'a220-21', registration: 'HB-JCL', type: 'A220', company: 'LX' },
  { id: 'a220-22', registration: 'HB-JCM', type: 'A220', company: 'LX' },
  { id: 'a220-23', registration: 'HB-JCN', type: 'A220', company: 'LX' },
  { id: 'a220-24', registration: 'HB-JCO', type: 'A220', company: 'LX' },
  { id: 'a220-25', registration: 'HB-JCP', type: 'A220', company: 'LX' },
  { id: 'a220-26', registration: 'HB-JCQ', type: 'A220', company: 'LX' },
  { id: 'a220-27', registration: 'HB-JCR', type: 'A220', company: 'LX' },
  { id: 'a220-28', registration: 'HB-JCS', type: 'A220', company: 'LX' },
  { id: 'a220-29', registration: 'HB-JCT', type: 'A220', company: 'LX' },
  { id: 'a220-30', registration: 'HB-JCU', type: 'A220', company: 'LX' },
  // A320 NEO Fleet
  { id: 'a320neo-1', registration: 'HB-JDA', type: 'A320 NEO', company: 'LX' },
  { id: 'a320neo-2', registration: 'HB-JDB', type: 'A320 NEO', company: 'LX' },
  { id: 'a320neo-3', registration: 'HB-JDC', type: 'A320 NEO', company: 'LX' },
  { id: 'a320neo-4', registration: 'HB-JDD', type: 'A320 NEO', company: 'LX' },
  { id: 'a320neo-5', registration: 'HB-JDE', type: 'A320 NEO', company: 'LX' },
  { id: 'a320neo-6', registration: 'HB-JDF', type: 'A320 NEO', company: 'LX' },
  { id: 'a320neo-7', registration: 'HB-JDG', type: 'A320 NEO', company: 'LX' },
  { id: 'a320neo-8', registration: 'HB-JDH', type: 'A320 NEO', company: 'LX' },
  { id: 'a320neo-9', registration: 'HB-JDI', type: 'A320 NEO', company: 'LX' },
  { id: 'a320neo-10', registration: 'HB-JDJ', type: 'A320 NEO', company: 'LX' },
  { id: 'a320neo-11', registration: 'HB-JDK', type: 'A320 NEO', company: 'LX' },
  { id: 'a320neo-12', registration: 'HB-JDL', type: 'A320 NEO', company: 'LX' },
  { id: 'a320neo-13', registration: 'HB-JDM', type: 'A320 NEO', company: 'LX' },
  // A330 RR Fleet
  { id: 'a330rr-1', registration: 'HB-JHA', type: 'A330 RR', company: 'LX' },
  { id: 'a330rr-2', registration: 'HB-JHB', type: 'A330 RR', company: 'LX' },
  { id: 'a330rr-3', registration: 'HB-JHC', type: 'A330 RR', company: 'LX' },
  { id: 'a330rr-4', registration: 'HB-JHD', type: 'A330 RR', company: 'LX' },
  { id: 'a330rr-5', registration: 'HB-JHE', type: 'A330 RR', company: 'LX' },
  { id: 'a330rr-6', registration: 'HB-JHF', type: 'A330 RR', company: 'LX' },
  { id: 'a330rr-7', registration: 'HB-JHG', type: 'A330 RR', company: 'LX' },
  { id: 'a330rr-8', registration: 'HB-JHH', type: 'A330 RR', company: 'LX' },
  { id: 'a330rr-9', registration: 'HB-JHI', type: 'A330 RR', company: 'LX' },
  { id: 'a330rr-10', registration: 'HB-JHJ', type: 'A330 RR', company: 'LX' },
  { id: 'a330rr-11', registration: 'HB-JHK', type: 'A330 RR', company: 'LX' },
  { id: 'a330rr-12', registration: 'HB-JHL', type: 'A330 RR', company: 'LX' },
  { id: 'a330rr-13', registration: 'HB-JHM', type: 'A330 RR', company: 'LX' },
  { id: 'a330rr-14', registration: 'HB-JHN', type: 'A330 RR', company: 'LX' },
  // A343 Fleet
  { id: 'a343-1', registration: 'HB-JMA', type: 'A343', company: 'LX' },
  { id: 'a343-2', registration: 'HB-JMB', type: 'A343', company: 'LX' },
  { id: 'a343-3', registration: 'HB-JMC', type: 'A343', company: 'WK' },
  { id: 'a343-4', registration: 'HB-JMD', type: 'A343', company: 'WK' },
  { id: 'a343-5', registration: 'HB-JME', type: 'A343', company: 'WK' },
  { id: 'a343-6', registration: 'HB-JMF', type: 'A343', company: 'WK' },
  { id: 'a343-7', registration: 'HB-JMG', type: 'A343', company: 'WK' },
  { id: 'a343-8', registration: 'HB-JMH', type: 'A343', company: 'LX' },
  { id: 'a343-9', registration: 'HB-JMI', type: 'A343', company: 'LX' },
  // B777 Fleet
  { id: 'b777-1', registration: 'HB-JNA', type: 'B777', company: 'LX' },
  { id: 'b777-2', registration: 'HB-JNB', type: 'B777', company: 'LX' },
  { id: 'b777-3', registration: 'HB-JNC', type: 'B777', company: 'LX' },
  { id: 'b777-4', registration: 'HB-JND', type: 'B777', company: 'LX' },
  { id: 'b777-5', registration: 'HB-JNE', type: 'B777', company: 'LX' },
  { id: 'b777-6', registration: 'HB-JNF', type: 'B777', company: 'LX' },
  { id: 'b777-7', registration: 'HB-JNG', type: 'B777', company: 'LX' },
  { id: 'b777-8', registration: 'HB-JNH', type: 'B777', company: 'LX' },
  { id: 'b777-9', registration: 'HB-JNI', type: 'B777', company: 'LX' },
  { id: 'b777-10', registration: 'HB-JNJ', type: 'B777', company: 'LX' },
  { id: 'b777-11', registration: 'HB-JNK', type: 'B777', company: 'LX' },
  { id: 'b777-12', registration: 'HB-JNL', type: 'B777', company: 'LX' },
];

const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const migrateAircraftTypes = (aircraftList: Aircraft[]): Aircraft[] => {
  return aircraftList.map(ac => ({
    ...ac,
    type: ac.type === '777' ? 'B777' : ac.type
  }));
};

export function AeroStaffPage() {
  const { toast } = useToast();
  const { employees, assignments: calendarAssignments, selectedDate: storeDate, getAssignment: getCalendarAssignment } = useAppStore();
  
  // Use the shared employee data from the calendar store (same data as Calendar page)
  
  const assignableEmployees = useMemo(() => 
    employees.filter(emp => emp.role !== 'PM' && emp.role !== 'PS'),
    [employees]
  );
  
  const [selectedDate, setSelectedDate] = useState(storeDate);
  const [aircraft, setAircraft] = useState<Aircraft[]>(() => {
    // Version check: if stored aircraft count is less than full fleet, reset to new data
    const stored = loadFromStorage<Aircraft[]>('aerostaff_aircraft', []);
    if (stored.length < 100) {
      // Old data - load the new full fleet
      localStorage.removeItem('aerostaff_aircraft');
      return initialAircraft;
    }
    return migrateAircraftTypes(stored);
  });
  const [dutyStatuses, setDutyStatuses] = useState<DutyStatus[]>(() => loadFromStorage('aerostaff_duty', []));
  const [workRequirements, setWorkRequirements] = useState<WorkRequirement[]>(() => loadFromStorage('aerostaff_requirements', []));
  const [assignments, setAssignments] = useState<Assignment[]>(() => loadFromStorage('aerostaff_assignments', []));
  const [activeTab, setActiveTab] = useState('assignments');
  const [registrationInput, setRegistrationInput] = useState('');
  const [showQuickReassign, setShowQuickReassign] = useState(false);
  const [reassignEmployee, setReassignEmployee] = useState('');
  const [reassignToAircraft, setReassignToAircraft] = useState('');
  const [reassignRole, setReassignRole] = useState<'B1' | 'B2' | 'Cat A/Helper'>('B1');
  
  const [showAddAircraft, setShowAddAircraft] = useState(false);
  const [newAircraftReg, setNewAircraftReg] = useState('');
  const [newAircraftType, setNewAircraftType] = useState('A320 CF');
  const [newAircraftCompany, setNewAircraftCompany] = useState('LX');
  
  const [aircraftToDelete, setAircraftToDelete] = useState<Aircraft | null>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  useEffect(() => { localStorage.setItem('aerostaff_aircraft', JSON.stringify(aircraft)); }, [aircraft]);
  useEffect(() => { localStorage.setItem('aerostaff_duty', JSON.stringify(dutyStatuses)); }, [dutyStatuses]);
  useEffect(() => { localStorage.setItem('aerostaff_requirements', JSON.stringify(workRequirements)); }, [workRequirements]);
  useEffect(() => { localStorage.setItem('aerostaff_assignments', JSON.stringify(assignments)); }, [assignments]);

  const calendarDutyStatus = useMemo(() => {
    return calendarAssignments.filter(a => a.date === dateStr).map(a => ({
      employeeId: a.employeeId,
      onDuty: isOnDuty(a.shiftCode),
      shiftCode: a.shiftCode
    }));
  }, [calendarAssignments, dateStr]);

  useEffect(() => {
    const existingDuty = dutyStatuses.filter((d) => d.date === dateStr);
    if (existingDuty.length === 0) {
      const newDutyStatuses = employees.map((emp) => {
        const calStatus = calendarDutyStatus.find(c => c.employeeId === emp.id);
        return { date: dateStr, employeeId: emp.id, onDuty: calStatus?.onDuty ?? true };
      });
      setDutyStatuses((prev) => [...prev, ...newDutyStatuses]);
    }
  }, [dateStr, employees, calendarDutyStatus]);

  const todaysDuty = useMemo(() => dutyStatuses.filter((d) => d.date === dateStr), [dutyStatuses, dateStr]);
  const todaysRequirements = useMemo(() => workRequirements.filter((r) => r.date === dateStr), [workRequirements, dateStr]);
  const todaysAssignments = useMemo(() => assignments.filter((a) => a.date === dateStr), [assignments, dateStr]);

  const aircraftAssignmentsMap = useMemo(() => {
    const map: Record<string, string> = {};
    todaysAssignments.forEach(assignment => {
      const ac = aircraft.find(a => a.id === assignment.aircraftId);
      if (ac) {
        map[assignment.employeeId] = ac.registration;
      }
    });
    return map;
  }, [todaysAssignments, aircraft]);

  const onDutyEmployees = useMemo(() => assignableEmployees.filter((emp) => {
    const calStatus = calendarDutyStatus.find(c => c.employeeId === emp.id);
    if (calStatus) return calStatus.onDuty;
    const status = todaysDuty.find((d) => d.employeeId === emp.id);
    return status?.onDuty ?? true;
  }), [assignableEmployees, todaysDuty, calendarDutyStatus]);

  const toggleDutyStatus = (employeeId: string) => {
    setDutyStatuses((prev) => prev.map((d) => d.date === dateStr && d.employeeId === employeeId ? { ...d, onDuty: !d.onDuty } : d));
  };

  const addAircraftByRegistration = () => {
    const reg = registrationInput.trim().toUpperCase();
    if (!reg) return;
    let matchedAircraft = aircraft.find((a) => a.registration.toUpperCase() === reg);
    if (!matchedAircraft) matchedAircraft = aircraft.find((a) => a.registration.toUpperCase().includes(reg));
    if (!matchedAircraft) {
      toast({ title: 'Aircraft Not Found', description: `Registration "${reg}" not found in fleet. Add it first.`, variant: 'destructive' });
      return;
    }
    if (workRequirements.find((r) => r.date === dateStr && r.aircraftId === matchedAircraft.id)) {
      toast({ title: 'Already Added', description: `${reg} is already in today's work requirements.`, variant: 'destructive' });
      return;
    }
    const newReq: WorkRequirement = {
      id: `wr-${matchedAircraft.id}-${dateStr}-${Date.now()}`,
      date: dateStr,
      aircraftId: matchedAircraft.id,
      b1Required: 1,
      b2Required: 1,
      catARequired: 0,
      b1Hours: 8,
      b2Hours: 8,
      catAHours: 8,
      b1TotalHours: 8,
      b2TotalHours: 8,
      catATotalHours: 0,
      priority: 'normal',
      specialSkillsRequired: [],
      boroscopeRequired: false,
      engineRunRequired: false,
    };
    setWorkRequirements((prev) => [...prev, newReq]);
    setRegistrationInput('');
    toast({ title: 'Aircraft Added', description: `${matchedAircraft.registration} (${matchedAircraft.type}) added to work requirements.` });
  };

  const removeWorkRequirement = (reqId: string) => {
    const req = workRequirements.find((r) => r.id === reqId);
    setWorkRequirements((prev) => prev.filter((r) => r.id !== reqId));
    if (req) setAssignments((prev) => prev.filter((a) => !(a.aircraftId === req.aircraftId && a.date === dateStr)));
  };

  const updateWorkRequirement = (aircraftId: string, field: 'b1Required' | 'b2Required' | 'catARequired' | 'b1Hours' | 'b2Hours' | 'catAHours' | 'b1TotalHours' | 'b2TotalHours' | 'catATotalHours', value: number) => {
    setWorkRequirements((prev) => prev.map((r) => {
      if (r.date !== dateStr || r.aircraftId !== aircraftId) return r;
      const safeValue = Math.max(0, isNaN(value) ? 0 : value);
      const updated = { ...r, [field]: safeValue };
      if (field === 'b1TotalHours') {
        updated.b1Required = calcPersonsFromHours(safeValue);
      } else if (field === 'b2TotalHours') {
        updated.b2Required = calcPersonsFromHours(safeValue);
      } else if (field === 'catATotalHours') {
        updated.catARequired = calcPersonsFromHours(safeValue);
      }
      return updated;
    }));
  };

  const updatePriority = (reqId: string, priority: Priority) => {
    setWorkRequirements((prev) => prev.map((r) => (r.id === reqId ? { ...r, priority } : r)));
  };

  const toggleRequiredSkill = (reqId: string, skill: SpecialSkill) => {
    setWorkRequirements((prev) => prev.map((r) => {
      if (r.id !== reqId) return r;
      const currentSkills = r.specialSkillsRequired || [];
      const hasSkill = currentSkills.includes(skill);
      return { ...r, specialSkillsRequired: hasSkill ? currentSkills.filter((s) => s !== skill) : [...currentSkills, skill] };
    }));
  };

  const toggleBoroscope = (reqId: string) => {
    setWorkRequirements((prev) => prev.map((r) => 
      r.id === reqId ? { ...r, boroscopeRequired: !r.boroscopeRequired } : r
    ));
  };

  const toggleEngineRun = (reqId: string) => {
    setWorkRequirements((prev) => prev.map((r) => 
      r.id === reqId ? { ...r, engineRunRequired: !r.engineRunRequired } : r
    ));
  };

  const canAssign = (employee: typeof employees[0], ac: Aircraft, role: 'B1' | 'B2' | 'Cat A/Helper'): boolean => {
    if (employee.role === 'PM' || employee.role === 'PS') return false;
    if (role === 'Cat A/Helper') {
      return true;
    }
    // Find skill using compatibility rules (A320 NEO can work on A321RR, etc.)
    const skill = employee.skills.find((s) => canWorkOnAircraft(s.aircraftType, ac.type));
    if (!skill || !skill.license) return false;
    if (role === 'B1' && skill.license !== 'B1' && skill.license !== 'B1/2') return false;
    if (role === 'B2' && skill.license !== 'B2' && skill.license !== 'B1/2') return false;
    return true;
  };

  const hasSpecialSkill = (employee: typeof employees[0], skill: SpecialSkill): boolean => {
    return employee.certifications.some(cert => cert.toLowerCase().includes(skill.toLowerCase()));
  };

  const countMatchingSkills = (employee: typeof employees[0], requiredSkills: SpecialSkill[]): number => {
    return requiredSkills.filter(skill => hasSpecialSkill(employee, skill)).length;
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getEmployeeGrade = (emp: typeof employees[0]): number => {
    return emp.grade || 0;
  };

  const isB12License = (emp: typeof employees[0], aircraftType: string): boolean => {
    const skill = emp.skills.find(s => canWorkOnAircraft(s.aircraftType, aircraftType));
    return skill?.license === 'B1/2';
  };

  const isSeniorEngineer = (emp: typeof employees[0]): boolean => {
    return emp.role === 'SrEng';
  };

  const isCatAOnly = (emp: typeof employees[0]): boolean => {
    return emp.skills.length > 0 && emp.skills.every(s => s.license === 'A');
  };

  const clearAllAssignments = () => {
    setAssignments(prev => prev.filter(a => a.date !== dateStr));
    toast({ title: 'Assignments Cleared', description: `All assignments for ${format(selectedDate, 'MMM d, yyyy')} have been cleared.` });
  };

  const runAutoAssignment = () => {
    const newAssignments: Assignment[] = [];
    const employeeAssignmentCount: Record<string, number> = {};
    const seAircraftCount: Record<string, { count: number; types: string[] }> = {};
    const sortedRequirements = [...todaysRequirements].sort((a, b) => PRIORITY_CONFIG[a.priority || 'normal'].order - PRIORITY_CONFIG[b.priority || 'normal'].order);

    const isAssignedAnywhere = (empId: string) => newAssignments.some(a => a.employeeId === empId);

    const seEmployees = onDutyEmployees.filter(emp => isSeniorEngineer(emp));
    const nonSeEmployees = onDutyEmployees.filter(emp => !isSeniorEngineer(emp) && !isCatAOnly(emp));
    const catAEmployees = onDutyEmployees.filter(emp => isCatAOnly(emp));

    for (const req of sortedRequirements) {
      const ac = aircraft.find(a => a.id === req.aircraftId);
      if (!ac) continue;

      const existingManual = todaysAssignments.filter(a => a.aircraftId === req.aircraftId && a.isManualOverride);
      existingManual.forEach(a => {
        employeeAssignmentCount[a.employeeId] = (employeeAssignmentCount[a.employeeId] || 0) + 1;
        newAssignments.push(a);
      });

      const b1Manual = existingManual.filter(a => a.role === 'B1').length;
      const b2Manual = existingManual.filter(a => a.role === 'B2').length;
      let b1Needed = Math.max(0, req.b1Required - b1Manual);
      let b2Needed = Math.max(0, req.b2Required - b2Manual);

      const requiredSkills = req.specialSkillsRequired || [];

      const eligibleSE_B1 = shuffleArray(seEmployees.filter(emp => {
        if (!canAssign(emp, ac, 'B1')) return false;
        const seData = seAircraftCount[emp.id];
        if (!seData) return true;
        if (seData.count >= 2) return false;
        if (seData.count === 1 && !seData.types.includes(ac.type)) return false;
        return true;
      })).sort((a, b) => {
        const aSkills = countMatchingSkills(a, requiredSkills);
        const bSkills = countMatchingSkills(b, requiredSkills);
        if (aSkills !== bSkills) return bSkills - aSkills;
        const aGrade = getEmployeeGrade(a);
        const bGrade = getEmployeeGrade(b);
        if (aGrade !== bGrade) return bGrade - aGrade;
        return (seAircraftCount[a.id]?.count || 0) - (seAircraftCount[b.id]?.count || 0);
      });

      for (let i = 0; i < b1Needed && i < eligibleSE_B1.length; i++) {
        const emp = eligibleSE_B1[i];
        newAssignments.push({ id: `assign-${emp.id}-${ac.id}-${dateStr}-B1`, date: dateStr, aircraftId: ac.id, employeeId: emp.id, role: 'B1', isManualOverride: false });
        employeeAssignmentCount[emp.id] = (employeeAssignmentCount[emp.id] || 0) + 1;
        if (!seAircraftCount[emp.id]) seAircraftCount[emp.id] = { count: 0, types: [] };
        seAircraftCount[emp.id].count++;
        if (!seAircraftCount[emp.id].types.includes(ac.type)) seAircraftCount[emp.id].types.push(ac.type);
        b1Needed--;
      }

      const eligibleSE_B2 = shuffleArray(seEmployees.filter(emp => {
        if (!canAssign(emp, ac, 'B2')) return false;
        const seData = seAircraftCount[emp.id];
        if (!seData) return true;
        if (seData.count >= 2) return false;
        if (seData.count === 1 && !seData.types.includes(ac.type)) return false;
        return true;
      })).sort((a, b) => {
        const aSkills = countMatchingSkills(a, requiredSkills);
        const bSkills = countMatchingSkills(b, requiredSkills);
        if (aSkills !== bSkills) return bSkills - aSkills;
        const aGrade = getEmployeeGrade(a);
        const bGrade = getEmployeeGrade(b);
        if (aGrade !== bGrade) return bGrade - aGrade;
        return (seAircraftCount[a.id]?.count || 0) - (seAircraftCount[b.id]?.count || 0);
      });

      for (let i = 0; i < b2Needed && i < eligibleSE_B2.length; i++) {
        const emp = eligibleSE_B2[i];
        newAssignments.push({ id: `assign-${emp.id}-${ac.id}-${dateStr}-B2`, date: dateStr, aircraftId: ac.id, employeeId: emp.id, role: 'B2', isManualOverride: false });
        employeeAssignmentCount[emp.id] = (employeeAssignmentCount[emp.id] || 0) + 1;
        if (!seAircraftCount[emp.id]) seAircraftCount[emp.id] = { count: 0, types: [] };
        seAircraftCount[emp.id].count++;
        if (!seAircraftCount[emp.id].types.includes(ac.type)) seAircraftCount[emp.id].types.push(ac.type);
        b2Needed--;
      }
    }

    for (const req of sortedRequirements) {
      const ac = aircraft.find(a => a.id === req.aircraftId);
      if (!ac) continue;

      const isAssignedToThisAircraft = (empId: string) => newAssignments.some(a => a.employeeId === empId && a.aircraftId === ac.id);
      const requiredSkills = req.specialSkillsRequired || [];

      const currentB1 = newAssignments.filter(a => a.aircraftId === ac.id && a.role === 'B1').length;
      const currentB2 = newAssignments.filter(a => a.aircraftId === ac.id && a.role === 'B2').length;
      let b1Needed = Math.max(0, req.b1Required - currentB1);
      let b2Needed = Math.max(0, req.b2Required - currentB2);

      const eligibleB1 = shuffleArray(nonSeEmployees.filter(emp => 
        !isAssignedAnywhere(emp.id) && canAssign(emp, ac, 'B1') && !isCatAOnly(emp)
      )).sort((a, b) => {
        const aB12 = isB12License(a, ac.type) ? 1 : 0;
        const bB12 = isB12License(b, ac.type) ? 1 : 0;
        if (aB12 !== bB12) return bB12 - aB12;
        const aGrade = getEmployeeGrade(a);
        const bGrade = getEmployeeGrade(b);
        if (aGrade !== bGrade) return bGrade - aGrade;
        const aSkills = countMatchingSkills(a, requiredSkills);
        const bSkills = countMatchingSkills(b, requiredSkills);
        return bSkills - aSkills;
      });

      for (let i = 0; i < b1Needed && i < eligibleB1.length; i++) {
        const emp = eligibleB1[i];
        newAssignments.push({ id: `assign-${emp.id}-${ac.id}-${dateStr}-B1`, date: dateStr, aircraftId: ac.id, employeeId: emp.id, role: 'B1', isManualOverride: false });
        employeeAssignmentCount[emp.id] = (employeeAssignmentCount[emp.id] || 0) + 1;
      }

      const eligibleB2 = shuffleArray(nonSeEmployees.filter(emp => 
        !isAssignedAnywhere(emp.id) && canAssign(emp, ac, 'B2') && !isCatAOnly(emp)
      )).sort((a, b) => {
        const aB12 = isB12License(a, ac.type) ? 1 : 0;
        const bB12 = isB12License(b, ac.type) ? 1 : 0;
        if (aB12 !== bB12) return bB12 - aB12;
        const aGrade = getEmployeeGrade(a);
        const bGrade = getEmployeeGrade(b);
        if (aGrade !== bGrade) return bGrade - aGrade;
        const aSkills = countMatchingSkills(a, requiredSkills);
        const bSkills = countMatchingSkills(b, requiredSkills);
        return bSkills - aSkills;
      });

      for (let i = 0; i < b2Needed && i < eligibleB2.length; i++) {
        const emp = eligibleB2[i];
        newAssignments.push({ id: `assign-${emp.id}-${ac.id}-${dateStr}-B2`, date: dateStr, aircraftId: ac.id, employeeId: emp.id, role: 'B2', isManualOverride: false });
        employeeAssignmentCount[emp.id] = (employeeAssignmentCount[emp.id] || 0) + 1;
      }
    }

    for (const req of sortedRequirements) {
      const ac = aircraft.find(a => a.id === req.aircraftId);
      if (!ac) continue;

      const catARequired = req.catARequired || 0;
      if (catARequired <= 0) continue;

      const currentCatA = newAssignments.filter(a => a.aircraftId === ac.id && a.role === 'Cat A/Helper').length;
      let catANeeded = Math.max(0, catARequired - currentCatA);

      const catAEmployees = shuffleArray(onDutyEmployees.filter(emp => 
        isCatAOnly(emp) && !newAssignments.some(a => a.employeeId === emp.id)
      ));

      for (let i = 0; i < catANeeded && i < catAEmployees.length; i++) {
        const emp = catAEmployees[i];
        newAssignments.push({ id: `assign-${emp.id}-${ac.id}-${dateStr}-CatA`, date: dateStr, aircraftId: ac.id, employeeId: emp.id, role: 'Cat A/Helper', isManualOverride: false });
        employeeAssignmentCount[emp.id] = (employeeAssignmentCount[emp.id] || 0) + 1;
        catANeeded--;
      }

      if (catANeeded > 0) {
        const remainingEligible = shuffleArray(onDutyEmployees.filter(emp => 
          !newAssignments.some(a => a.employeeId === emp.id)
        ));
        for (let i = 0; i < catANeeded && i < remainingEligible.length; i++) {
          const emp = remainingEligible[i];
          newAssignments.push({ id: `assign-${emp.id}-${ac.id}-${dateStr}-CatA`, date: dateStr, aircraftId: ac.id, employeeId: emp.id, role: 'Cat A/Helper', isManualOverride: false });
          employeeAssignmentCount[emp.id] = (employeeAssignmentCount[emp.id] || 0) + 1;
        }
      }
    }

    const totalRequired = sortedRequirements.reduce((sum, req) => sum + req.b1Required + req.b2Required + (req.catARequired || 0), 0);
    const unfilled = totalRequired - newAssignments.length;

    setAssignments(prev => [...prev.filter(a => a.date !== dateStr), ...newAssignments]);
    
    if (unfilled > 0) {
      toast({ title: 'Auto-Assignment Complete', description: `Assigned ${newAssignments.length} positions. ${unfilled} positions unfilled (not enough staff).`, variant: 'destructive' });
    } else {
      toast({ title: 'Auto-Assignment Complete', description: `Assigned ${newAssignments.length} positions to aircraft.` });
    }
  };

  const getAvailableForAircraft = (aircraftId: string, role: 'B1' | 'B2' | 'Cat A/Helper') => {
    const ac = aircraft.find(a => a.id === aircraftId);
    if (!ac) return { withCert: [], withoutCert: [] };

    const assignedEmployeeIds = todaysAssignments.map(a => a.employeeId);
    const available = onDutyEmployees.filter(emp => !assignedEmployeeIds.includes(emp.id));

    if (role === 'Cat A/Helper') {
      return { withCert: available, withoutCert: [] };
    }

    const withCert = available.filter(emp => canAssign(emp, ac, role));
    const withoutCert = available.filter(emp => !canAssign(emp, ac, role));

    return { withCert, withoutCert };
  };

  const addManualAssignment = (aircraftId: string, employeeId: string, role: 'B1' | 'B2' | 'Cat A/Helper') => {
    if (todaysAssignments.find((a) => a.aircraftId === aircraftId && a.employeeId === employeeId && a.role === role)) {
      toast({ title: 'Already Assigned', description: 'This employee is already assigned to this aircraft.', variant: 'destructive' });
      return;
    }
    const newAssignment: Assignment = {
      id: `assign-${employeeId}-${aircraftId}-${dateStr}-${role}-manual`,
      date: dateStr, aircraftId, employeeId, role, isManualOverride: true,
    };
    setAssignments((prev) => [...prev, newAssignment]);
    const emp = employees.find((e) => e.id === employeeId);
    const ac = aircraft.find((a) => a.id === aircraftId);
    toast({ title: 'Assignment Added', description: `${emp?.name} assigned to ${ac?.registration} as ${role}` });
  };

  const removeAssignment = (assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  };

  const addNewAircraft = () => {
    if (!newAircraftReg.trim()) {
      toast({ title: 'Enter Registration', description: 'Please enter an aircraft registration.', variant: 'destructive' });
      return;
    }
    if (aircraft.find(a => a.registration.toUpperCase() === newAircraftReg.trim().toUpperCase())) {
      toast({ title: 'Already Exists', description: 'This registration already exists.', variant: 'destructive' });
      return;
    }
    const newAc: Aircraft = {
      id: `ac-${Date.now()}`,
      registration: newAircraftReg.trim().toUpperCase(),
      type: newAircraftType,
      company: newAircraftCompany,
    };
    setAircraft(prev => [...prev, newAc]);
    setShowAddAircraft(false);
    setNewAircraftReg('');
    toast({ title: 'Aircraft Added', description: `${newAc.registration} (${newAc.type}) added to fleet.` });
  };

  const confirmRemoveAircraft = () => {
    if (!aircraftToDelete) return;
    setAircraft(prev => prev.filter(a => a.id !== aircraftToDelete.id));
    setWorkRequirements(prev => prev.filter(r => r.aircraftId !== aircraftToDelete.id));
    setAssignments(prev => prev.filter(a => a.aircraftId !== aircraftToDelete.id));
    toast({ title: 'Aircraft Removed', description: `${aircraftToDelete.registration} removed from fleet.` });
    setAircraftToDelete(null);
  };

  const getAssignmentStats = () => {
    let totalRequired = 0, totalAssigned = 0, unfilled = 0, totalHours = 0;
    todaysRequirements.forEach((req) => {
      const reqTotal = req.b1Required + req.b2Required + (req.catARequired || 0);
      const assigned = todaysAssignments.filter((a) => a.aircraftId === req.aircraftId).length;
      totalRequired += reqTotal;
      totalAssigned += assigned;
      if (assigned < reqTotal) unfilled += reqTotal - assigned;
      // Calculate hours
      const b1Assigned = todaysAssignments.filter((a) => a.aircraftId === req.aircraftId && a.role === 'B1').length;
      const b2Assigned = todaysAssignments.filter((a) => a.aircraftId === req.aircraftId && a.role === 'B2').length;
      const catAAssigned = todaysAssignments.filter((a) => a.aircraftId === req.aircraftId && a.role === 'Cat A/Helper').length;
      totalHours += b1Assigned * (req.b1Hours || 8) + b2Assigned * (req.b2Hours || 8) + catAAssigned * (req.catAHours || 8);
    });
    return { totalRequired, totalAssigned, unfilled, onDuty: onDutyEmployees.length, totalHours };
  };

  const stats = getAssignmentStats();

  const printAssignments = () => {
    const printContent = `
      <!DOCTYPE html><html><head><title>Daily Assignments - ${format(selectedDate, 'MMMM d, yyyy')}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}h1{font-size:24px}h2{font-size:14px;color:#666}.aircraft{border:1px solid #ddd;margin-bottom:15px;padding:15px;border-radius:8px}.aircraft-header{font-size:18px;font-weight:bold}.role-section{margin:10px 0}.role-title{font-weight:bold;font-size:12px;color:#444}.employee{padding:4px 8px;background:#f5f5f5;margin:3px 0;border-radius:4px;font-size:13px}.skills{font-size:11px;color:#666;margin-top:5px}.hours{font-size:10px;color:#888}</style></head>
      <body><h1>AeroStaff - Daily Assignments</h1><h2>${format(selectedDate, 'EEEE, MMMM d, yyyy')}</h2>
      ${todaysRequirements.map((req) => {
        const ac = aircraft.find((a) => a.id === req.aircraftId);
        if (!ac) return '';
        const acAssignments = todaysAssignments.filter((a) => a.aircraftId === req.aircraftId);
        const b1 = acAssignments.filter((a) => a.role === 'B1');
        const b2 = acAssignments.filter((a) => a.role === 'B2');
        const catA = acAssignments.filter((a) => a.role === 'Cat A/Helper');
        const skills = (req.specialSkillsRequired || []).map(s => SKILL_LABELS[s].label).join(', ');
        return `<div class="aircraft"><div class="aircraft-header">${ac.registration} (${ac.type}) - ${PRIORITY_CONFIG[req.priority].label}</div>
          ${skills ? `<div class="skills">Required: ${skills}</div>` : ''}
          <div class="role-section"><div class="role-title">B1 (${b1.length}/${req.b1Required}) <span class="hours">${req.b1Hours || 8}h each</span></div>${b1.map((a) => { const emp = employees.find((e) => e.id === a.employeeId); return `<div class="employee">${emp?.name} (${emp?.initials})</div>`; }).join('')}</div>
          <div class="role-section"><div class="role-title">B2 (${b2.length}/${req.b2Required}) <span class="hours">${req.b2Hours || 8}h each</span></div>${b2.map((a) => { const emp = employees.find((e) => e.id === a.employeeId); return `<div class="employee">${emp?.name} (${emp?.initials})</div>`; }).join('')}</div>
          ${(req.catARequired || 0) > 0 ? `<div class="role-section"><div class="role-title">Cat A/Helper (${catA.length}/${req.catARequired || 0}) <span class="hours">${req.catAHours || 8}h each</span></div>${catA.map((a) => { const emp = employees.find((e) => e.id === a.employeeId); return `<div class="employee">${emp?.name} (${emp?.initials})</div>`; }).join('')}</div>` : ''}</div>`;
      }).join('')}
      <div style="margin-top:20px;padding:15px;background:#f0f0f0;border-radius:8px"><strong>Summary:</strong> ${stats.totalAssigned}/${stats.totalRequired} positions filled | ${stats.totalHours.toFixed(1)}h total | ${stats.onDuty} employees on duty</div></body></html>`;
    const printWindow = window.open('', '_blank');
    if (printWindow) { printWindow.document.write(printContent); printWindow.document.close(); printWindow.print(); }
  };

  const getAvailableForReassign = () => todaysAssignments.map((a) => ({ assignment: a, emp: employees.find((e) => e.id === a.employeeId), ac: aircraft.find((ac) => ac.id === a.aircraftId) })).filter((item) => item.emp && item.ac);

  const getUnfilledAircraft = (role: 'B1' | 'B2' | 'Cat A/Helper') => todaysRequirements.filter((req) => {
    const acAssignments = todaysAssignments.filter((a) => a.aircraftId === req.aircraftId);
    if (role === 'B1') return acAssignments.filter((a) => a.role === 'B1').length < req.b1Required;
    if (role === 'B2') return acAssignments.filter((a) => a.role === 'B2').length < req.b2Required;
    return acAssignments.filter((a) => a.role === 'Cat A/Helper').length < (req.catARequired || 0);
  });

  const executeQuickReassign = () => {
    if (!reassignEmployee || !reassignToAircraft) return;
    const existingAssignment = todaysAssignments.find((a) => a.employeeId === reassignEmployee);
    if (existingAssignment) setAssignments((prev) => prev.filter((a) => a.id !== existingAssignment.id));
    const newAssignment: Assignment = { id: `assign-${reassignEmployee}-${reassignToAircraft}-${dateStr}-${reassignRole}-quick`, date: dateStr, aircraftId: reassignToAircraft, employeeId: reassignEmployee, role: reassignRole, isManualOverride: true };
    setAssignments((prev) => [...prev, newAssignment]);
    setShowQuickReassign(false);
    setReassignEmployee('');
    setReassignToAircraft('');
    const emp = employees.find((e) => e.id === reassignEmployee);
    const targetAc = aircraft.find((a) => a.id === reassignToAircraft);
    toast({ title: 'Quick Reassignment Complete', description: `${emp?.name} moved to ${targetAc?.registration} as ${reassignRole}` });
  };

  const setAllDuty = (onDuty: boolean) => {
    const newStatuses = employees.map((emp) => ({ date: dateStr, employeeId: emp.id, onDuty }));
    setDutyStatuses((prev) => [...prev.filter((d) => d.date !== dateStr), ...newStatuses]);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="aerostaff-page">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight" data-testid="text-app-title">AeroStaff v4.0</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HardDrive className="w-3 h-3" /> Local Storage
              <span>•</span>
              Aircraft Maintenance Staffing
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(subDays(selectedDate, 1))} data-testid="button-prev-day">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm font-medium" data-testid="text-selected-date">{format(selectedDate, 'EEE, MMM d, yyyy')}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(addDays(selectedDate, 1))} data-testid="button-next-day">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={clearAllAssignments} className="text-destructive border-destructive/50 hover:bg-destructive/10" data-testid="button-clear-all">
            <Trash2 className="h-4 w-4 mr-2" /> Clear All
          </Button>
          <Button onClick={runAutoAssignment} className="bg-primary" data-testid="button-auto-assign">
            <Play className="h-4 w-4 mr-2" /> Auto-Assign
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 border-sky-200" data-testid="card-stat-on-duty">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-sky-600">On Duty</p><p className="text-3xl font-display font-bold text-sky-700">{stats.onDuty}</p></div>
              <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center"><Users className="w-6 h-6 text-sky-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200" data-testid="card-stat-required">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-violet-600">Positions Required</p><p className="text-3xl font-display font-bold text-violet-700">{stats.totalRequired}</p></div>
              <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center"><ClipboardList className="w-6 h-6 text-violet-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200" data-testid="card-stat-assigned">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-emerald-600">Assigned</p><p className="text-3xl font-display font-bold text-emerald-700">{stats.totalAssigned}</p></div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center"><Check className="w-6 h-6 text-emerald-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border", stats.unfilled > 0 ? "bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200" : "bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/30 dark:to-gray-950/30 border-slate-200")} data-testid="card-stat-unfilled">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className={cn("text-sm", stats.unfilled > 0 ? "text-red-600" : "text-slate-600")}>Unfilled</p><p className={cn("text-3xl font-display font-bold", stats.unfilled > 0 ? "text-red-700" : "text-slate-700")}>{stats.unfilled}</p></div>
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", stats.unfilled > 0 ? "bg-red-500/20" : "bg-slate-500/20")}><AlertTriangle className={cn("w-6 h-6", stats.unfilled > 0 ? "text-red-500" : "text-slate-500")} /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.unfilled > 0 && (
        <Card className="border-red-500/50 bg-red-50 dark:bg-red-950/20" data-testid="card-unfilled-details">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Unfilled Positions - Action Required</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todaysRequirements.map((req) => {
                const ac = aircraft.find((a) => a.id === req.aircraftId);
                if (!ac) return null;
                const acAssignments = todaysAssignments.filter((a) => a.aircraftId === req.aircraftId);
                const b1Missing = Math.max(0, req.b1Required - acAssignments.filter((a) => a.role === 'B1').length);
                const b2Missing = Math.max(0, req.b2Required - acAssignments.filter((a) => a.role === 'B2').length);
                if (b1Missing === 0 && b2Missing === 0) return null;
                return (
                  <div key={req.id} className="flex items-center justify-between p-2 rounded bg-white/50 dark:bg-black/20 border">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs text-white ${PRIORITY_CONFIG[req.priority].color}`}>{PRIORITY_CONFIG[req.priority].label}</Badge>
                      <span className="font-mono font-medium">{ac.registration}</span>
                      <span className="text-muted-foreground text-sm">({ac.type})</span>
                    </div>
                    <div className="flex gap-2">
                      {b1Missing > 0 && <Badge variant="destructive" className="text-xs">B1: {b1Missing} missing</Badge>}
                      {b2Missing > 0 && <Badge variant="destructive" className="text-xs">B2: {b2Missing} missing</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="assignments" data-testid="tab-assignments"><ClipboardList className="h-4 w-4 mr-2" />Assignments</TabsTrigger>
          <TabsTrigger value="duty" data-testid="tab-duty"><Calendar className="h-4 w-4 mr-2" />Duty Status</TabsTrigger>
          <TabsTrigger value="requirements" data-testid="tab-requirements"><Wrench className="h-4 w-4 mr-2" />Work Req.</TabsTrigger>
          <TabsTrigger value="employees" data-testid="tab-employees"><Users className="h-4 w-4 mr-2" />Employees</TabsTrigger>
          <TabsTrigger value="aircraft" data-testid="tab-aircraft"><Plane className="h-4 w-4 mr-2" />Aircraft</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display">Daily Assignments - {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
              <div className="flex items-center gap-2">
                <Dialog open={showQuickReassign} onOpenChange={setShowQuickReassign}>
                  <DialogTrigger asChild><Button variant="outline" size="sm" data-testid="button-quick-reassign"><ArrowRightLeft className="h-4 w-4 mr-2" />Quick Reassign</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Quick Reassign</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-sm text-muted-foreground">Move an employee to another aircraft.</p>
                      <div className="space-y-2"><Label>Employee to reassign</Label>
                        <Select value={reassignEmployee} onValueChange={setReassignEmployee}>
                          <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                          <SelectContent>{getAvailableForReassign().map(({ assignment, emp, ac }) => (<SelectItem key={assignment.id} value={emp!.id}>{emp?.name} ({emp?.initials}) - {ac?.registration} [{assignment.role}]</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>New role</Label>
                        <Select value={reassignRole} onValueChange={(v) => setReassignRole(v as 'B1' | 'B2' | 'Cat A/Helper')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="B1">B1</SelectItem><SelectItem value="B2">B2</SelectItem><SelectItem value="Cat A/Helper">Cat A/Helper</SelectItem></SelectContent></Select>
                      </div>
                      <div className="space-y-2"><Label>Move to aircraft</Label>
                        <Select value={reassignToAircraft} onValueChange={setReassignToAircraft}>
                          <SelectTrigger><SelectValue placeholder="Select aircraft" /></SelectTrigger>
                          <SelectContent>{getUnfilledAircraft(reassignRole).map((req) => { const ac = aircraft.find((a) => a.id === req.aircraftId); return (<SelectItem key={req.id} value={req.aircraftId}>{ac?.registration} ({ac?.type})</SelectItem>); })}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={executeQuickReassign} disabled={!reassignEmployee || !reassignToAircraft}>Reassign</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" onClick={printAssignments} data-testid="button-print"><Printer className="h-4 w-4 mr-2" />Print / PDF</Button>
                <Button variant="outline" size="sm" onClick={runAutoAssignment}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
              </div>
            </CardHeader>
            <CardContent>
              {todaysRequirements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No work requirements for this day.</p>
                  <p className="text-sm">Add aircraft and requirements first.</p>
                  <Button className="mt-4" onClick={() => setActiveTab('requirements')}><Plus className="w-4 h-4 mr-2" />Add Work Requirements</Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {[...todaysRequirements].sort((a, b) => PRIORITY_CONFIG[a.priority].order - PRIORITY_CONFIG[b.priority].order).map((req) => {
                    const ac = aircraft.find((a) => a.id === req.aircraftId);
                    if (!ac) return null;
                    const acAssignments = todaysAssignments.filter((a) => a.aircraftId === req.aircraftId);
                    const b1Assigned = acAssignments.filter((a) => a.role === 'B1');
                    const b2Assigned = acAssignments.filter((a) => a.role === 'B2');
                    const catAAssigned = acAssignments.filter((a) => a.role === 'Cat A/Helper');
                    const requiredSkills = req.specialSkillsRequired || [];
                    const assignedEmps = acAssignments.map((a) => employees.find((e) => e.id === a.employeeId)).filter(Boolean);
                    const coveredSkills = requiredSkills.filter((skill) => assignedEmps.some((emp) => emp && hasSpecialSkill(emp, skill)));
                    const missingSkills = requiredSkills.filter((skill) => !coveredSkills.includes(skill));
                    
                    return (
                      <div key={req.id} className={cn("p-4 rounded-lg border", req.priority === 'urgent' ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20" : req.priority === 'high' ? "border-orange-500/50 bg-orange-50/50" : "bg-muted/30")}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", req.priority === 'urgent' ? "bg-red-500/20" : req.priority === 'high' ? "bg-orange-500/20" : "bg-primary/20")}>
                              <Plane className={cn("w-5 h-5", req.priority === 'urgent' ? "text-red-500" : req.priority === 'high' ? "text-orange-500" : "text-primary")} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2"><h3 className="font-display font-semibold text-lg">{ac.registration}</h3><Badge className={`text-xs text-white ${PRIORITY_CONFIG[req.priority].color}`}>{PRIORITY_CONFIG[req.priority].label}</Badge></div>
                              <p className="text-sm text-muted-foreground">{ac.type} • {ac.company}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant={b1Assigned.length >= req.b1Required ? "default" : "destructive"} className="font-mono">B1: {b1Assigned.length}/{req.b1Required}</Badge>
                            <Badge variant={b2Assigned.length >= req.b2Required ? "default" : "destructive"} className="font-mono">B2: {b2Assigned.length}/{req.b2Required}</Badge>
                            {(req.catARequired || 0) > 0 && <Badge variant={catAAssigned.length >= (req.catARequired || 0) ? "default" : "destructive"} className="font-mono">Cat A: {catAAssigned.length}/{req.catARequired || 0}</Badge>}
                            {req.boroscopeRequired && <Badge className="bg-violet-500 text-white">Boroscope</Badge>}
                            {req.engineRunRequired && <Badge className="bg-rose-500 text-white">Engine Run</Badge>}
                          </div>
                        </div>
                        
                        {requiredSkills.length > 0 && (
                          <div className="mb-4 p-3 rounded-lg bg-muted/50 border">
                            <div className="text-xs font-medium text-muted-foreground mb-2">Required Skills</div>
                            <div className="flex flex-wrap gap-2">
                              {requiredSkills.map((skill) => {
                                const isCovered = coveredSkills.includes(skill);
                                return (
                                  <Badge key={skill} variant={isCovered ? "default" : "destructive"} className={cn("text-xs", isCovered && SKILL_LABELS[skill].color)}>
                                    {isCovered ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                                    {SKILL_LABELS[skill].label}
                                  </Badge>
                                );
                              })}
                            </div>
                            {missingSkills.length > 0 && <p className="text-xs text-destructive mt-2">Missing: {missingSkills.map(s => SKILL_LABELS[s].label).join(', ')}</p>}
                          </div>
                        )}
                        
                        <div className="grid lg:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <div className="font-medium text-sm text-blue-600">B1 Mechanics</div>
                            {b1Assigned.map((a) => { const emp = employees.find((e) => e.id === a.employeeId); const empSkills = emp ? requiredSkills.filter(s => hasSpecialSkill(emp, s)) : []; return (
                              <div key={a.id} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className="bg-blue-500">B1</Badge>
                                  <span className="font-mono text-sm">{emp?.initials}</span>
                                  <span className="text-sm">{emp?.name}</span>
                                  {empSkills.length > 0 && empSkills.map(s => <Badge key={s} variant="outline" className="text-xs">{SKILL_LABELS[s].label}</Badge>)}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => removeAssignment(a.id)}><X className="w-4 h-4" /></Button>
                              </div>
                            ); })}
                            {b1Assigned.length < req.b1Required && (
                              <Select onValueChange={(empId) => addManualAssignment(ac.id, empId, 'B1')}>
                                <SelectTrigger className="border-dashed"><SelectValue placeholder="+ Add B1 Engineer" /></SelectTrigger>
                                <SelectContent>{onDutyEmployees.filter((emp) => canAssign(emp, ac, 'B1') && !b1Assigned.some((a) => a.employeeId === emp.id)).map((emp) => (<SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.initials}) {requiredSkills.filter(s => hasSpecialSkill(emp, s)).length > 0 ? `[${requiredSkills.filter(s => hasSpecialSkill(emp, s)).map(s => SKILL_LABELS[s].label).join(', ')}]` : ''}</SelectItem>))}</SelectContent>
                              </Select>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="font-medium text-sm text-emerald-600">B2 Avionics</div>
                            {b2Assigned.map((a) => { const emp = employees.find((e) => e.id === a.employeeId); const empSkills = emp ? requiredSkills.filter(s => hasSpecialSkill(emp, s)) : []; return (
                              <div key={a.id} className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded border border-emerald-200">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className="bg-emerald-500">B2</Badge>
                                  <span className="font-mono text-sm">{emp?.initials}</span>
                                  <span className="text-sm">{emp?.name}</span>
                                  {empSkills.length > 0 && empSkills.map(s => <Badge key={s} variant="outline" className="text-xs">{SKILL_LABELS[s].label}</Badge>)}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => removeAssignment(a.id)}><X className="w-4 h-4" /></Button>
                              </div>
                            ); })}
                            {b2Assigned.length < req.b2Required && (
                              <Select onValueChange={(empId) => addManualAssignment(ac.id, empId, 'B2')}>
                                <SelectTrigger className="border-dashed"><SelectValue placeholder="+ Add B2 Engineer" /></SelectTrigger>
                                <SelectContent>{onDutyEmployees.filter((emp) => canAssign(emp, ac, 'B2') && !b2Assigned.some((a) => a.employeeId === emp.id)).map((emp) => (<SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.initials}) {requiredSkills.filter(s => hasSpecialSkill(emp, s)).length > 0 ? `[${requiredSkills.filter(s => hasSpecialSkill(emp, s)).map(s => SKILL_LABELS[s].label).join(', ')}]` : ''}</SelectItem>))}</SelectContent>
                              </Select>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="font-medium text-sm text-amber-600">Cat A / Helpers</div>
                            {catAAssigned.map((a) => { const emp = employees.find((e) => e.id === a.employeeId); const empSkills = emp ? requiredSkills.filter(s => hasSpecialSkill(emp, s)) : []; return (
                              <div key={a.id} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className="bg-amber-500">Cat A</Badge>
                                  <span className="font-mono text-sm">{emp?.initials}</span>
                                  <span className="text-sm">{emp?.name}</span>
                                  {empSkills.length > 0 && empSkills.map(s => <Badge key={s} variant="outline" className="text-xs">{SKILL_LABELS[s].label}</Badge>)}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => removeAssignment(a.id)}><X className="w-4 h-4" /></Button>
                              </div>
                            ); })}
                            {catAAssigned.length < (req.catARequired || 0) && (
                              <Select onValueChange={(empId) => addManualAssignment(ac.id, empId, 'Cat A/Helper')}>
                                <SelectTrigger className="border-dashed"><SelectValue placeholder="+ Add Cat A/Helper" /></SelectTrigger>
                                <SelectContent>{onDutyEmployees.filter((emp) => !catAAssigned.some((a) => a.employeeId === emp.id)).map((emp) => (<SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.initials}) {requiredSkills.filter(s => hasSpecialSkill(emp, s)).length > 0 ? `[${requiredSkills.filter(s => hasSpecialSkill(emp, s)).map(s => SKILL_LABELS[s].label).join(', ')}]` : ''}</SelectItem>))}</SelectContent>
                              </Select>
                            )}
                            {(req.catARequired || 0) === 0 && (
                              <div className="text-xs text-muted-foreground italic p-2">No Cat A/Helpers required. Add in Work Requirements tab.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duty" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Duty Status - {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setAllDuty(true)}>All On Duty</Button>
                <Button variant="outline" size="sm" onClick={() => setAllDuty(false)}>All Off Duty</Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">Note: PM and PS roles are excluded from auto-assignment.</p>
              <Table>
                <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Initials</TableHead><TableHead>Role</TableHead><TableHead>Department</TableHead><TableHead>Shift</TableHead><TableHead className="text-right">On Duty</TableHead></TableRow></TableHeader>
                <TableBody>
                  {employees.map((emp) => {
                    const calStatus = calendarDutyStatus.find(c => c.employeeId === emp.id);
                    const localStatus = todaysDuty.find((d) => d.employeeId === emp.id);
                    const isOnDutyVal = calStatus?.onDuty ?? localStatus?.onDuty ?? true;
                    const isExcluded = emp.role === 'PM' || emp.role === 'PS';
                    return (
                      <TableRow key={emp.id} className={cn(!isOnDutyVal && "opacity-50", isExcluded && "bg-muted/30")}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="font-mono">{emp.initials}</TableCell>
                        <TableCell><Badge variant={isExcluded ? "secondary" : "outline"}>{emp.role}{isExcluded && ' (excluded)'}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{emp.department}</TableCell>
                        <TableCell>{calStatus ? <Badge variant="secondary" className="text-xs">{calStatus.shiftCode}</Badge> : '-'}</TableCell>
                        <TableCell className="text-right"><Switch checked={isOnDutyVal} onCheckedChange={() => toggleDutyStatus(emp.id)} disabled={isExcluded} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Add Aircraft to Work Requirements</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input placeholder="Enter aircraft registration (e.g., HB-JCC)" value={registrationInput} onChange={(e) => setRegistrationInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addAircraftByRegistration()} className="max-w-xs" />
                <Button onClick={addAircraftByRegistration}><Plus className="w-4 h-4 mr-2" />Add Aircraft</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Work Requirements - {format(selectedDate, 'MMMM d, yyyy')}</CardTitle></CardHeader>
            <CardContent>
              {todaysRequirements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg"><Wrench className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>No work requirements added yet</p></div>
              ) : (
                <div className="space-y-4">
                  {todaysRequirements.map((req) => {
                    const ac = aircraft.find((a) => a.id === req.aircraftId);
                    return (
                      <div key={req.id} className={cn("p-4 border rounded-lg", req.priority === 'urgent' && "border-red-500/50 bg-red-50/30", req.priority === 'high' && "border-orange-500/50 bg-orange-50/30")}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-lg">{ac?.registration}</span>
                            <Badge variant="outline">{ac?.type}</Badge>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeWorkRequirement(req.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                        <div className="grid md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <Label className="text-xs">Priority</Label>
                            <Select value={req.priority} onValueChange={(v) => updatePriority(req.id, v as Priority)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="urgent"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" />Urgent</span></SelectItem>
                                <SelectItem value="high"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500" />High</span></SelectItem>
                                <SelectItem value="normal"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" />Normal</span></SelectItem>
                                <SelectItem value="low"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-500" />Low</span></SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-blue-600">B1 Hours</Label>
                            <div className="space-y-1">
                              <Input 
                                type="number" 
                                min="0" 
                                step="1"
                                value={req.b1TotalHours ?? req.b1Required * 8} 
                                onChange={(e) => updateWorkRequirement(req.aircraftId, 'b1TotalHours', parseFloat(e.target.value) || 0)} 
                                className="w-full"
                                placeholder="Total hours"
                              />
                              <div className="text-xs text-muted-foreground flex items-center justify-between">
                                <span>= {req.b1Required} person{req.b1Required !== 1 ? 's' : ''}</span>
                                <span className="text-blue-600 font-medium">{(req.b1TotalHours ?? req.b1Required * 8)}h</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-emerald-600">B2 Hours</Label>
                            <div className="space-y-1">
                              <Input 
                                type="number" 
                                min="0" 
                                step="1"
                                value={req.b2TotalHours ?? req.b2Required * 8} 
                                onChange={(e) => updateWorkRequirement(req.aircraftId, 'b2TotalHours', parseFloat(e.target.value) || 0)} 
                                className="w-full"
                                placeholder="Total hours"
                              />
                              <div className="text-xs text-muted-foreground flex items-center justify-between">
                                <span>= {req.b2Required} person{req.b2Required !== 1 ? 's' : ''}</span>
                                <span className="text-emerald-600 font-medium">{(req.b2TotalHours ?? req.b2Required * 8)}h</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-amber-600">Cat A Hours</Label>
                            <div className="space-y-1">
                              <Input 
                                type="number" 
                                min="0" 
                                step="1"
                                value={req.catATotalHours ?? (req.catARequired || 0) * 8} 
                                onChange={(e) => updateWorkRequirement(req.aircraftId, 'catATotalHours', parseFloat(e.target.value) || 0)} 
                                className="w-full"
                                placeholder="Total hours"
                              />
                              <div className="text-xs text-muted-foreground flex items-center justify-between">
                                <span>= {req.catARequired || 0} person{(req.catARequired || 0) !== 1 ? 's' : ''}</span>
                                <span className="text-amber-600 font-medium">{(req.catATotalHours ?? (req.catARequired || 0) * 8)}h</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mb-4">
                          <Label className="text-xs">Qualified Available</Label>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-blue-600">B1: {ac ? onDutyEmployees.filter(emp => canAssign(emp, ac, 'B1')).length : 0}</Badge>
                            <Badge variant="secondary" className="text-emerald-600">B2: {ac ? onDutyEmployees.filter(emp => canAssign(emp, ac, 'B2')).length : 0}</Badge>
                            <Badge variant="secondary" className="text-amber-600">Any: {onDutyEmployees.length}</Badge>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs mb-2 block">Special Skills Required</Label>
                          <div className="flex flex-wrap gap-3">
                            {SPECIAL_SKILLS.map((skill) => (
                              <label key={skill} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={(req.specialSkillsRequired || []).includes(skill)} onCheckedChange={() => toggleRequiredSkill(req.id, skill)} />
                                <span className="text-sm">{SKILL_LABELS[skill].label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-6 mt-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={req.boroscopeRequired || false} 
                              onCheckedChange={() => toggleBoroscope(req.id)} 
                            />
                            <span className="text-sm font-medium flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-violet-500" />
                              Boroscope Required
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={req.engineRunRequired || false} 
                              onCheckedChange={() => toggleEngineRun(req.id)} 
                            />
                            <span className="text-sm font-medium flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              Engine Run Required
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Employees ({employees.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Initials</TableHead><TableHead>Role</TableHead><TableHead>Department</TableHead><TableHead>Qualifications</TableHead><TableHead>Certifications</TableHead></TableRow></TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id} className={cn((emp.role === 'PM' || emp.role === 'PS') && "bg-muted/30")}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="font-mono">{emp.initials}</TableCell>
                      <TableCell><Badge variant={emp.role === 'PM' || emp.role === 'PS' ? "secondary" : "outline"}>{emp.role}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{emp.department}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {emp.skills.filter(s => s.license).slice(0, 6).map((skill, idx) => (
                            <Badge key={idx} variant="secondary" className={cn("text-xs", skill.license === 'B1' && "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300", skill.license === 'B2' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300", skill.license === 'B1/2' && "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300")}>
                              <span className="font-bold mr-1">{skill.aircraftType}</span>
                              <span className="opacity-70">|</span>
                              <span className="ml-1">{skill.license}</span>
                            </Badge>
                          ))}
                          {emp.skills.filter(s => s.license).length > 6 && <Badge variant="secondary" className="text-xs">+{emp.skills.filter(s => s.license).length - 6}</Badge>}
                          {emp.skills.filter(s => s.license).length === 0 && <span className="text-xs text-muted-foreground">-</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {emp.certifications.slice(0, 3).map((cert, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{cert}</Badge>
                          ))}
                          {emp.certifications.length > 3 && <Badge variant="secondary" className="text-xs">+{emp.certifications.length - 3}</Badge>}
                          {emp.certifications.length === 0 && <span className="text-xs text-muted-foreground">-</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aircraft" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Aircraft Fleet ({aircraft.length})</CardTitle>
              <Dialog open={showAddAircraft} onOpenChange={setShowAddAircraft}>
                <DialogTrigger asChild><Button data-testid="button-add-aircraft"><Plus className="w-4 h-4 mr-2" />Add Aircraft</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Aircraft</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2"><Label>Registration</Label><Input placeholder="e.g., HB-JCC" value={newAircraftReg} onChange={(e) => setNewAircraftReg(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Aircraft Type</Label>
                      <Select value={newAircraftType} onValueChange={setNewAircraftType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{AIRCRAFT_TYPES.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Company</Label>
                      <Select value={newAircraftCompany} onValueChange={setNewAircraftCompany}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="LX">LX (Swiss)</SelectItem><SelectItem value="WK">WK (Edelweiss)</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={addNewAircraft}>Add Aircraft</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Registration</TableHead><TableHead>Type</TableHead><TableHead>Company</TableHead><TableHead>Qualified B1</TableHead><TableHead>Qualified B2</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {aircraft.map((ac) => (
                    <TableRow key={ac.id}>
                      <TableCell className="font-mono font-bold">{ac.registration}</TableCell>
                      <TableCell><Badge variant="outline">{ac.type}</Badge></TableCell>
                      <TableCell>{ac.company}</TableCell>
                      <TableCell><Badge variant="secondary">{onDutyEmployees.filter((emp) => canAssign(emp, ac, 'B1')).length} available</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{onDutyEmployees.filter((emp) => canAssign(emp, ac, 'B2')).length} available</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setAircraftToDelete(ac)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Dialog open={!!aircraftToDelete} onOpenChange={() => setAircraftToDelete(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Remove Aircraft</DialogTitle></DialogHeader>
              <p className="py-4">Are you sure you want to remove <strong>{aircraftToDelete?.registration}</strong> ({aircraftToDelete?.type}) from the fleet? This will also remove all associated work requirements and assignments.</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAircraftToDelete(null)}>Cancel</Button>
                <Button variant="destructive" onClick={confirmRemoveAircraft}>Remove Aircraft</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
