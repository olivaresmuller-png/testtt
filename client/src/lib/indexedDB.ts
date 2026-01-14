import { Employee, DayAssignment } from './data';

const DB_NAME = 'aerostaff_db';
const DB_VERSION = 1;
const EMPLOYEES_STORE = 'employees';
const ASSIGNMENTS_STORE = 'assignments';
const METADATA_STORE = 'metadata';

let dbInstance: IDBDatabase | null = null;

export interface StoredMetadata {
  key: string;
  value: any;
}

export async function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(EMPLOYEES_STORE)) {
        db.createObjectStore(EMPLOYEES_STORE, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(ASSIGNMENTS_STORE)) {
        const assignmentStore = db.createObjectStore(ASSIGNMENTS_STORE, { keyPath: ['date', 'employeeId'] });
        assignmentStore.createIndex('by_date', 'date', { unique: false });
        assignmentStore.createIndex('by_employee', 'employeeId', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
      }
    };
  });
}

export async function saveEmployees(employees: Employee[]): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(EMPLOYEES_STORE, 'readwrite');
  const store = tx.objectStore(EMPLOYEES_STORE);
  
  await new Promise<void>((resolve, reject) => {
    store.clear();
    employees.forEach(emp => store.put(emp));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadEmployees(): Promise<Employee[]> {
  const db = await openDatabase();
  const tx = db.transaction(EMPLOYEES_STORE, 'readonly');
  const store = tx.objectStore(EMPLOYEES_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAssignments(assignments: DayAssignment[]): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(ASSIGNMENTS_STORE, 'readwrite');
  const store = tx.objectStore(ASSIGNMENTS_STORE);
  
  await new Promise<void>((resolve, reject) => {
    store.clear();
    assignments.forEach(a => store.put(a));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAssignments(): Promise<DayAssignment[]> {
  const db = await openDatabase();
  const tx = db.transaction(ASSIGNMENTS_STORE, 'readonly');
  const store = tx.objectStore(ASSIGNMENTS_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function updateSingleAssignment(assignment: DayAssignment): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(ASSIGNMENTS_STORE, 'readwrite');
  const store = tx.objectStore(ASSIGNMENTS_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.put(assignment);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAssignmentsByDate(date: string): Promise<DayAssignment[]> {
  const db = await openDatabase();
  const tx = db.transaction(ASSIGNMENTS_STORE, 'readonly');
  const store = tx.objectStore(ASSIGNMENTS_STORE);
  const index = store.index('by_date');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll(date);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAssignmentsByEmployee(employeeId: string): Promise<DayAssignment[]> {
  const db = await openDatabase();
  const tx = db.transaction(ASSIGNMENTS_STORE, 'readonly');
  const store = tx.objectStore(ASSIGNMENTS_STORE);
  const index = store.index('by_employee');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll(employeeId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMetadata(key: string, value: any): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(METADATA_STORE, 'readwrite');
  const store = tx.objectStore(METADATA_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.put({ key, value });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadMetadata(key: string): Promise<any | null> {
  const db = await openDatabase();
  const tx = db.transaction(METADATA_STORE, 'readonly');
  const store = tx.objectStore(METADATA_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.value ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllData(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction([EMPLOYEES_STORE, ASSIGNMENTS_STORE, METADATA_STORE], 'readwrite');
  
  tx.objectStore(EMPLOYEES_STORE).clear();
  tx.objectStore(ASSIGNMENTS_STORE).clear();
  tx.objectStore(METADATA_STORE).clear();
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function hasData(): Promise<boolean> {
  try {
    const employees = await loadEmployees();
    return employees.length > 0;
  } catch {
    return false;
  }
}
