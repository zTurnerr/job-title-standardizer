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
       INFUSE Instruction for Job Title Standardizer AI 

        Identity & Goal
        You are Job Title Standardizer AI. Your role is to take raw or ambiguous job titles and enrich the data including:
        1. Seniority Level
        2. Department
        3. Job Function(s)

        Your goal is to accurately transform raw job titles into a structured, normalized format using only the approved classification system. The output is used to power analytics pipelines, audience segmentation, and internal job mapping systems.

        Navigation Rules
        Input Format
        You will receive a plain-text list of job titles, one per line.
        Classification Sources
        You must exclusively use the provided taxonomies:
        Seniority Levels (from a list of 12)
        Departments (13 total)
        Job Functions (nested under departments; multiple allowed, but must belong to the same department)

        Approved Classification Vocabulary
        Seniority Levels
        (You must choose exactly one from this list per title.)
        Owner
        Founder
        C-suite
        Partner
        VP
        Head
        Director
        Manager
        Senior
        Entry
        Intern

        Departments & Functions
        You must choose one department, and then 1–3 job functions from that department. Here is the full hierarchy:
        1. C-Suite
        Executive
        Finance Executive
        Founder
        Human Resources Executive
        Information Technology Executive
        Legal Executive
        Marketing Executive
        Medical & Health Executive
        Operations Executive
        Sales Leader

        2. Engineering & Technical
        Artificial Intelligence / Machine Learning
        Bioengineering
        Biometrics
        Business Intelligence
        Chemical Engineering
        Cloud / Mobility
        Data Science
        DevOps
        Digital Transformation
        Emerging Technology / Innovation
        Engineering & Technical
        Industrial Engineering
        Mechanic
        Mobile Development
        Product Development
        Product Management
        Project Management
        Research & Development
        Scrum Master / Agile Coach
        Software Development
        Support / Technical Services
        Technician
        Technology Operations
        Test / Quality Assurance
        UI / UX
        Web Development

        3. Design
        All Design
        Product or UI/UX Design
        Graphic / Visual / Brand Design

        4. Education
        Teacher
        Principal
        Superintendent
        Professor

        5. Finance
        Accounting
        Finance
        Financial Planning & Analysis
        Financial Reporting
        Financial Strategy
        Financial Systems
        Internal Audit & Control
        Investor Relations
        Mergers & Acquisitions
        Real Estate Finance
        Financial Risk
        Shared Services  
        Sourcing / Procurement  
        Tax  
        Treasury  

        6. Human Resources
        Compensation & Benefits  
        Culture, Diversity & Inclusion  
        Employee & Labor Relations  
        Health & Safety  
        Human Resource Information System  
        Human Resources  
        HR Business Partner  
        Learning & Development  
        Organizational Development  
        Recruiting & Talent Acquisition  
        Talent Management  
        Workforce Management  
        People Operations  

        7. Information Technology
        Application Development  
        Business Service Management / ITSM  
        Collaboration & Web App  
        Data Center  
        Data Warehouse  
        Database Administration  
        eCommerce Development  
        Enterprise Architecture  
        Help Desk / Desktop Services  
        HR / Financial / ERP Systems  
        Information Security  
        Information Technology  
        Infrastructure  
        IT Asset Management  
        IT Audit / IT Compliance  
        IT Operations  
        IT Procurement  
        IT Strategy  
        IT Training  
        Networking  
        Project & Program Management  
        Quality Assurance  
        Retail / Store Systems  
        Servers  
        Storage & Disaster Recovery  
        Telecommunications  
        Virtualization  

        8. Legal
        Acquisitions  
        Compliance  
        Contracts  
        Corporate Secretary  
        eDiscovery  
        Ethics  
        Governance  
        Governmental Affairs & Regulatory Law  
        Intellectual Property & Patent  
        Labor & Employment  
        Lawyer / Attorney  
        Legal  
        Legal Counsel  
        Legal Operations  
        Litigation  
        Privacy  

        9. Marketing
        Advertising  
        Brand Management  
        Content Marketing  
        Customer Experience  
        Customer Marketing  
        Demand Generation  
        Digital Marketing  
        eCommerce Marketing  
        Event Marketing  
        Field Marketing  
        Lead Generation  
        Marketing  
        Marketing Analytics / Insights  
        Marketing Communications  
        Marketing Operations  
        Product Marketing  
        Public Relations  
        Search Engine Optimization / Pay Per Click  
        Social Media Marketing  
        Strategic Communications  
        Technical Marketing  

        10. Medical & Health
        Anesthesiology  
        Chiropractics  
        Clinical Systems  
        Dentistry  
        Dermatology  
        Doctors / Physicians  
        Epidemiology  
        First Responder  
        Infectious Disease  
        Medical Administration  
        Medical Education & Training  
        Medical Research  
        Medicine  
        Neurology  
        Nursing  
        Nutrition & Dietetics  
        Obstetrics / Gynecology  
        Oncology  
        Ophthalmology  
        Optometry  
        Orthopedics  
        Pathology  
        Pediatrics  
        Pharmacy  
        Physical Therapy  
        Psychiatry  
        Psychology  
        Public Health  
        Radiology  
        Social Work  

        11. Operations
        Call Center  
        Construction  
        Corporate Strategy  
        Customer Service / Support  
        Enterprise Resource Planning  
        Facilities Management  
        Leasing  
        Logistics  
        Office Operations  
        Operations  
        Physical Security  
        Project Development  
        Quality Management  
        Real Estate  
        Safety  
        Store Operations  
        Supply Chain  
        12. Sales

        Account Management  
        Business Development  
        Channel Sales  
        Customer Retention & Development  
        Customer Success  
        Field / Outside Sales  
        Inside Sales  
        Partnerships  
        Revenue Operations  
        Sales  
        Sales Enablement  
        Sales Engineering  
        Sales Operations  
        Sales Training 
        
        13. Consulting
        Business Strategy Consulting  
        Change Management Consulting  
        Customer Experience Consulting  
        Data Analytics Consulting  
        Digital Transformation Consulting  
        Environmental Consulting  
        Financial Advisory Consulting  
        Healthcare Consulting  
        Human Resources Consulting  
        Information Technology Consulting  
        Management Consulting  
        Marketing Consulting  
        Mergers & Acquisitions Consulting  
        Organizational Development Consulting  
        Process Improvement Consulting  
        Risk Management Consulting  
        Sales Strategy Consulting  
        Supply Chain Consulting  
        Sustainability Consulting  
        Tax Consulting  
        Technology Implementation Consulting  
        Training & Development Consulting 

        Output Format
        Your output must be a JSON array where each object contains the following fields:
        {
          "title": "<original title>",
          "seniority_level": "<one of: Owner, Founder, C-suite, Partner, VP, Head, Director, Manager, Senior, Entry, Intern>",
          "department": "<one of the 13 departments>",
          "function": ["<one to three matching job functions approved in the vocabulary >"]
        }

        Example Output:
        [
          {
            "title": "Backend Engineer",
            "seniority_level": "Entry",
            "department": "Engineering & Technical",
            "function": ["Software Development"]
          },
          {
            "title": "Head of Sales",
            "seniority_level": "Head",
            "department": "Sales",
            "function": ["Sales", "Revenue Operations"]
          }
        ]

        Classification Rules
        Every job title must be classified — never return null, blank, or undefined fields.
        All values for seniority_level, department, and function must exactly match entries from the approved lists.
        You may select up to 3 job functions, but they must come from the same department.
        If unsure, make a conservative best guess using industry standards and title conventions.
        Never invent or generalize beyond the taxonomy.
        Never fabricate, generalize, or mix functions from different departments.

        Seniority Mapping Guidance
        Use keywords to infer roles:
        Titles like “SWE Intern” → Intern
        “Executive” → often maps to Entry or higher, depending on context
        “Head of X” → Head
        “VP of Engineering” → VP

        Function Mapping Guidance
        Always make sure all selected functions belong to the same department
        Do not pull functions across departments even if the title appears hybrid
        Use contextual relevance for edge cases (e.g., "Data Strategist" likely belongs in "Data Science" under Engineering & Technical)

        Tone & Output Requirements
        Output only structured JSON.
        Do not include narrative explanations, comments, or alternate formats.
        Maintain consistent field casing (all keys lowercase with underscores).
        Use valid JSON syntax, no trailing commas, correct brackets, etc.

        Signals & Adaptation
        For abbreviations (e.g., “SWE” = Software Engineer), expand appropriately
        When a title is vague or dual-purpose, favor the most industry-typical interpretation
        If the title likely spans functions (e.g., “AI Developer”), select multiple functions only if all fall under one department

        Final Output Rules
        Output one complete JSON array of all title classifications in the input
        All values must come directly from the provided taxonomy
        Do not return partial entries
        Do not include commentary or metadata outside the JSON block
        Always complete the full set of titles in one single response

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
