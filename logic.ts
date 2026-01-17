/**
 * PROJECT: NatalCare AI - Offline Triage Engine
 * FILE: LogicCore.ts
 * AUTHOR: Nasir Ibrahim Imam (System Architect)
 * DESCRIPTION: Core business logic for assessing maternal health risk.
 * This runs entirely on the client-side (Offline First).
 */

// 1. DATA MODELS
interface PatientVitals {
  systolicBP: number;   // mmHg
  diastolicBP: number;  // mmHg
  proteinuria: number;  // 0 to 4 (Dipstick scale)
  fetalHeartRate: number; // bpm
  gestationalAge: number; // weeks
  symptoms: string[];   // ["headache", "blurred_vision", etc]
}

interface AssessmentResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  uiColor: string;      // Hex code for UI
  action: string;       // Instruction for Midwife
  reasoning: string[];  // Explainable AI output
}

// 2. CONSTANTS (WHO GUIDELINES)
const THRESHOLDS = {
  BP_CRITICAL_SYS: 160,
  BP_CRITICAL_DIA: 110,
  BP_HIGH_SYS: 140,
  BP_HIGH_DIA: 90,
  FHR_LOW: 110,
  FHR_HIGH: 160
};

/**
 * MAIN LOGIC FUNCTION
 * Called by the React Native UI when "Analyze" is pressed.
 */
export async function assessPatientRisk(vitals: PatientVitals): Promise<AssessmentResult> {
  
  let riskScore = 0;
  let reasons: string[] = [];

  // --- STEP A: DETERMINISTIC RULES (The "Hard" Medical Logic) ---

  // Check Hypertension
  if (vitals.systolicBP >= THRESHOLDS.BP_CRITICAL_SYS || vitals.diastolicBP >= THRESHOLDS.BP_CRITICAL_DIA) {
    riskScore += 50; // Immediate Critical
    reasons.push("Severe Hypertension detected (Immediate Referral needed)");
  } else if (vitals.systolicBP >= THRESHOLDS.BP_HIGH_SYS || vitals.diastolicBP >= THRESHOLDS.BP_HIGH_DIA) {
    riskScore += 20;
    reasons.push("Hypertension detected");
  }

  // Check Preeclampsia (Hypertension + Protein)
  if (riskScore >= 20 && vitals.proteinuria > 1) {
    riskScore += 40; // Escalates to Critical
    reasons.push("Potential Preeclampsia: High BP combined with Proteinuria");
  }

  // Check Fetal Distress
  if (vitals.fetalHeartRate < THRESHOLDS.FHR_LOW || vitals.fetalHeartRate > THRESHOLDS.FHR_HIGH) {
    riskScore += 30;
    reasons.push(`Abnormal Fetal Heart Rate detected: ${vitals.fetalHeartRate} bpm`);
  }

  // --- STEP B: AI INFERENCE (The "Soft" Predictive Logic) ---
  // In MVP, we simulate the TFLite call or use a simple weighted heuristic
  // waiting for the .tflite model to load.
  try {
     const aiPrediction = await runOfflineModel(vitals); // Detailed below
     if (aiPrediction > 0.75) {
       riskScore += 15;
       reasons.push("AI Analysis: Pattern matches historical high-risk cases");
     }
  } catch (error) {
    console.log("AI Model unavailable offline, relying on heuristic rules.");
  }

  // --- STEP C: GENERATE FINAL ASSESSMENT ---
  
  if (riskScore >= 50) {
    return {
      riskLevel: 'CRITICAL',
      uiColor: '#FF0000', // RED
      action: "EMERGENCY: INITIATE TRANSPORT TO GENERAL HOSPITAL NOW.",
      reasoning: reasons
    };
  } else if (riskScore >= 20) {
    return {
      riskLevel: 'HIGH',
      uiColor: '#FFA500', // ORANGE
      action: "REFERRAL: Monitor closely and prepare for transport.",
      reasoning: reasons
    };
  } else if (riskScore >= 10) {
    return {
      riskLevel: 'MEDIUM',
      uiColor: '#FFFF00', // YELLOW
      action: "WARNING: Re-assess vitals in 4 hours.",
      reasoning: reasons
    };
  } else {
    return {
      riskLevel: 'LOW',
      uiColor: '#008000', // GREEN
      action: "STABLE: Continue routine care.",
      reasoning: ["Vitals within normal limits"]
    };
  }
}

/**
 * HELPER: Mock function for TensorFlow Lite interaction
 */
async function runOfflineModel(data: PatientVitals): Promise<number> {
  // TODO: Nasir to integrate 'react-native-fast-tflite' here
  // This logic detects subtle non-linear risks logic standard rules miss
  return 0.1; // Placeholder
}