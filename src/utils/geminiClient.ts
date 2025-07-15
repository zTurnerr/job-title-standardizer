import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config";
import { logger } from "../utils/logger";
import { JobTitle } from "../models/openaiJobTitle";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function estimateTokenCount(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.round(words / 0.75); 
}

export const geminiClient = {
  classifyJobTitles: async (jobTitles: string[]): Promise<JobTitle[]> => {
    logger.info(`Calling Gemini 1.5 Flash API to classify ${jobTitles.length} job titles...`);

    const prompt = `
       INFUSE Instructions – Job Title Standardizer AI
        Role & Goal
        You classify raw job titles into:

        seniority_level (1 of 12)

        department (1 of 13)

        function (1-3 from that department)
        Use only approved taxonomy. Output powers analytics and mapping systems.

        Input
        Plain-text list of titles, one per line.

        Taxonomies
        Seniority Levels
        Owner, Founder, C-suite, Partner, VP, Head, Director, Manager, Senior, Entry, Intern

        Departments & Functions
        (Choose 1 department and 1–3 functions from it; full list retained below)

        1. C-Suite:
        Executive, Finance Executive, Founder, Human Resources Executive, Information Technology Executive, Legal Executive, Marketing Executive, Medical & Health Executive, Operations Executive, Sales Leader

        2. Engineering & Technical:
        Artificial Intelligence / Machine Learning, Bioengineering, Biometrics, Business Intelligence, Chemical Engineering, Cloud / Mobility, Data Science, DevOps, Digital Transformation, Emerging Technology / Innovation, Engineering & Technical, Industrial Engineering, Mechanic, Mobile Development, Product Development, Product Management, Project Management, Research & Development, Scrum Master / Agile Coach, Software Development, Support / Technical Services, Technician, Technology Operations, Test / Quality Assurance, UI / UX, Web Development

        3. Design:
        All Design, Product or UI/UX Design, Graphic / Visual / Brand Design

        4. Education:
        Teacher, Principal, Superintendent, Professor

        5. Finance:
        Accounting, Finance, Financial Planning & Analysis, Financial Reporting, Financial Strategy, Financial Systems, Internal Audit & Control, Investor Relations, Mergers & Acquisitions, Real Estate Finance, Financial Risk, Shared Services, Sourcing / Procurement, Tax, Treasury

        6. Human Resources:
        Compensation & Benefits, Culture, Diversity & Inclusion, Employee & Labor Relations, Health & Safety, Human Resource Information System, Human Resources, HR Business Partner, Learning & Development, Organizational Development, Recruiting & Talent Acquisition, Talent Management, Workforce Management, People Operations

        7. Information Technology:
        Application Development, Business Service Management / ITSM, Collaboration & Web App, Data Center, Data Warehouse, Database Administration, eCommerce Development, Enterprise Architecture, Help Desk / Desktop Services, HR / Financial / ERP Systems, Information Security, Information Technology, Infrastructure, IT Asset Management, IT Audit / IT Compliance, IT Operations, IT Procurement, IT Strategy, IT Training, Networking, Project & Program Management, Quality Assurance, Retail / Store Systems, Servers, Storage & Disaster Recovery, Telecommunications, Virtualization

        8. Legal:
        Acquisitions, Compliance, Contracts, Corporate Secretary, eDiscovery, Ethics, Governance, Governmental Affairs & Regulatory Law, Intellectual Property & Patent, Labor & Employment, Lawyer / Attorney, Legal, Legal Counsel, Legal Operations, Litigation, Privacy

        9. Marketing:
        Advertising, Brand Management, Content Marketing, Customer Experience, Customer Marketing, Demand Generation, Digital Marketing, eCommerce Marketing, Event Marketing, Field Marketing, Lead Generation, Marketing, Marketing Analytics / Insights, Marketing Communications, Marketing Operations, Product Marketing, Public Relations, Search Engine Optimization / Pay Per Click, Social Media Marketing, Strategic Communications, Technical Marketing

        10. Medical & Health:
        Anesthesiology, Chiropractics, Clinical Systems, Dentistry, Dermatology, Doctors / Physicians, Epidemiology, First Responder, Infectious Disease, Medical Administration, Medical Education & Training, Medical Research, Medicine, Neurology, Nursing, Nutrition & Dietetics, Obstetrics / Gynecology, Oncology, Ophthalmology, Optometry, Orthopedics, Pathology, Pediatrics, Pharmacy, Physical Therapy, Psychiatry, Psychology, Public Health, Radiology, Social Work

        11. Operations:
        Call Center, Construction, Corporate Strategy, Customer Service / Support, Enterprise Resource Planning, Facilities Management, Leasing, Logistics, Office Operations, Operations, Physical Security, Project Development, Quality Management, Real Estate, Safety, Store Operations, Supply Chain

        12. Sales:
        Account Management, Business Development, Channel Sales, Customer Retention & Development, Customer Success, Field / Outside Sales, Inside Sales, Partnerships, Revenue Operations, Sales, Sales Enablement, Sales Engineering, Sales Operations, Sales Training

        13. Consulting:
        Business Strategy Consulting, Change Management Consulting, Customer Experience Consulting, Data Analytics Consulting, Digital Transformation Consulting, Environmental Consulting, Financial Advisory Consulting, Healthcare Consulting, Human Resources Consulting, Information Technology Consulting, Management Consulting, Marketing Consulting, Mergers & Acquisitions Consulting, Organizational Development Consulting, Process Improvement Consulting, Risk Management Consulting, Sales Strategy Consulting, Supply Chain Consulting, Sustainability Consulting, Tax Consulting, Technology Implementation Consulting, Training & Development Consulting

        Output Format
        JSON array of objects:
        [
        {
        "title": "<original title>",
        "seniority_level": "<exact match>",
        "department": "<exact match>",
        "function": ["<1–3 functions from department>"]
        }
        ]

        Rules
        Use only approved values.
        No blanks or nulls.
        Functions must be from same department.
        Infer conservatively from title conventions.
        Do not mix departments or invent new values.
        JSON only, no comments or extras

        Mapping Tips
        "SWE Intern" → Intern
        "Head of X" → Head
        "VP of Engineering" → VP
        “Data Strategist” → likely “Data Science”
        Use full expansion for abbreviations (e.g., SWE)

        Output constraints
        JSON only, no comments or extras
        All titles classified
        Valid syntax only
        One complete JSON array per response

        Job Titles to Classify:
        ${jobTitles.map((t) => `- ${t}`).join("\n")}
    `;

    let retries = 0;
    let lastResponse = "";

    while (retries < MAX_RETRIES) {
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        lastResponse = text;

        logger.debug("Raw Gemini response:", text);

        const jsonStart = text.indexOf("[");
        const jsonEnd = text.lastIndexOf("]");
        const jsonText = text.slice(jsonStart, jsonEnd + 1);

        const parsed = JSON.parse(jsonText) as any[];

        const cleaned: JobTitle[] = parsed.map((item) => ({
          title: item.title,
          seniority_level: item.seniority_level,
          department: item.department,
          function: Array.isArray(item.function) ? item.function.join(", ") : item.function,
        }));

        const tokenEstimate = estimateTokenCount(prompt + "\n" + text);
        logger.info(`Estimated token usage: ${tokenEstimate}`);

        return cleaned;
      } catch (error) {
        retries++;
        logger.error(`Gemini Flash API error (attempt ${retries}):`, error);
        if (retries < MAX_RETRIES) {
          logger.info(`Retrying after ${RETRY_DELAY_MS}ms...`);
          await delay(RETRY_DELAY_MS);
        } else {
          throw new Error(`Gemini Flash failed after ${MAX_RETRIES} attempts. Last response:\n${lastResponse}`);
        }
      }
    }

    throw new Error("Unexpected error in Gemini job title classification.");
  },
};
