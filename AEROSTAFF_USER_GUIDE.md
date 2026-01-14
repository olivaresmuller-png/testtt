# AeroStaff User Guide
## TMBA Aircraft Maintenance Manpower Planning System

---

## Getting Started

### Accessing the App
1. Open the app URL in your browser
2. Enter the password: `aerostaff2026`
3. You'll be taken to the Dashboard

### Navigation
The sidebar on the left contains all main sections:
- **Dashboard** - Overview and statistics
- **Calendar** - Weekly shift schedule view
- **Employees** - Manage team members and their skills
- **Skills Matrix** - View all employee qualifications at a glance
- **AeroStaff** - Daily work assignments and aircraft scheduling

---

## Features

### 1. Dashboard
The Dashboard provides a quick overview of your team:
- **Total Employees** - Count of all team members
- **Active Today** - Employees on duty today
- **On Leave** - Employees currently on vacation or leave
- **Department Breakdown** - Visual chart showing employees per department
- **Shift Distribution** - Overview of current shift assignments

### 2. Calendar
The Calendar shows the weekly shift schedule for all employees.

**How to use:**
- Navigate between weeks using the arrow buttons
- Click on any cell to change an employee's shift code
- Shift codes are color-coded for quick identification

**Common Shift Codes:**
| Code | Meaning | Hours |
|------|---------|-------|
| Ea | Early Shift | 8.9h |
| La | Late Shift | 8.9h |
| M | Middle Shift | 8.9h |
| V | Vacation | 0h |
| S | Sick (with certificate) | 0h |
| - | Off Day | 0h |
| HO | Home Office | 8h |
| BT | Business Trip | 8h |
| TR | Training | 8h |

### 3. Employees
Manage your team members and their qualifications.

**Features:**
- **Add Employee** - Click the "+ Add Employee" button to create a new team member
- **Search** - Find employees by name or initials
- **Filter by Department** - Show only employees from a specific department
- **Edit Grade** - Adjust an employee's grade percentage using the slider

**Editing Employee Skills:**
1. Click the **pencil icon** (✏️) on an employee card
2. In the dialog, you can:
   - **Add Aircraft Licenses**: Select aircraft type + license type (B1/B2/B1-2) and click +
   - **Remove Licenses**: Click the X on any skill badge
   - **Toggle Special Skills**: Check/uncheck certifications
3. Click **Save Changes**

**Aircraft Types:**
- B777, A343, A220, A330 RR, A350, A320 NEO, A320 CF

**License Types:**
- **B1** - Mechanical (airframe, engines, mechanical systems)
- **B2** - Avionics (electrical, instruments, electronics)
- **B1/2** - Combined mechanical and avionics
- **A** - Line maintenance certification

**Special Skills & Certifications:**

*Boroscope Qualifications:*
- A32CFM Boro, A32PW Boro, A330RR Boro, A340 Boro, A350 Boro, A220 Boro, B777 Boro

*Run Up Qualifications:*
- A220 RU, A320 RU, A320NEO RU, A330 RU, A343 RU, A350 RU, B777 RU

*Other Special Skills:*
- FUEL TANK - Fuel tank entry certified
- Walliclean - Walliclean process certified
- Forklift - Forklift operator
- CYCLEAN - Cyclean process certified
- Cobra - Cobra equipment certified
- Cee Bee - Cee Bee process certified
- OXY Hand - Oxygen handling certified
- ENTRY - Confined space entry certified

### 4. Skills Matrix
A comprehensive grid view showing all employees and their qualifications.

**Features:**
- See at a glance which employees are qualified for which aircraft
- Filter by department
- Color-coded license types:
  - **Blue** - B1 (Mechanical)
  - **Green** - B2 (Avionics)
  - **Purple** - B1/2 (Combined)

### 5. AeroStaff (Work Assignments)
The main work planning tool for daily aircraft assignments.

**Features:**
- Select a date to view/plan assignments
- See available employees for the selected day
- View employee qualifications when assigning work
- Filter by shift type

---

## Data Management

### Export Data
To backup your data or transfer to another computer:
1. Click the **Settings** gear icon in the sidebar
2. Click **Export Data**
3. Save the JSON file to your cloud storage (Google Drive, OneDrive, Dropbox)

### Import Data
To restore data or sync from another computer:
1. Click the **Settings** gear icon
2. Click **Import Data**
3. Select the JSON backup file
4. Data will be loaded and saved automatically

### Reset to Defaults
To restore the original demo data:
1. Click the **Settings** gear icon
2. Click **Reset to Defaults**
3. Confirm the reset

**Warning:** This will delete all your changes and restore the original employee and schedule data.

---

## Syncing Between Computers

Since the app runs in your browser and stores data locally, here's how to sync between multiple computers:

1. **On Computer A (where you made changes):**
   - Export your data
   - Save the file to your cloud storage

2. **On Computer B (where you want the data):**
   - Open the app
   - Import the data file from cloud storage

**Tip:** Export regularly to keep your backup current!

---

## Tips & Best Practices

1. **Regular Backups** - Export your data at the end of each day
2. **Use Initials** - Employee initials make the calendar view easier to read
3. **Grade System** - Use the grade percentage to indicate employee experience level (100% = fully productive, 50% = half productivity, 0% = on training/not counted)
4. **Skills First** - Set up employee skills before using the AeroStaff assignment feature
5. **Color Coding** - Learn the shift colors for quick schedule reading

---

## Troubleshooting

**App not loading?**
- Clear browser cache and refresh
- Try a different browser (Chrome, Firefox, Edge recommended)

**Data lost after closing browser?**
- Data is stored in browser's localStorage
- Use Export/Import for permanent backups
- Don't use incognito/private browsing mode

**Changes not showing on GitHub Pages?**
- Wait 1-2 minutes for GitHub to deploy
- Clear browser cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

---

## Departments

The app supports the following TMBA departments:
- S/TMBA (Main)
- S/TMBAA, S/TMBAB, S/TMBAC, S/TMBAD (A-Teams)
- S/TMBB (Main B)
- S/TMBBA, S/TMBBB, S/TMBBC, S/TMBBD (B-Teams)

---

## Support

For issues or feature requests, contact your system administrator.

**App Version:** 1.0
**Last Updated:** January 2026
