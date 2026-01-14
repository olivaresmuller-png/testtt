# AeroStaff - Power Apps + Dataverse Data Model Specification

## Overview
AeroStaff is a manpower planning application for TMBA aircraft maintenance teams managing daily shift assignments for 61 employees. This document provides the data model and business rules for rebuilding in Power Apps with Dataverse.

---

## Tables (Entities)

### 1. Employee
Primary table storing all maintenance staff information.

| Column Name | Data Type | Required | Description |
|-------------|-----------|----------|-------------|
| EmployeeId | Auto-number / GUID | Yes | Primary key |
| Initials | Text (10) | Yes | Unique 4-letter code (e.g., "THRU", "MELM") |
| FullName | Text (100) | Yes | Last name, First name format |
| Department | Choice | Yes | See Department choices below |
| Role | Choice | Yes | See Role choices below |
| Grade | Whole Number | Yes | 0-100, represents competency percentage |

**Department Choices:**
- S/TMBA (Production Manager level)
- S/TMBAA (Team A - Shift A)
- S/TMBAB (Team A - Shift B)
- S/TMBAC (Team A - Shift C)
- S/TMBAD (Team A - Shift D)
- S/TMBB (Production Supervisor level)
- S/TMBBA (Team B - Shift A)
- S/TMBBB (Team B - Shift B)
- S/TMBBC (Team B - Shift C)
- S/TMBBD (Team B - Shift D)

**Role Choices:**
- PM (Production Manager)
- PS (Production Supervisor)
- SrEng (Senior Engineer)
- Eng (Engineer)

---

### 2. AircraftType (Reference Table)
Master list of aircraft types the team maintains.

| Column Name | Data Type | Required | Description |
|-------------|-----------|----------|-------------|
| AircraftTypeId | Auto-number | Yes | Primary key |
| Code | Text (20) | Yes | Aircraft code |
| DisplayName | Text (50) | Yes | Full display name |
| IsActive | Yes/No | Yes | Active status |

**Standard Aircraft Types:**
| Code | Description |
|------|-------------|
| 777 | Boeing 777 |
| A343 | Airbus A340-300 |
| CS | Bombardier CS Series |
| A330 RR | Airbus A330 (Rolls Royce engines) |
| A350 | Airbus A350 |
| A320 NEO | Airbus A320 NEO |
| A320 CF | Airbus A320 CFM |
| A330 RU | Airbus A330 Run-Up |
| 777 RU | Boeing 777 Run-Up |
| 343 RU | A340-300 Run-Up |
| 32S RU | A320 Family Run-Up |
| 32 RU PW | A320 Pratt & Whitney Run-Up |
| CS RU | CS Series Run-Up |
| A350 RU | Airbus A350 Run-Up |

---

### 3. EmployeeSkill (Junction Table)
Links employees to their aircraft type qualifications with license levels.

| Column Name | Data Type | Required | Description |
|-------------|-----------|----------|-------------|
| EmployeeSkillId | Auto-number | Yes | Primary key |
| Employee | Lookup (Employee) | Yes | Foreign key to Employee |
| AircraftType | Lookup (AircraftType) | Yes | Foreign key to AircraftType |
| LicenseType | Choice | Yes | See License choices below |

**License Type Choices:**
| Value | Label | Color (for UI) | Description |
|-------|-------|----------------|-------------|
| B1 | B1 | Blue | Mechanical/Structural |
| B2 | B2 | Emerald/Green | Avionics/Electrical |
| B1/2 | B1/2 | Purple | Both B1 and B2 combined |
| C | C | Gray | Certifying Engineer (supervisory) |
| A | A | Gray | Category A (limited) |

**Business Rule:** Each Employee + AircraftType combination should be unique.

---

### 4. EmployeeCertification (Junction Table)
Special certifications/qualifications beyond aircraft licenses.

| Column Name | Data Type | Required | Description |
|-------------|-----------|----------|-------------|
| CertificationId | Auto-number | Yes | Primary key |
| Employee | Lookup (Employee) | Yes | Foreign key to Employee |
| CertificationType | Choice | Yes | See certification choices |

