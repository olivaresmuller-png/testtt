```javascript
import { useState, useMemo, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { Plus, Search, FileSpreadsheet, Trash2, Users, Briefcase, Edit2, User, Award, Percent, X, Wrench, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppStore } from '@/lib/StoreContext';
import { Department, Role, Employee, EmployeeSkill, AIRCRAFT_TYPES, SPECIAL_SKILLS, DEPARTMENTS, ROLES } from '@/lib/data';
import { EmployeeImport } from '@/components/EmployeeImport';
import { exportEmployeesToExcel } from '@/lib/excelExport';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';


const LICENSE_TYPES = ['B1', 'B2', 'B1/2', 'A'] as const;

export function EmployeesPage() {
  const { employees, addEmployee, removeEmployee, updateEmployee } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebounce(searchQuery, 150);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [editSkills, setEditSkills] = useState<EmployeeSkill[]>([]);
  const [editCertifications, setEditCertifications] = useState<string[]>([]);
  const [editRole, setEditRole] = useState<Role>('Eng');
  const [editName, setEditName] = useState('');
  const [newSkillAircraft, setNewSkillAircraft] = useState('');
  const [newSkillLicense, setNewSkillLicense] = useState<string>('B1');

  const [newEmployee, setNewEmployee] = useState({
    initials: '',
    name: '',
    department: 'S/TMBAA' as Department,
    role: 'Eng' as Role,
    grade: 100,
  });

  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'department' | 'role' | 'delete'>('department');
  const [bulkValue, setBulkValue] = useState<string>('');

  const filteredEmployees = useMemo(() => employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      emp.initials.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
    return matchesSearch && matchesDept;
  }), [employees, debouncedSearch, departmentFilter]);

  const roleOrder: Role[] = ['PM', 'PS', 'SrEng', 'Eng'];
  const groupedEmployees = useMemo(() => roleOrder.map(role => ({
    role,
    label: role === 'PM' ? 'Production Manager' : role === 'PS' ? 'Production Supervisor' : role === 'SrEng' ? 'Senior Engineer' : 'Engineer',
    employees: filteredEmployees.filter(e => e.role === role),
  })).filter(g => g.employees.length > 0), [filteredEmployees]);

  const handleAddEmployee = () => {
    addEmployee({
      ...newEmployee,
      skills: [],
      certifications: [],
    });
    setNewEmployee({
      initials: '',
      name: '',
      department: 'S/TMBAA',
      role: 'Eng',
      grade: 100,
    });
    setIsAddDialogOpen(false);
  };

  const handleUpdateGrade = (id: string, grade: number) => {
    updateEmployee(id, { grade });
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditSkills([...employee.skills]);
    setEditCertifications([...employee.certifications]);
    setEditRole(employee.role);
    setEditName(employee.name);
    setNewSkillAircraft('');
    setNewSkillLicense('B1');
    setIsEditDialogOpen(true);
  };

  const handleAddSkill = () => {
    if (!newSkillAircraft) return;
    const exists = editSkills.some(s => s.aircraftType === newSkillAircraft && s.license === newSkillLicense);
    if (!exists) {
      setEditSkills([...editSkills, { aircraftType: newSkillAircraft, license: newSkillLicense as 'B1' | 'B2' | 'B1/2' }]);
    }
    setNewSkillAircraft('');
  };

  const handleRemoveSkill = (index: number) => {
    setEditSkills(editSkills.filter((_, i) => i !== index));
  };

  const handleToggleCertification = (cert: string) => {
    if (editCertifications.includes(cert)) {
      setEditCertifications(editCertifications.filter(c => c !== cert));
    } else {
      setEditCertifications([...editCertifications, cert]);
    }
  };

  const handleSaveEdit = () => {
    if (editingEmployee) {
      updateEmployee(editingEmployee.id, {
        name: editName,
        role: editRole,
        skills: editSkills,
        certifications: editCertifications,
      });
    }
    setIsEditDialogOpen(false);
    setEditingEmployee(null);
  };

  const getRoleColor = (role: Role) => {
    switch (role) {
      case 'PM': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'PS': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'SrEng': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Eng': return 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400';
    }
  };

  const handleBulkAction = () => {
    if (bulkAction === 'department') {
      selectedEmployees.forEach(id => updateEmployee(id, { department: bulkValue as Department }));
    } else if (bulkAction === 'role') {
      selectedEmployees.forEach(id => updateEmployee(id, { role: bulkValue as Role }));
    } else if (bulkAction === 'delete') {
      selectedEmployees.forEach(id => removeEmployee(id));
    }
    setSelectedEmployees([]);
    setIsBulkDialogOpen(false);
    toast.success(`Updated ${ selectedEmployees.length } employees`);
  };

  const toggleSelection = (id: string) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id));
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground mt-1">Manage team members, skills, and qualifications</p>
        </div>

        <div className="flex items-center gap-3">
          {selectedEmployees.length > 0 && (
            <div className="flex items-center gap-2 mr-4 bg-primary/10 px-3 py-1 rounded-md">
              <span className="text-sm font-medium text-primary">{selectedEmployees.length} Selected</span>
              <Button size="sm" variant="ghost" onClick={() => { setBulkAction('department'); setIsBulkDialogOpen(true); }}>
                <Users className="w-4 h-4 mr-2" /> Dept
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setBulkAction('role'); setIsBulkDialogOpen(true); }}>
                <Briefcase className="w-4 h-4 mr-2" /> Role
              </Button>
               <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { setBulkAction('delete'); setIsBulkDialogOpen(true); }}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </div>
          )}
          <Button variant="outline" className="gap-2" onClick={() => exportEmployeesToExcel(employees)} data-testid="button-export-employees">
            <Download className="w-4 h-4" />
            Export Skills
          </Button>
          <EmployeeImport />

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-employee" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Employee
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initials">Initials</Label>
                  <Input
                    id="initials"
                    data-testid="input-initials"
                    placeholder="e.g., JAWE"
                    value={newEmployee.initials}
                    onChange={e => setNewEmployee(prev => ({ ...prev, initials: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newEmployee.role}
                    onValueChange={(v) => setNewEmployee(prev => ({ ...prev, role: v as Role }))}
                  >
                    <SelectTrigger data-testid="select-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PM">Production Manager</SelectItem>
                      <SelectItem value="PS">Production Supervisor</SelectItem>
                      <SelectItem value="SrEng">Senior Engineer</SelectItem>
                      <SelectItem value="Eng">Engineer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  data-testid="input-name"
                  placeholder="Last name, First name"
                  value={newEmployee.name}
                  onChange={e => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={newEmployee.department}
                  onValueChange={(v) => setNewEmployee(prev => ({ ...prev, department: v as Department }))}
                >
                  <SelectTrigger data-testid="select-department">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S/TMBA">S/TMBA</SelectItem>
                    <SelectItem value="S/TMBAA">S/TMBAA</SelectItem>
                    <SelectItem value="S/TMBAB">S/TMBAB</SelectItem>
                    <SelectItem value="S/TMBAC">S/TMBAC</SelectItem>
                    <SelectItem value="S/TMBAD">S/TMBAD</SelectItem>
                    <SelectItem value="S/TMBB">S/TMBB</SelectItem>
                    <SelectItem value="S/TMBBA">S/TMBBA</SelectItem>
                    <SelectItem value="S/TMBBB">S/TMBBB</SelectItem>
                    <SelectItem value="S/TMBBC">S/TMBBC</SelectItem>
                    <SelectItem value="S/TMBBD">S/TMBBD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Grade: {newEmployee.grade}%</Label>
                <Slider
                  data-testid="slider-grade"
                  value={[newEmployee.grade]}
                  onValueChange={([v]) => setNewEmployee(prev => ({ ...prev, grade: v }))}
                  min={0}
                  max={100}
                  step={10}
                />
              </div>

              <Button onClick={handleAddEmployee} className="w-full" data-testid="button-confirm-add">
                Add Employee
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-employees"
            placeholder="Search by name or initials..."
            className="pl-10"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-department">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="S/TMBA">S/TMBA</SelectItem>
            <SelectItem value="S/TMBAA">S/TMBAA</SelectItem>
            <SelectItem value="S/TMBAB">S/TMBAB</SelectItem>
            <SelectItem value="S/TMBAC">S/TMBAC</SelectItem>
            <SelectItem value="S/TMBAD">S/TMBAD</SelectItem>
            <SelectItem value="S/TMBB">S/TMBB</SelectItem>
            <SelectItem value="S/TMBBA">S/TMBBA</SelectItem>
            <SelectItem value="S/TMBBB">S/TMBBB</SelectItem>
            <SelectItem value="S/TMBBC">S/TMBBC</SelectItem>
            <SelectItem value="S/TMBBD">S/TMBBD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-8">
        {groupedEmployees.map(group => (
          <div key={group.role}>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="outline" className={cn("text-sm px-3 py-1", getRoleColor(group.role))}>
                {group.role}
              </Badge>
              <h2 className="font-display font-semibold text-lg">{group.label}</h2>
              <span className="text-sm text-muted-foreground">({group.employees.length})</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.employees.map(employee => (
                <Card
                  key={employee.id}
                  className="p-4 hover:shadow-md transition-shadow"
                  data-testid={`card - employee - ${ employee.id } `}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={() => toggleSelection(employee.id)}
                        className="mt-1"
                      />
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <span className="font-mono font-bold text-primary text-[10px]">{employee.initials}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{employee.name}</h3>
                        <span className="text-xs text-muted-foreground">{employee.department.replace('S/', '')}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => openEditDialog(employee)}
                        data-testid={`button - edit - ${ employee.id } `}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeEmployee(employee.id)}
                        data-testid={`button - remove - ${ employee.id } `}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Percent className="w-4 h-4" />
                        <span>Grade</span>
                      </div>
                      <div className="flex items-center gap-3 flex-1 max-w-[180px]">
                        <Slider
                          value={[employee.grade]}
                          onValueChange={([v]) => handleUpdateGrade(employee.id, v)}
                          min={0}
                          max={100}
                          step={10}
                          className="flex-1"
                          data-testid={`slider - grade - ${ employee.id } `}
                        />
                        <span className={cn(
                          "font-mono text-sm font-semibold w-10 text-right",
                          employee.grade >= 100 ? "text-success" : employee.grade === 0 ? "text-destructive" : "text-warning"
                        )}>
                          {employee.grade}%
                        </span>
                      </div>
                    </div>

                    {employee.skills.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {employee.skills.filter(s => s.license).slice(0, 5).map((skill, idx) => (
                            <Badge 
                              key={idx} 
                              variant="secondary" 
                              className={cn(
                                "text-xs",
                                skill.license === 'B1' && "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
                                skill.license === 'B2' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
                                skill.license === 'B1/2' && "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                              )}
                            >
                              <span className="font-bold">{skill.aircraftType}</span>
                              <span className="mx-0.5 opacity-50">|</span>
                              <span>{skill.license}</span>
                            </Badge>
                          ))}
                          {employee.skills.filter(s => s.license).length > 5 && (
                            <span className="text-xs text-muted-foreground ml-1">+{employee.skills.filter(s => s.license).length - 5}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {employee.certifications.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {employee.certifications.slice(0, 4).map((cert, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                              {cert}
                            </Badge>
                          ))}
                          {employee.certifications.length > 4 && (
                            <span className="text-xs text-muted-foreground ml-1">+{employee.certifications.length - 4}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <Card className="p-12 text-center">
          <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No employees found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? 'Try a different search term' : 'Add your first employee to get started'}
          </p>
        </Card>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span className="font-mono font-bold text-primary text-xs">{editingEmployee?.initials}</span>
              </div>
              <div>
                <span>Edit Skills - {editingEmployee?.name}</span>
                <p className="text-sm font-normal text-muted-foreground">{editingEmployee?.department}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Name</Label>
              <Input 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Employee name"
                data-testid="input-edit-name"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">Position</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as Role)}>
                <SelectTrigger data-testid="select-edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PM">PM - Production Manager</SelectItem>
                  <SelectItem value="PS">PS - Production Supervisor</SelectItem>
                  <SelectItem value="SrEng">SE - Senior Engineer</SelectItem>
                  <SelectItem value="Eng">Eng - Engineer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Aircraft Licenses
                </Label>
              </div>

              <div className="flex gap-2">
                <Select value={newSkillAircraft} onValueChange={setNewSkillAircraft}>
                  <SelectTrigger className="flex-1" data-testid="select-aircraft-type">
                    <SelectValue placeholder="Select aircraft type" />
                  </SelectTrigger>
                  <SelectContent>
                    {AIRCRAFT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newSkillLicense} onValueChange={setNewSkillLicense}>
                  <SelectTrigger className="w-24" data-testid="select-license-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LICENSE_TYPES.map(lic => (
                      <SelectItem key={lic} value={lic}>{lic}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddSkill} disabled={!newSkillAircraft} data-testid="button-add-skill">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-muted/30 rounded-lg border border-dashed">
                {editSkills.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No aircraft licenses added</span>
                ) : (
                  editSkills.map((skill, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className={cn(
                        "text-sm gap-1 pr-1",
                        skill.license === 'B1' && "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
                        skill.license === 'B2' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
                        skill.license === 'B1/2' && "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                      )}
                    >
                      <span className="font-bold">{skill.aircraftType}</span>
                      <span className="mx-0.5 opacity-50">|</span>
                      <span>{skill.license}</span>
                      <button 
                        onClick={() => handleRemoveSkill(idx)}
                        className="ml-1 hover:bg-black/10 rounded p-0.5"
                        data-testid={`button - remove - skill - ${ idx } `}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Special Skills & Certifications
              </Label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SPECIAL_SKILLS.map(skill => (
                  <div
                    key={skill}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                      editCertifications.includes(skill)
                        ? "bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700"
                        : "bg-muted/30 border-transparent hover:border-muted-foreground/20"
                    )}
                    onClick={() => handleToggleCertification(skill)}
                  >
                    <Checkbox 
                      checked={editCertifications.includes(skill)}
                      onCheckedChange={() => handleToggleCertification(skill)}
                      data-testid={`checkbox - cert - ${ skill.replace(/\s/g, '-') } `}
                    />
                    <span className="text-sm">{skill}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSaveEdit} data-testid="button-save-skills">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Action: {bulkAction === 'delete' ? 'Delete Employees' : `Change ${ bulkAction === 'department' ? 'Department' : 'Role' } `}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {bulkAction === 'delete' ? (
              <p className="text-destructive">Are you sure you want to delete {selectedEmployees.length} employees? This action cannot be undone.</p>
            ) : (
             <div className="grid gap-2">
              <Label>New {bulkAction === 'department' ? 'Department' : 'Role'}</Label>
              <Select value={bulkValue} onValueChange={setBulkValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {bulkAction === 'department' 
                    ? DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)
                    : ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)
                  }
                </SelectContent>
              </Select>
             </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>Cancel</Button>
            <Button 
              variant={bulkAction === 'delete' ? 'destructive' : 'default'}
              onClick={handleBulkAction}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
