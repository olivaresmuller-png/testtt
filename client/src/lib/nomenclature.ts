const NOMENCLATURE: Record<string, string> = {
  "-": "off day",
  "--": "off day Wunsch",
  "!": "Unexp. Absence",
  "..": "off day",
  "_": "School - off",
  "37": "Planning WT 37 Hrs",
  "38": "Planning WT 38 Hrs",
  "39": "Planning WT 39 Hrs",
  "40": "Planning WT 40 Hrs",
  "41": "Planning WT 41 hrs",
  "61": "Planing 61.10%",
  "65": "Planing 65%",
  "75": "Planning 75%",
  "ab": "Acc. hourly with Certificate",
  "AB": "Acc. with Certificate",
  "ac": "Accident with Cert. hourly",
  "AC": "Accident with Certificate",
  "ah": "Accident halfday",
  "AP": "Accident (PEP)",
  "aw": "Accident w/o Cert. hourly",
  "AW": "Accident without Certificate",
  "ax": "Accident halfday (1/10)",
  "AX": "Accident w/o Cert 1/5 weekly h",
  "B+": "Business Trip Request",
  "BE": "Bern",
  "BL": "Business Trip",
  "BS": "Basel",
  "bt": "Business Trip hourly",
  "BT": "Business Trip",
  "CX": "Ang. CORONA OFF",
  "ET": "Educational Trip",
  "f+": "Komp. requested",
  "F+": "Flexitime",
  "FD": "Flight Duty",
  "fl": "Halfday Komp. ex Flextime",
  "FL": "Kompensation ex Flextime",
  "FO": "Flight Duty on Weekends",
  "GA": "GATA - Office Days",
  "GE": "Geneva",
  "H+": "Home Office (Workflow)",
  "HC": "Home Office Corona",
  "hh": "Home Office halfday",
  "HO": "Home Office",
  "I+": "Home Office (Workflow)",
  "IB": "Baby Leave with Certificate",
  "ic": "Sick with Certificate hourly",
  "IC": "Sick with Certificate",
  "ID": "Ind. Schedule",
  "ih": "Sick with Certificate halfday",
  "im": "Sick halfday during pregnancy",
  "IM": "Baby Leave",
  "in": "care of child hourly",
  "IN": "Nurse of close relatives",
  "IP": "Sick (PEP)",
  "iw": "Sick w/o Certificate hourly",
  "IW": "Sick without Certificate",
  "ix": "Sick halfday (1/10)",
  "IX": "Sick w/o Cert. 1/5 weekly Hrs",
  "J": "Joker Day",
  "K%": "Compensation withdrawn",
  "k+": "Komp. requested",
  "K+": "Compensation",
  "K5": "Kader half day",
  "K8": "EMS Planning Cadre 80 %",
  "ka": "Kurzarbeit halber Tag",
  "KA": "Shorttime Work",
  "kb": "Komp. ex time bonus",
  "KB": "Kompensation ex Timebonus",
  "kh": "Komp. ex Overtime halfday",
  "KH": "",
  "KK": "Care of relatives 3d (Manager)",
  "ko": "Komp. ex Overtime hourly",
  "KO": "Kompensation ex Overtime",
  "kx": "Komp. ex Overtime 1/10 WS",
  "L+": "Applying UBU",
  "M%": "Military withdrawn",
  "M+": "Military applied",
  "MC": "Military with EO",
  "MF": "Military in France",
  "MG": "Military in Germany",
  "MW": "Military without EO",
  "MX": "Military 1/5 weekly Hrs",
  "OA": "",
  "OF": "Office Duty",
  "OG": "Office Germany",
  "p": "Planning 100 %",
  "P%": "",
  "P+": "Birth (2 Days)",
  "P1": "Pit Stop P1",
  "p2": "Planing 20%",
  "P2": "Pit Stop P2",
  "p3": "Planing 30%",
  "p4": "Planing 40%",
  "p5": "Planing 50%",
  "p6": "Planing 60%",
  "p7": "Planing 70%",
  "p8": "Planing 80%",
  "p9": "Planing 90%",
  "PB": "Birth (2 Days)",
  "PC": "Wedding (Child - 1 Day)",
  "PD": "Death (Spouse,Child,Parents) 3",
  "pe": "PEKO leave hourly",
  "PE": "PEKO - Office Days",
  "PG": "Death (In-Law,grandp.,etc) 2",
  "ph": "Paid leave halfday",
  "PH": "Moving HB >100 km 2 Days",
  "PI": "Death (In-Law, b/s.,etc) 1",
  "PK": "Baby Leave (Mutterschaftsurl)",
  "pl": "Paid leave hourly",
  "PL": "Paid Leave",
  "PM": "Moving (1 Day)",
  "PO": "Public Office",
  "PP": "Paid Leave (PEP)",
  "PQ": "Paid Quarantine",
  "PR": "Projects",
  "ps": "Paid leave Social Plan halfd.",
  "PS": "Paid Leave Social Plan",
  "pu": "PEKO leave hourly",
  "PU": "Union work - absence",
  "PV": "PL Special Vulcanic",
  "PW": "Wedding (own - 3 Days)",
  "px": "Paid leave halfday (1/10 WH)",
  "PX": "Paid Leave 1/5 weekly Hrs",
  "QA": "Quarantäne CORONA",
  "r": "EMS Planning CLA 100 %",
  "r6": "EMS Planning CLA 65 %",
  "ra": "EMS Planning CLA 100 %",
  "rb": "EMS Planning CLA 100 %",
  "rc": "EMS Planning CLA 100 %",
  "rd": "EMS Planning CLA 100 %",
  "rh": "Reduced WH (KA) 1/10 weekly Hr",
  "RH": "Reduced WH (KA) 1/5 weekly Hr",
  "S*": "School on Days off",
  "S+": "School Internal",
  "s1": "EMS Planning Hourly Paid",
  "SC": "School internal",
  "SD": "Stand By",
  "SE": "School external",
  "sh": "Shop",
  "si": "School internal hourly",
  "SI": "School internal",
  "SM": "Sales Meeting",
  "SN": "School night",
  "Sn": "School night",
  "ST": "Study Time",
  "SZ": "SZ100% Shift 5:45",
  "T": "T_EN",
  "TD": "Part Time Day",
  "TI": "Lugano",
  "TO": "Time out",
  "TR": "08:00-17:00 / SZ 8.30h",
  "tz": "",
  "TZ": "Part day off SM",
  "u+": "UL incentive 1/10 halfday",
  "U+": "UL incentive 1/5 weekly Hrs",
  "uh": "UBU Hourly",
  "UI": "Unpaid Leave/Iraq-SARS crises",
  "UL": "Unpaid Leave",
  "UM": "Unpaid Baby Leave",
  "UP": "Unpaid Leave (PEP)",
  "ux": "UBU Hourly",
  "UX": "Unpaid Leave 1/5 weekly Hrs",
  "V": "Vacation",
  "V%": "Holiday 1/5 weekly Hrs",
  "v+": "Vacation requested halfday",
  "V+": "Vacation requested",
  "V3": "53 % SZ 4:30",
  "V5": "50 % SZ 4:15",
  "V6": "60 % SZ 5:06",
  "V7": "70% SZ 5:57",
  "V8": "80 % SZ 6:48",
  "V9": "90 % SZ 7:39",
  "vh": "Vacation halfday",
  "VJ": "Vacation Jubilee",
  "vx": "Holiday 1/5 weekly Hrs halfday",
  "VX": "Holiday 1/5 weekly Hrs",
  "WA": "",
  "X": "unexpected Abs. Shorttime work",
  "XX": "Death (In-Law, b/s.,etc) 1",
  "y": "EMS Planning CLA 100 %",
  "Y": "EMS Planning Cadre 100 %",
  "Y2": "EMS Planning CLA 40 %",
  "y3": "EMS Planning CLA 40 %",
  "y4": "EMS Planning CLA 40 %",
  "y5": "EMS Planning CLA 50 %",
  "y6": "EMS Planning CLA 60 %",
  "Y6": "EMS Planning Cadre 60 %",
  "y7": "EMS Planning CLA 70 %",
  "y8": "EMS Planning CLA 80 %",
  "Y8": "EMS Planning Cadre 80 %",
  "y9": "EMS Planning CLA 90%",
  "Ya": "Cadre B-Day 100%",
  "ZH": "Outstation",
  "AF": "AOG on off days",
  "AG": "AOG Start",
  "AL": "TMB PL STV Late 13:30-22:24",
  "BH": "Home Office",
  "Ea": "TMB Ea 06:15-15:09",
  "FT": "Feiertag / Public CH",
  "La": "TMB La 14:00-22:54",
  "LA": "TMB PL Late 13:30-22:24",
  "M": "TMB Mid-shift 08:00-17:20",
  "MI": "TML Mid-shift /1h break",
  "ML": "TMB midshift 10:00-18:54",
  "O": "Büro Paul",
  "SP": "Special Day (used for PM)",
  "t2": "Classroom Training 2H",
  "t4": "Classroom Training 4H",
  "td": "",
  "++": "Off Day/ Poss. Add Day",
  "Ae": "TMB PL STV Early 05:45-14:39",
  "b+": "Home Office",
  "e": "TMB Earlyshift PM",
  "ea": "TMB ea 06:15-15:09",
  "eA": "TMB PL Early 05:45-14:39",
  "eb": "TMB ea 06:15-15:09 (50%)",
  "l": "TMB lateshift PM",
  "la": "TMB la 14:00-22:54",
  "o": "ADM Flex Early",
  "s+": "Feiertag/Public day request",
  "SW": "Stand by weekend and BH",
  "Z1": "Zusatztag Training 8.20h",
  "Z3": "TMH NS EXTRA 20:30-07:30",
  "ZE": "TML Earlyshift EXTRA",
  "ZL": "TML Lateshift EXTRA",
  "ZT": ""
};