**Certification Choices:**
| Value | Description |
|-------|-------------|
| Boro ALL | Boroscope - All Types |
| Cee Bee | Cee-Bee Chemical Cleaning |
| OXY Hand | Oxygen Handling |
| FUEL TANK | Fuel Tank Entry |
| CYCLEAN | Engine Cyclean Wash |
| ENTRY | Confined Space Entry |
| 777 RU | 777 Run-Up Qualified |
| 343 RU | A343 Run-Up Qualified |
| 32S RU | A320 Family Run-Up |
| 32 RU PW | A320 P&W Run-Up |
| CS RU | CS Run-Up Qualified |
| A350 RU | A350 Run-Up Qualified |

---

### 5. ShiftCode (Reference Table)
Master list of all possible shift codes.

| Column Name | Data Type | Required | Description |
|-------------|-----------|----------|-------------|
| ShiftCodeId | Auto-number | Yes | Primary key |
| Code | Text (5) | Yes | Short code |
| Label | Text (50) | Yes | Full description |
| Hours | Decimal | Yes | Hours counted for this shift |
| Category | Choice | Yes | "Duty" or "Off" |

**Shift Codes:**

| Code | Label | Hours | Category |
|------|-------|-------|----------|
| Ea | Early | 8.9 | Duty |
| La | Late | 8.9 | Duty |
| M | Middle | 8.9 | Duty |
| Ae | Afternoon-Early | 8.9 | Duty |
| AL | Afternoon-Late | 8.9 | Duty |
| e | Extended Early | 10 | Duty |
| eA | Extended Alt | 10 | Duty |
| l | Late Extended | 10 | Duty |
| LA | Late Alt | 8.9 | Duty |
| TD | Part Time Day | 8 | Duty |
| HO | Home Office | 8 | Duty |
| BT | Business Trip | 8 | Duty |
| ET | Educational Trip | 8 | Duty |
| FD | Flight Duty | 8 | Duty |
| SI | School Internal | 8 | Duty |
| SE | School External | 8 | Duty |
| Sn | School Night | 8 | Duty |
| TR | Training | 8 | Duty |
| t4 | Training 4H | 4 | Duty |
| FT | Feiertag (Holiday) | 0 | Off |
| V | Vacation | 0 | Off |
| T | Training (Off) | 0 | Off |
| S | Sick w/ Certificate | 0 | Off |
| IC | Sick w/ Certificate | 0 | Off |
| IW | Sick w/o Certificate | 0 | Off |
| AC | Accident w/ Cert | 0 | Off |
| AW | Accident w/o Cert | 0 | Off |
| MC | Military w/ EO | 0 | Off |
| MW | Military w/o EO | 0 | Off |
| PD | Death Leave | 0 | Off |
| PG | Death (In-Law) | 0 | Off |
| PI | Death (Sibling) | 0 | Off |
| PW | Wedding Leave | 0 | Off |
| PC | Child Wedding | 0 | Off |
| PB | Birth Leave | 0 | Off |
| PH | Moving (>100km) | 0 | Off |
| PM | Moving (1 Day) | 0 | Off |
| PL | Paid Leave | 0 | Off |
| UL | Unpaid Leave | 0 | Off |
| KO | Komp. Overtime | 0 | Off |
| KB | Komp. Timebonus | 0 | Off |
| FL | Komp. Flextime | 0 | Off |
| - | Off Day | 0 | Off |
| OFF | Off Day | 0 | Off |
| ? | Unknown | 0 | Off |

---

### 6. DailyAssignment
Records each employee's shift for each day.

| Column Name | Data Type | Required | Description |
|-------------|-----------|----------|-------------|
| AssignmentId | Auto-number | Yes | Primary key |
| Employee | Lookup (Employee) | Yes | Foreign key to Employee |
| AssignmentDate | Date Only | Yes | The work date |
| ShiftCode | Lookup (ShiftCode) | Yes | Foreign key to ShiftCode |
| Notes | Text (500) | No | Optional notes |

**Business Rule:** Each Employee + AssignmentDate combination must be unique (one shift per day per employee).

---

### 7. WorkAssignment (Optional - for aircraft work tracking)
Tracks which employees are assigned to specific aircraft work.

| Column Name | Data Type | Required | Description |
|-------------|-----------|----------|-------------|
| WorkAssignmentId | Auto-number | Yes | Primary key |
| AssignmentDate | Date Only | Yes | Work date |
| AircraftType | Lookup (AircraftType) | Yes | Aircraft being worked |
| Employee | Lookup (Employee) | Yes | Assigned employee |
| Priority | Whole Number | No | Priority ranking |
| RequiredLicense | Choice | No | B1, B2, or B1/2 |

