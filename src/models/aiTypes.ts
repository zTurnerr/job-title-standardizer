export interface ExperienceAiOutput {
  title: string;
  seniority_level: string;
  department: string;
  function: string;
}

export interface EducationAiOutput {
  major: string;
  degree: string;
  education: string;
}

export interface aiStandardizationTypes  {
  targets: "experience" | "education"
}