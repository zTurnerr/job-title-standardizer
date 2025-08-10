export interface ExperienceAiOutput {
  title: string;
  seniority_level: string;
  department: string;
  function: string;
  validationStatus?: boolean
}

export interface EducationAiOutput {
  major: string;
  degree: string;
  education: string;
  validationStatus?: boolean
}

export interface aiStandardizationTypes  {
  targets: "experience" | "education"
}