export interface WorkTimeResult {
  abbreviation: string;
  description: string;
  grossMinutes: number;
  breakMinutes: number;
  netMinutes: number;
  netHoursDecimal: number;
}

const resultCache = new Map<string, WorkTimeResult>();

function parseTimeToMinutes(timeStr: string): number {
  const normalized = timeStr.replace(/\*/g, ':').replace(/\./g, ':');
  const parts = normalized.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
}

function parseTimeRange(text: string): number | null {
  const rangeMatch = text.match(/(\d{1,2}[.:*]\d{2})\s*-\s*(\d{1,2}[.:*]\d{2})/);
  if (!rangeMatch) return null;
  
  const startMinutes = parseTimeToMinutes(rangeMatch[1]);
  const endMinutes = parseTimeToMinutes(rangeMatch[2]);
  
  if (endMinutes < startMinutes) {
    return (24 * 60 - startMinutes) + endMinutes;
  }
  return endMinutes - startMinutes;
}

function parseFixedDuration(text: string): number | null {
  const durationMatch = text.match(/(\d+)\.(\d{2})h/);
  if (durationMatch) {
    const hours = parseInt(durationMatch[1], 10);
    const minutes = parseInt(durationMatch[2], 10);
    return hours * 60 + minutes;
  }
  
  const szMatch = text.match(/SZ\s*(\d+):(\d{2})/);
  if (szMatch) {
    const hours = parseInt(szMatch[1], 10);
    const minutes = parseInt(szMatch[2], 10);
    return hours * 60 + minutes;
  }
  
  const hourMatch = text.match(/(\d+)H$/);
  if (hourMatch) {
    return parseInt(hourMatch[1], 10) * 60;
  }
  
  return null;
}

