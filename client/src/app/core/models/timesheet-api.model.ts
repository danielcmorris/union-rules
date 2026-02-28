export interface TimesheetCalcRow {
  timeSheetID: number;
  timeSheetDate: string;
  yard: string;
  tradeUnion: string;
  jobID: number;
  pMNumber: string;
  notificationNumber: string;
  crewMember: string;
  class: string;
  payType: string;
  standardTime: number;
  premiumTime: number;
  meals: number;
  subsistence: number;
  overhead: string;
  offDay: string;
  startTime: string;
  endTime: string;
  lunchTaken: number;
  lastWorkTime: string | null;
}

export interface UserApiResponse {
  internalContactsID?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  crewLevel?: string;
  [key: string]: unknown;
}

export interface TimeSheetCrewEntry {
  timeSheetCrewID: number;
  timeSheetID: number;
  timeSheetJobID: number;
  employeeID: number;
  class: string;
  startTime: string;
  endTime: string;
  lunchTaken: number;
  jobID: number;
  firstName: string;
  lastName: string;
  status: string;
  standardTime: number;
  premiumTime: number;
  meals: number;
  subsistence: number | null;
  overhead: boolean;
  offDay: boolean;
}

export interface TimeSheetEquipment {
  timeSheetEquipmentID: number;
  timeSheetJobID: number;
  stockID: number;
  hours: number;
  status: string | null;
  pPS: string;
  class: string | null;
  equipmentType: string;
}

export interface TimeSheetApiJob {
  timeSheetJobID: number;
  jobID: number;
  jobName: string;
  jobNumber: string;
  notificationNumber: string;
  status: string;
  startTime: string;
  endTime: string;
  workType: string;
  jobScope: string;
  lunchTaken: number;
  sortOrder: number;
  crew: TimeSheetCrewEntry[];
  equipment: TimeSheetEquipment[];
}

export interface TimeSheetApiResponse {
  timeSheetID: number;
  timeSheetDate: string;
  employeeID: number;
  email: string;
  firstName: string;
  lastName: string;
  shiftStart: string;
  shiftEnd: string;
  shiftHours: number;
  status: string;
  payType: string;
  yard: string;
  comments: string;
  tradeUnionID: number;
  tradeUnion: string;
  jobs: TimeSheetApiJob[];
}
