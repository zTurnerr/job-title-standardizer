import { config } from "../config";
import { logger } from "../utils/logger";
import { ExperienceAiOutput, EducationAiOutput } from "../models/aiTypes";
// import { createGoogleGenerativeAI, google } from '@ai-sdk/google';
import { generateText } from 'ai';
import dotenv from "dotenv";
import { vertex } from '@ai-sdk/google-vertex';
import { Education } from "../models/education";
import { validateEducationStandardizationOutput, validateExperienceAiOutputStandardizerOutput } from "./AIValidator";


dotenv.config();

logger.info("IMPORTANT: GOOGLE_APPLICATION_CREDENTIALS");
logger.info(process.env.GOOGLE_APPLICATION_CREDENTIALS);

// const model = vertex('gemini-1.5-flash');
const model = vertex('gemini-2.0-flash-lite-001');


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
  classifyExperienceAiOutputs: async (jobTitles: string[]): Promise<ExperienceAiOutput[]> => {
    logger.info(`Calling Gemini via Vercel AI SDK to classify ${jobTitles.length} job titles...`);

    const prompt = `
        INFUSE Instructions - Job Title Standardizer AI
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
        (Choose 1 department and 1-3 functions from it; full list retained below)

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

        Output Format (always one array containing all the dictionairy for each of the inputs):)
        JSON array of objects:
        [
        {
        "title": "<original title>",
        "seniority_level": "<exact match>",
        "department": "<exact match>",
        "function": ["<1-3 functions from department>"]
        },
        {
        "title": "<original title>",
        "seniority_level": "<exact match>",
        "department": "<exact match>",
        "function": ["<1-3 functions from department>"]
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
        const result = await generateText({
          model,
          prompt,
        });

        const text = result.text;
        lastResponse = text;

        logger.debug("Raw Gemini response:", text);

        const jsonStart = text.indexOf("[");
        const jsonEnd = text.lastIndexOf("]");
        const jsonText = text.slice(jsonStart, jsonEnd + 1);

        const parsed = JSON.parse(jsonText) as any[];

        const cleaned: ExperienceAiOutput[] = parsed.map((item) => ({
          title: item.title,
          seniority_level: item.seniority_level,
          department: item.department,
          function: Array.isArray(item.function) ? item.function.join(", ") : item.function,
        }));

        const tokenEstimate = estimateTokenCount(prompt + "\n" + text);
        logger.info(`Estimated token usage: ${tokenEstimate}`);


        logger.info(`output from ${JSON.stringify(cleaned)}`);

        // let valdiatedAiResponse = validateExperienceAiOutputStandardizerOutput(
        //   cleaned,
        //   ['title', 'seniority_level', 'department', 'function']
        // )

        // logger.info(`output/validated from ${JSON.stringify(valdiatedAiResponse)}`);
        // return valdiatedAiResponse;
        return cleaned
      } catch (error) {
        retries++;
        logger.error(`Gemini AI SDK error (attempt ${retries}):`, error);
        if (retries < MAX_RETRIES) {
          logger.info(`Retrying after ${RETRY_DELAY_MS}ms...`);
          await delay(RETRY_DELAY_MS);
        } else {
          throw new Error(`Gemini API failed after ${MAX_RETRIES} attempts. Last response:\n${lastResponse}`);
        }
      }
    }

    throw new Error("Unexpected error in Gemini job title classification.");
  },

  classifyEducation: async (education: string[]): Promise<EducationAiOutput[]> => {
    logger.info(`Calling Gemini via Vercel AI SDK to classify ${education.length} education titles... ${education}`);

    const prompt = `
        You are an education standardization assistant. For each raw degree input, return a standardized JSON with:
          1. degree_level — Match to the best-fit Credential Transparency Description Language (CTDL) level:

          High School Diploma or Equivalent

          Pre-tertiary Certification / Secondary Education

          Vocational / Trade Certificate

          Sub-Bachelor / Foundation / Diploma Programs

          Associate Degree

          Bachelor's Degree

          Bachelor's (Honours)

          Postgraduate Certificate / Diploma

          Master's Degree

          Integrated Master's / Dual Degrees

          Professional Degree

          Doctorate / Research Degree

          2. major — Match to the closest valid CIP major title (U.S. Dept. of Education). Avoid vague labels like "General Studies" unless explicitly stated.

          Valid examples:

          Accounting  
          Actuarial Science  
          Actuarial Sciences  
          Adult & Continuing Education  
          Advertising  
          Aerospace Engineering  
          Agricultural Business and Management  
          Agricultural Economics  
          Agricultural Mechanics  
          Agronomy  
          Animal Sciences  
          Anthropology  
          Applied Design/Crafts  
          Applied Mathematics  
          Architecture  
          Art  
          Art History  
          Astronomy  
          Biochemistry  
          Biochemistry/Biophysics  
          Bioengineering and Biomedical Engineering  
          Biology  
          Biomedical Science  
          Botany  
          Business Administration and Management  
          Business Management  
          Chemical Engineering  
          Chemistry  
          Child Development  
          Chiropractic  
          Cinematography  
          City & Regional Planning  
          Civil Engineering  
          Classics  
          Clinical Laboratory Science  
          Communication  
          Comparative Literature  
          Computer Programming  
          Computer Science  
          Construction Engineering  
          Contract Management  
          Cooking and Culinary Arts  
          Counselor Education  
          Creative Writing  
          Criminal Justice  
          Cultural Studies/Gender Studies  
          Cultural Studies  
          Data Processing  
          Data Science  
          Dance  
          Dental Assisting  
          Dental Hygiene  
          Dental Lab Technology  
          Dentistry  
          Design and Applied Arts  
          Diesel Mechanics  
          Dramatic Arts  
          Drafting  
          Early Childhood Education  
          Ecology  
          Economics  
          Education  
          Educational Leadership and Administration  
          Electrical & Electronic Engineering  
          Electrical Engineering  
          Elementary Education  
          Engineering  
          English  
          Entrepreneurship  
          Environmental Design  
          Environmental Health Engineering  
          Environmental Science  
          Environmental Studies  
          Family and Consumer Sciences  
          Fashion Design  
          Fashion Merchandising  
          Finance  
          Fine and Studio Arts  
          Fire Protection  
          Fish, Game, Wildlife Management  
          Food/Nutrition/Dietetics  
          Food Science  
          Forensic Science  
          Forestry  
          French Language and Literature  
          Game Design  
          Gender Studies  
          General Studies  
          Geography  
          Geology  
          Graphic Design  
          Health Administration  
          Health Professions  
          Heating, Air Conditioning & Refrigeration Technology  
          History  
          Hospitality Administration  
          Hotel/Restaurant Management  
          Human Development  
          Human Environment & Housing  
          Human Res. Development/Training  
          Human Resources Management  
          Individual & Family Development  
          Industrial Engineering  
          Information Science  
          Information Systems  
          Information Technology  
          Instructional Media Design  
          Interior Design  
          International Business  
          International Relations  
          Journalism  
          Kinesiology  
          Labor/Industrial Relations  
          Landscape Architecture  
          Law  
          Law Enforcement  
          Liberal Arts  
          Library Science  
          Linguistics  
          Machinework  
          Management Information Systems  
          Marketing  
          Mass Communication  
          Materials Engineering  
          Mathematics  
          Mechanical Engineering  
          Medical Assisting  
          Medical Lab/Tech.  
          Medicine  
          Meteorology  
          Microbiology  
          Military Science  
          Mining/Mineral Engineering  
          Mortuary Science  
          Multi/Interdisciplinary Studies  
          Music  
          Natural Resources Management  
          Neuroscience  
          Nuclear Engineering  
          Nuclear Medical Tech.  
          Nursing  
          Nutrition Sciences  
          Occupational Therapy  
          Ocean Engineering  
          Oceanography  
          Optometry  
          Organizational Behavior  
          Organizational Leadership  
          Parks & Recreation  
          Petroleum Engineering  
          Personnel Management  
          Pharmacy  
          Philosophy  
          Photography  
          Physical Education  
          Physical Therapy  
          Physics  
          Physician Assisting  
          Political Science  
          Pre-Law Studies  
          Pre-Medicine  
          Psychology  
          Public Administration  
          Public Health  
          Public Relations  
          Radiologic Technology  
          Radiology  
          Real Estate Management  
          Recreation and Leisure Studies  
          Religious Studies  
          Respiratory Therapy  
          Retailing & Sales  
          Science Teacher Education  
          Secondary Education  
          Secretarial Studies  
          Social Work  
          Sociology  
          Software Engineering  
          Spanish Language and Literature  
          Special Education  
          Speech Path./Audiology  
          Speech/Debate, Forensics  
          Sport and Fitness Administration  
          Sports Management  
          Statistics  
          Student Counseling  
          Supply Chain Management  
          Sustainability Studies  
          Teacher Education  
          Textiles & Clothing  
          Theatre Arts  
          Tourism and Travel Services Management  
          Trade & Industrial Management  
          Transportation Management  
          Urban Studies  
          Veterinarian Assisting  
          Veterinary Medicine  
          Veterinary Technology  
          Visual and Performing Arts  
          Web Page and Digital Media Design  
          Welding  
          Wildlife and Wildlands Science and Management  
          Women's Studies  
          Woodworking  
          Zoology  

          Avoid:

          General Studies (unless exact)

          Unmapped or invented labels

          Output format (always one array containing all the dictionairy for each of the inputs):
          JSON array of objects:

          [{
            "education": <original education>
            "degree_level": "Bachelor's Degree",
            "major": "Computer Science"
          },
          {
            "education": <original education>
            "degree_level": "Masters's Degree",
            "major": "Computer Science"
          }
          ]


          Output constraints
          JSON only, no comments or extras
          Valid syntax only
          One complete JSON array per response
          Be precise. 
          Return best-match only, Use only approved taxonomy.
          if no match found for education major, you can use CIP APPROVED MAJORS ONLY.
          you MUST return one dictionairy for one output.

          Education degrees to Classify:
         ${education.map((t) => `- ${t}`).join("\n")}
    `;

    let retries = 0;
    let lastResponse = "";

    while (retries < MAX_RETRIES) {
      try {
        const result = await generateText({
          model,
          prompt,
        });

        const text = result.text;
        lastResponse = text;

        logger.error("Gemini raw output:\n" + lastResponse);



        const jsonStart = text.indexOf("[");
        const jsonEnd = text.lastIndexOf("]");
        const jsonText = text.slice(jsonStart, jsonEnd + 1);

        const parsed = JSON.parse(jsonText) as any[];

        const cleaned: EducationAiOutput[] = parsed.map((item) => ({
          education: item.education,
          major: item.major,
          degree: item.degree_level,
        }));

        const tokenEstimate = estimateTokenCount(prompt + "\n" + text);
        logger.info(`Estimated token usage: ${tokenEstimate}`);

        let valdiatedAiResponse = validateEducationStandardizationOutput(
          cleaned,
          ['education', 'degree', 'major']
        )
        return valdiatedAiResponse;
      } catch (error) {
        retries++;
        logger.error(`Gemini AI SDK error (attempt ${retries}):`, error);
        if (retries < MAX_RETRIES) {
          logger.info(`Retrying after ${RETRY_DELAY_MS}ms...`);
          await delay(RETRY_DELAY_MS);
        } else {
          throw new Error(`Gemini API failed after ${MAX_RETRIES} attempts. Last response:\n${lastResponse}`);
        }
      }
    }

    throw new Error("Unexpected error in Gemini job title classification.");
  }




};
