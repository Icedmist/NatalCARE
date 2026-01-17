 /**
 * PROJECT: NatalCare AI - Logic Core v2
 * FILE: LogicCore.ts
 * AUTHOR: Nasir Ibrahim Imam (System Architect)
 * UPDATED: Added Offline Patient Registration & ID Generation
 */

import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid'; // Standard library for unique IDs

// 1. DATA MODELS
interface PatientProfile {
  id: string;           // UUID (Generated Offline)
  fullName: string;
  village: string;
  age: number;
  lastMenstrualPeriod: Date;
  estimatedDeliveryDate: Date; // Calculated automatically
  registeredAt: Date;
  syncStatus: 'PENDING' | 'SYNCED';
}

interface PatientVitals {
  patientId: string;    // Links vitals to the profile
  systolicBP: number;
  diastolicBP: number;
  proteinuria: number;
  fetalHeartRate: number;
  symptoms: string[];
}

interface AssessmentResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  uiColor: string;
  action: string;
  reasoning: string[];
}

// 2. REGISTRATION LOGIC (New Module)

/**
 * Calculates Estimated Delivery Date (EDD) using Naegele's Rule
 * Logic: LMP + 7 days - 3 months + 1 year
 */
function calculateEDD(lmp: Date): Date {
  const edd = new Date(lmp);
  edd.setDate(edd.getDate() + 7);
  edd.setMonth(edd.getMonth() + 9);
  return edd;
}

/**
 * Creates a new patient record entirely OFFLINE.
 * Uses UUID to ensure no ID conflicts when syncing later.
 */
export async function registerPatient(
  name: string, 
  village: string, 
  age: number, 
  lmp: string // Format: YYYY-MM-DD
): Promise<PatientProfile> {
  
  // 1. Validate Input
  if (!name || !village) throw new Error("Missing required fields");

  // 2. Generate Unique ID Locally (The "Secret Sauce" for Offline Apps)
  const offlineId = uuidv4(); 

  // 3. Compute Medical Dates
  const lmpDate = new Date(lmp);
  const calculatedEDD = calculateEDD(lmpDate);

  // 4. Create Profile Object
  const newProfile: PatientProfile = {
    id: offlineId,
    fullName: name,
    village: village,
    age: age,
    lastMenstrualPeriod: lmpDate,
    estimatedDeliveryDate: calculatedEDD,
    registeredAt: new Date(),
    syncStatus: 'PENDING' // Flags for the background sync job
  };

  // 5. Commit to Local Storage (Simulated here)
  // In reality: await Database.save('patients', newProfile);
  console.log(`User ${name} registered offline with ID: ${offlineId}`);
  
  return newProfile;
}


// 3. TRIAGE LOGIC (Existing Module)

const THRESHOLDS = {
  BP_CRITICAL_SYS: 160,
  BP_CRITICAL_DIA: 110,
  BP_HIGH_SYS: 140,
  BP_HIGH_DIA: 90,
  FHR_LOW: 110,
  FHR_HIGH: 160
};

export async function assessPatientRisk(vitals: PatientVitals): Promise<AssessmentResult> {
  let riskScore = 0;
  let reasons: string[] = [];

  // Logic: Check Hypertension
  if (vitals.systolicBP >= THRESHOLDS.BP_CRITICAL_SYS || vitals.diastolicBP >= THRESHOLDS.BP_CRITICAL_DIA) {
    riskScore += 50;
    reasons.push("Severe Hypertension detected");
  } else if (vitals.systolicBP >= THRESHOLDS.BP_HIGH_SYS || vitals.diastolicBP >= THRESHOLDS.BP_HIGH_DIA) {
    riskScore += 20;
    reasons.push("Hypertension detected");
  }

  // Logic: Check Preeclampsia
  if (riskScore >= 20 && vitals.proteinuria > 1) {
    riskScore += 40;
    reasons.push("Potential Preeclampsia (BP + Protein)");
  }

  // Logic: Check Fetal Heart Rate
  if (vitals.fetalHeartRate < THRESHOLDS.FHR_LOW || vitals.fetalHeartRate > THRESHOLDS.FHR_HIGH) {
    riskScore += 30;
    reasons.push(`Abnormal Fetal Heart Rate: ${vitals.fetalHeartRate}`);
  }

  // Generate Result
  if (riskScore >= 50) {
    return { riskLevel: 'CRITICAL', uiColor: '#FF0000', action: "EMERGENCY: TRANSPORT NOW", reasoning: reasons };
  } else if (riskScore >= 20) {
    return { riskLevel: 'HIGH', uiColor: '#FFA500', action: "REFERRAL: Monitor & Prepare", reasoning: reasons };
  } else if (riskScore >= 10) {
    return { riskLevel: 'MEDIUM', uiColor: '#FFFF00', action: "WARNING: Re-check in 4hrs", reasoning: reasons };
  } else {
    return { riskLevel: 'LOW', uiColor: '#008000', action: "STABLE", reasoning: ["Normal limits"] };
  }
}