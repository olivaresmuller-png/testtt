import { Employee, Assignment, DayAssignment, isOnDuty } from '@/lib/data';
import { differenceInDays, parseISO, addDays, format, isSameDay } from 'date-fns';

export interface AuditIssue {
    type: 'duplicate' | 'fatigue' | 'skill';
    severity: 'high' | 'medium' | 'low';
    message: string;
    employeeId: string;
    date?: string;
}

export function auditSchedule(employees: Employee[], assignments: DayAssignment[]): AuditIssue[] {
    const issues: AuditIssue[] = [];

    // Group assignments by employee
    const byEmployee: Record<string, DayAssignment[]> = {};
    assignments.forEach(a => {
        if (!byEmployee[a.employeeId]) byEmployee[a.employeeId] = [];
        byEmployee[a.employeeId].push(a);
    });

    employees.forEach(emp => {
        const empAssignments = byEmployee[emp.id] || [];

        // Sort by date
        empAssignments.sort((a, b) => a.date.localeCompare(b.date));

        // 1. Check for duplicates (same date)
        for (let i = 0; i < empAssignments.length - 1; i++) {
            if (empAssignments[i].date === empAssignments[i + 1].date) {
                issues.push({
                    type: 'duplicate',
                    severity: 'high',
                    message: `Duplicate assignment on ${empAssignments[i].date}`,
                    employeeId: emp.id,
                    date: empAssignments[i].date
                });
            }
        }

        // 2. Check for 7+ consecutive work days
        let consecutive = 0;
        for (let i = 0; i < empAssignments.length; i++) {
            const current = empAssignments[i];

            // Skip check if it's the first one, or if dates are not consecutive
            // But to be robust, we should check date continuity.
            // Simplified: just iterate chronologically. 

            if (isOnDuty(current.shiftCode)) {
                // Check if this is consecutive to the previous one
                if (i > 0) {
                    const prev = empAssignments[i - 1];
                    const diff = differenceInDays(parseISO(current.date), parseISO(prev.date));
                    if (diff === 1 && isOnDuty(prev.shiftCode)) {
                        // It is consecutive
                        // consecutive count is already tracking
                    } else if (diff > 1) {
                        consecutive = 0;
                    }
                }
                consecutive++;
            } else {
                consecutive = 0;
            }

            if (consecutive >= 7) {
                // Only add issue once per streak to avoid spam
                // We can check if the NEXT one is off or end of list
                const isStreakEnd = (i === empAssignments.length - 1) || !isOnDuty(empAssignments[i + 1].shiftCode) || differenceInDays(parseISO(empAssignments[i + 1].date), parseISO(current.date)) > 1;

                if (isStreakEnd) {
                    issues.push({
                        type: 'fatigue',
                        severity: 'medium',
                        message: `${consecutive} consecutive work days ending ${current.date}`,
                        employeeId: emp.id,
                        date: current.date
                    });
                }
            }
        }
    });

    return issues;
}