---

## Relationships Diagram

```
Employee (1) ----< (N) EmployeeSkill (N) >---- (1) AircraftType
    |
    |---< (N) EmployeeCertification
    |
    |---< (N) DailyAssignment (N) >---- (1) ShiftCode
    |
    |---< (N) WorkAssignment (N) >---- (1) AircraftType
```

---

## Business Rules & Calculations

### 1. Manhours Calculation
```
Daily Manhours = SUM(ShiftCode.Hours * (Employee.Grade / 100))
```
Only count employees where DailyAssignment.ShiftCode.Category = "Duty"

### 2. Is Employee On Duty
```
IsOnDuty = DailyAssignment.ShiftCode.Category = "Duty"
```

### 3. License Count by Aircraft Type
For a given date and aircraft type:
```
B1 Count = COUNT employees where:
  - Has DailyAssignment for date with Category = "Duty"
  - Has EmployeeSkill for AircraftType with LicenseType = "B1"

B2 Count = same logic with LicenseType = "B2"
B1/2 Count = same logic with LicenseType = "B1/2"
```

### 4. Grade Percentage Rules
- 100% = Fully qualified, counts full hours
- 50% = In training, counts half hours
- 0% = Not counted in capacity calculations (new hire/suspended)

### 5. Employee Sort Order
Employees should display in this predefined order (for consistent UI):
```
THRU, MELM, YCCR, TIMJ, HUAB, YYRJ, MECU, LECN, LCLE, HUDM,
ARUZ, KRZE, LSIE, AAUL, WINY, SOER, ERIZ, BHAE, DALL, GBRU,
LUPR, RREN, GNET, TOKR, COSM, FILM, PAAO, LUCP, MF, NATS,
MZIM, TIML, OLCR, WEZE, JAWE, KRAF, RUAC, SAEF, LABB, RDAR,
ARNG, MCOS, THNA, JUTI, GERO, MURB, BOGO, EGGL, RULO, RPAS,
DMIA, ENRL, ATET, DETH, POCS, YCEA, FREY, GANT, GUIM, OLSE,
TOKA, ZIMM, BATT, SPEC, THAN, MIES, BONO, FILI, GISL, DACO
```
Store as SortOrder field (Whole Number) on Employee table.

---

## Views to Create

### 1. Active Employees by Department
Group employees by Department, show Grade and Skill count.

### 2. Daily Roster
For selected date, show all employees with their ShiftCode, highlight who is On Duty.

### 3. Weekly Calendar View
7-day view showing each employee's shifts for the week.

### 4. License Coverage by Aircraft
For selected date, show count of B1/B2/B1-2 licenses available per aircraft type.

### 5. Employees Off Today
Quick view of all employees with ShiftCode.Category = "Off" for today.

---

## Power Apps Screen Suggestions

1. **Dashboard** - Daily stats: on-duty count, manhours, license coverage
2. **Calendar** - Weekly shift view with date picker
3. **Employees** - Employee list with skills and grade management
4. **Daily Roster** - Detailed shift assignments for selected day
5. **Skills Matrix** - Grid showing all employees vs all aircraft types

---

## Data Import Notes

The initial employee data includes 61 employees with:
- Pre-defined skills and certifications
- Department assignments
- Role assignments
- Grade percentages

You can import the employee data from the React app's `client/src/lib/data.ts` file.

---

## Calendar Integration

The shift assignments are typically imported from a master scheduling system (CSV format with columns):
```
Employee Name | Jan 1 | Jan 2 | Jan 3 | ... | Dec 31
```

Each cell contains the ShiftCode for that employee on that date.

---

## Tips for Power Apps Implementation

1. **Use Choice columns** for fixed lists (Department, Role, LicenseType, Category)
2. **Use Lookup columns** for relationships between tables
3. **Create a Canvas App** for the main user interface
4. **Use Dataverse Views** for filtered data access
5. **Consider Power Automate** for:
   - Automatic shift code imports from CSV
   - Daily manhours calculations
   - Notification when license coverage is low
6. **Gallery controls** work well for employee lists with skill badges
7. **Use conditional formatting** to color-code license badges (B1=Blue, B2=Green, B1/2=Purple)
