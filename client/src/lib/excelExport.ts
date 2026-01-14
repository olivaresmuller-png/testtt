import * as XLSX from 'xlsx';
import { Employee, DayAssignment, AIRCRAFT_TYPES, SPECIAL_SKILLS } from '@/lib/data';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from 'date-fns';

const AIRCRAFT_COLUMNS = [
  { col: 5, aircraft: 'A220' },
  { col: 6, aircraft: 'A320 CF', hasNeo: true },
  { col: 7, aircraft: 'A330 RR' },
  { col: 8, aircraft: 'A343' },
  { col: 9, aircraft: 'A350' },
  { col: 10, aircraft: 'B777' },
];

const SKILL_COLUMNS = [
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

export function exportEmployeesToExcel(employees: Employee[]) {
  // Create header row
  const header: string[] = [];
  header[0] = 'Name';
  header[1] = 'Initials';
  header[3] = 'Position';

  AIRCRAFT_COLUMNS.forEach(c => header[c.col] = c.aircraft);
  SKILL_COLUMNS.forEach(c => header[c.col] = c.skill);

  const data: any[][] = [header];

  employees.forEach(emp => {
    const row: any[] = [];
    row[0] = emp.name;
    row[1] = emp.initials;

    // Position
    if (emp.role === 'PM') row[3] = 'PM';
    else if (emp.role === 'PS') row[3] = 'PS';
    else if (emp.role === 'SrEng') row[3] = 'SE';
    else row[3] = 'Eng'; // Or blank? Import maps '' to Eng/SrEng default? No, import maps SE->SrEng.

    if (emp.certifications.includes('GAS Mentor')) {
      row[3] += '/GAS'; // Approximate reconstruction
    }

    // Licenses
    AIRCRAFT_COLUMNS.forEach(({ col, aircraft, hasNeo }) => {
      const skill = emp.skills.find(s => s.aircraftType === aircraft);
      let cellValue = '';
      if (skill) {
        cellValue = skill.license || '';
        // Check NEO suffix
        if (hasNeo) {
          const neoSkill = emp.skills.find(s => s.aircraftType === 'A320 NEO');
          if (neoSkill && neoSkill.license === skill.license) {
            cellValue += ' NEO';
          }
        }
      }
      row[col] = cellValue;
    });

    // Skills
    SKILL_COLUMNS.forEach(({ col, skill }) => {
      if (emp.certifications.includes(skill)) {
        row[col] = 'X';
      }
    });

    data.push(row);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // Name
    { wch: 10 }, // Initials
    { wch: 5 },  // Empty
    { wch: 15 }, // Position
    { wch: 5 },  // Empty
    // Aircraft cols
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    // Skill cols...
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  XLSX.writeFile(wb, `Aerostaff_Skills_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
}
export function exportScheduleToExcel(employees: Employee[], assignments: DayAssignment[], date: Date) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days = eachDayOfInterval({ start, end });

  // Headers: Name, Dept, [Days...]
  const header = ['Name', 'Dept', ...days.map(d => format(d, 'd MMM'))];
  const data: any[][] = [header];

  employees.forEach(emp => {
    const row: any[] = [emp.name, emp.department];

    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const assignment = assignments.find(a =>
        a.employeeId === emp.id && a.date === dateStr
      );

      // If assignment exists, use code, otherwise empty
      // Could also default to '-' if that's the "standard" off code, but usually empty is cleaner
      row.push(assignment ? assignment.shiftCode : '');
    });

    data.push(row);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Auto-width for first 2 columns, fixed small width for days
  const colWidths = [
    { wch: 25 }, // Name
    { wch: 10 }, // Dept
    ...days.map(() => ({ wch: 5 })) // Days
  ];
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, `Schedule ${format(date, 'MMM yyyy')}`);
  XLSX.writeFile(wb, `Aerostaff_Schedule_${format(date, 'yyyy_MM')}.xlsx`);
}