function calculateBreakMinutes(grossMinutes: number): number {
  if (grossMinutes <= 480) return 0;
  if (grossMinutes <= 540) return 30;
  return 60;
}

export function getWorkTime(abbreviation: string): WorkTimeResult {
  if (resultCache.has(abbreviation)) {
    return resultCache.get(abbreviation)!;
  }
  
  const description = NOMENCLATURE[abbreviation] || "";
  
  let grossMinutes = 0;
  
  const rangeMinutes = parseTimeRange(description);
  if (rangeMinutes !== null) {
    grossMinutes = rangeMinutes;
  } else {
    const fixedMinutes = parseFixedDuration(description);
    if (fixedMinutes !== null) {
      grossMinutes = fixedMinutes;
    }
  }
  
  const breakMinutes = calculateBreakMinutes(grossMinutes);
  const netMinutes = Math.max(0, grossMinutes - breakMinutes);
  const netHoursDecimal = Math.round((netMinutes / 60) * 100) / 100;
  
  const result: WorkTimeResult = {
    abbreviation,
    description,
    grossMinutes,
    breakMinutes,
    netMinutes,
    netHoursDecimal
  };
  
  resultCache.set(abbreviation, result);
  return result;
}

export function getDescription(abbreviation: string): string {
  return NOMENCLATURE[abbreviation] || "";
}

export function isWorkingTime(abbreviation: string): boolean {
  const result = getWorkTime(abbreviation);
  return result.grossMinutes > 0;
}

export function getAllAbbreviations(): string[] {
  return Object.keys(NOMENCLATURE);
}

export function getNomenclatureEntries(): Array<{ code: string; description: string }> {
  return Object.entries(NOMENCLATURE).map(([code, description]) => ({
    code,
    description
  }));
}

export function formatMinutesAsTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export { NOMENCLATURE };
