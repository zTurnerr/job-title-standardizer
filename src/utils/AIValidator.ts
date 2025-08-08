import { ExperienceAiOutput, EducationAiOutput } from "../models/aiTypes";
import stringSimilarity from "string-similarity";
import { logger } from "./logger";


const approvedDegreeLevels = [
    "High School Diploma or Equivalent",
    "Pre-tertiary Certification / Secondary Education",
    "Vocational / Trade Certificate",
    "Sub-Bachelor / Foundation / Diploma Programs",
    "Associate Degree",
    "Bachelor's Degree",
    "Bachelor's (Honours)",
    "Postgraduate Certificate / Diploma",
    "Master's Degree",
    "Integrated Master's / Dual Degrees",
    "Professional Degree",
    "Doctorate / Research Degree"
];

const approvedCIPMajors = [
    "Accounting",
    "Actuarial Science",
    "Actuarial Sciences",
    "Adult & Continuing Education",
    "Advertising",
    "Aerospace Engineering",
    "Agricultural Business and Management",
    "Agricultural Economics",
    "Agricultural Mechanics",
    "Agronomy",
    "Animal Sciences",
    "Anthropology",
    "Applied Design/Crafts",
    "Applied Mathematics",
    "Architecture",
    "Art",
    "Art History",
    "Astronomy",
    "Biochemistry",
    "Biochemistry/Biophysics",
    "Bioengineering and Biomedical Engineering",
    "Biology",
    "Biomedical Science",
    "Botany",
    "Business Administration and Management",
    "Business Management",
    "Chemical Engineering",
    "Chemistry",
    "Child Development",
    "Chiropractic",
    "Cinematography",
    "City & Regional Planning",
    "Civil Engineering",
    "Classics",
    "Clinical Laboratory Science",
    "Communication",
    "Comparative Literature",
    "Computer Programming",
    "Computer Science",
    "Construction Engineering",
    "Contract Management",
    "Cooking and Culinary Arts",
    "Counselor Education",
    "Creative Writing",
    "Criminal Justice",
    "Cultural Studies/Gender Studies",
    "Cultural Studies",
    "Data Processing",
    "Data Science",
    "Dance",
    "Dental Assisting",
    "Dental Hygiene",
    "Dental Lab Technology",
    "Dentistry",
    "Design and Applied Arts",
    "Diesel Mechanics",
    "Dramatic Arts",
    "Drafting",
    "Early Childhood Education",
    "Ecology",
    "Economics",
    "Education",
    "Educational Leadership and Administration",
    "Electrical & Electronic Engineering",
    "Electrical Engineering",
    "Elementary Education",
    "Engineering",
    "English",
    "Entrepreneurship",
    "Environmental Design",
    "Environmental Health Engineering",
    "Environmental Science",
    "Environmental Studies",
    "Family and Consumer Sciences",
    "Fashion Design",
    "Fashion Merchandising",
    "Finance",
    "Fine and Studio Arts",
    "Fire Protection",
    "Fish, Game, Wildlife Management",
    "Food/Nutrition/Dietetics",
    "Food Science",
    "Forensic Science",
    "Forestry",
    "French Language and Literature",
    "Game Design",
    "Gender Studies",
    "General Studies",
    "Geography",
    "Geology",
    "Graphic Design",
    "Health Administration",
    "Health Professions",
    "Heating, Air Conditioning & Refrigeration Technology",
    "History",
    "Hospitality Administration",
    "Hotel/Restaurant Management",
    "Human Development",
    "Human Environment & Housing",
    "Human Res. Development/Training",
    "Human Resources Management",
    "Individual & Family Development",
    "Industrial Engineering",
    "Information Science",
    "Information Systems",
    "Information Technology",
    "Instructional Media Design",
    "Interior Design",
    "International Business",
    "International Relations",
    "Journalism",
    "Kinesiology",
    "Labor/Industrial Relations",
    "Landscape Architecture",
    "Law",
    "Law Enforcement",
    "Liberal Arts",
    "Library Science",
    "Linguistics",
    "Machinework",
    "Management Information Systems",
    "Marketing",
    "Mass Communication",
    "Materials Engineering",
    "Mathematics",
    "Mechanical Engineering",
    "Medical Assisting",
    "Medical Lab/Tech.",
    "Medicine",
    "Meteorology",
    "Microbiology",
    "Military Science",
    "Mining/Mineral Engineering",
    "Mortuary Science",
    "Multi/Interdisciplinary Studies",
    "Music",
    "Natural Resources Management",
    "Neuroscience",
    "Nuclear Engineering",
    "Nuclear Medical Tech.",
    "Nursing",
    "Nutrition Sciences",
    "Occupational Therapy",
    "Ocean Engineering",
    "Oceanography",
    "Optometry",
    "Organizational Behavior",
    "Organizational Leadership",
    "Parks & Recreation",
    "Petroleum Engineering",
    "Personnel Management",
    "Pharmacy",
    "Philosophy",
    "Photography",
    "Physical Education",
    "Physical Therapy",
    "Physics",
    "Physician Assisting",
    "Political Science",
    "Pre-Law Studies",
    "Pre-Medicine",
    "Psychology",
    "Public Administration",
    "Public Health",
    "Public Relations",
    "Radiologic Technology",
    "Radiology",
    "Real Estate Management",
    "Recreation and Leisure Studies",
    "Religious Studies",
    "Respiratory Therapy",
    "Retailing & Sales",
    "Science Teacher Education",
    "Secondary Education",
    "Secretarial Studies",
    "Social Work",
    "Sociology",
    "Software Engineering",
    "Spanish Language and Literature",
    "Special Education",
    "Speech Path./Audiology",
    "Speech/Debate, Forensics",
    "Sport and Fitness Administration",
    "Sports Management",
    "Statistics",
    "Student Counseling",
    "Supply Chain Management",
    "Sustainability Studies",
    "Teacher Education",
    "Textiles & Clothing",
    "Theatre Arts",
    "Tourism and Travel Services Management",
    "Trade & Industrial Management",
    "Transportation Management",
    "Urban Studies",
    "Veterinarian Assisting",
    "Veterinary Medicine",
    "Veterinary Technology",
    "Visual and Performing Arts",
    "Web Page and Digital Media Design",
    "Welding",
    "Wildlife and Wildlands Science and Management",
    "Women's Studies",
    "Woodworking",
    "Zoology"
];

const approvedSeniorityLevels = [
    "Owner", "Founder", "C-suite", "Partner", "VP", "Head", "Director", "Manager", "Senior", "Entry", "Intern"
  ];
const approvedDepartments = [
"C-Suite", "Engineering & Technical", "Design", "Education", "Finance",
"Human Resources", "Information Technology", "Legal", "Marketing",
"Medical & Health", "Operations", "Sales", "Consulting"
];

const departmentFunctions: Record<string, string[]> = {
    "C-Suite": [
      "Executive", "Finance Executive", "Founder", "Human Resources Executive",
      "Information Technology Executive", "Legal Executive", "Marketing Executive",
      "Medical & Health Executive", "Operations Executive", "Sales Leader"
    ],
    "Engineering & Technical": [
      "Artificial Intelligence / Machine Learning", "Bioengineering", "Biometrics",
      "Business Intelligence", "Chemical Engineering", "Cloud / Mobility",
      "Data Science", "DevOps", "Digital Transformation", "Emerging Technology / Innovation",
      "Engineering & Technical", "Industrial Engineering", "Mechanic", "Mobile Development",
      "Product Development", "Product Management", "Project Management",
      "Research & Development", "Scrum Master / Agile Coach", "Software Development",
      "Support / Technical Services", "Technician", "Technology Operations", "Test / Quality Assurance",
      "UI / UX", "Web Development"
    ],
    "Design": [
      "All Design", "Product or UI/UX Design", "Graphic / Visual / Brand Design"
    ],
    "Education": [
      "Teacher", "Principal", "Superintendent", "Professor"
    ],
    "Finance": [
      "Accounting", "Finance", "Financial Planning & Analysis", "Financial Reporting",
      "Financial Strategy", "Financial Systems", "Internal Audit & Control",
      "Investor Relations", "Mergers & Acquisitions", "Real Estate Finance",
      "Financial Risk", "Shared Services", "Sourcing / Procurement", "Tax", "Treasury"
    ],
    "Human Resources": [
      "Compensation & Benefits", "Culture", "Diversity & Inclusion", "Employee & Labor Relations",
      "Health & Safety", "Human Resource Information System", "Human Resources",
      "HR Business Partner", "Learning & Development", "Organizational Development",
      "Recruiting & Talent Acquisition", "Talent Management", "Workforce Management", "People Operations"
    ],
    "Information Technology": [
      "Application Development", "Business Service Management / ITSM", "Collaboration & Web App",
      "Data Center", "Data Warehouse", "Database Administration", "eCommerce Development",
      "Enterprise Architecture", "Help Desk / Desktop Services", "HR / Financial / ERP Systems",
      "Information Security", "Information Technology", "Infrastructure", "IT Asset Management",
      "IT Audit / IT Compliance", "IT Operations", "IT Procurement", "IT Strategy",
      "IT Training", "Networking", "Project & Program Management", "Quality Assurance",
      "Retail / Store Systems", "Servers", "Storage & Disaster Recovery", "Telecommunications", "Virtualization"
    ],
    "Legal": [
      "Acquisitions", "Compliance", "Contracts", "Corporate Secretary", "eDiscovery",
      "Ethics", "Governance", "Governmental Affairs & Regulatory Law", "Intellectual Property & Patent",
      "Labor & Employment", "Lawyer / Attorney", "Legal", "Legal Counsel", "Legal Operations", "Litigation", "Privacy"
    ],
    "Marketing": [
      "Advertising", "Brand Management", "Content Marketing", "Customer Experience", "Customer Marketing",
      "Demand Generation", "Digital Marketing", "eCommerce Marketing", "Event Marketing", "Field Marketing",
      "Lead Generation", "Marketing", "Marketing Analytics / Insights", "Marketing Communications",
      "Marketing Operations", "Product Marketing", "Public Relations", "Search Engine Optimization / Pay Per Click",
      "Social Media Marketing", "Strategic Communications", "Technical Marketing"
    ],
    "Medical & Health": [
      "Anesthesiology", "Chiropractics", "Clinical Systems", "Dentistry", "Dermatology", "Doctors / Physicians",
      "Epidemiology", "First Responder", "Infectious Disease", "Medical Administration", "Medical Education & Training",
      "Medical Research", "Medicine", "Neurology", "Nursing", "Nutrition & Dietetics", "Obstetrics / Gynecology",
      "Oncology", "Ophthalmology", "Optometry", "Orthopedics", "Pathology", "Pediatrics", "Pharmacy", "Physical Therapy",
      "Psychiatry", "Psychology", "Public Health", "Radiology", "Social Work"
    ],
    "Operations": [
      "Call Center", "Construction", "Corporate Strategy", "Customer Service / Support",
      "Enterprise Resource Planning", "Facilities Management", "Leasing", "Logistics", "Office Operations",
      "Operations", "Physical Security", "Project Development", "Quality Management", "Real Estate", "Safety",
      "Store Operations", "Supply Chain"
    ],
    "Sales": [
      "Account Management", "Business Development", "Channel Sales", "Customer Retention & Development",
      "Customer Success", "Field / Outside Sales", "Inside Sales", "Partnerships", "Revenue Operations", "Sales",
      "Sales Enablement", "Sales Engineering", "Sales Operations", "Sales Training"
    ],
    "Consulting": [
      "Business Strategy Consulting", "Change Management Consulting", "Customer Experience Consulting",
      "Data Analytics Consulting", "Digital Transformation Consulting", "Environmental Consulting",
      "Financial Advisory Consulting", "Healthcare Consulting", "Human Resources Consulting",
      "Information Technology Consulting", "Management Consulting", "Marketing Consulting",
      "Mergers & Acquisitions Consulting", "Organizational Development Consulting", "Process Improvement Consulting",
      "Risk Management Consulting", "Sales Strategy Consulting", "Supply Chain Consulting", "Sustainability Consulting",
      "Tax Consulting", "Technology Implementation Consulting", "Training & Development Consulting"
    ]
  };
  
  

export function validateEducationStandardizationOutput(
    arr: EducationAiOutput[],
    requiredFields: string[],
    degreeLevelList: string[] = approvedDegreeLevels,
    cipMajorList: string[] = approvedCIPMajors,
    similarityThreshold: number = 0.85
): EducationAiOutput[] {
    const validated: EducationAiOutput[] = [];

    for (const obj of arr) {
        // Check all required fields
        const missing = requiredFields.filter(
            (field) =>
                !(Object.prototype.hasOwnProperty.call(obj, field)) ||
                (obj as any)[field] == null ||
                (obj as any)[field] === ""
        );
        if (missing.length > 0) continue;

        // Validate degree_level using similarity
        let degreeLevelOK = false;
        let bestDegreeMatch = "";
        if (obj.degree) {
            const { bestMatch } = stringSimilarity.findBestMatch(
                obj.degree.toLowerCase(),
                degreeLevelList.map(s => s.toLowerCase())
            );
            logger.info(`result: ${bestMatch} for ${obj.degree.toLowerCase()}`)
            degreeLevelOK = bestMatch.rating >= similarityThreshold;
            if (degreeLevelOK) bestDegreeMatch = bestMatch.target
        }

        // Validate major using similarity
        let majorOK = false;
        let bestMajorMatch = "";
        if (obj.major) {
            const { bestMatch } = stringSimilarity.findBestMatch(
                obj.major.toLowerCase(),
                cipMajorList.map(s => s.toLowerCase())
            );
            logger.info(`result: ${bestMatch} for ${obj.major.toLowerCase()}`)
            majorOK = bestMatch.rating >= similarityThreshold;
            if (majorOK) bestMajorMatch = bestMatch.target
        }
        // Only keep object if both are valid
        if (degreeLevelOK && majorOK) {
            validated.push(obj);
        }
    }

    return validated;
}



export function validateExperienceAiOutputStandardizerOutput(
    arr: ExperienceAiOutput[],
    seniorityList: string[] = approvedSeniorityLevels,
    departmentList: string[] = approvedDepartments,
    deptFunctions: Record<string, string[]> = departmentFunctions,
    similarityThreshold: number = 0.85
  ): ExperienceAiOutput[] {
    const validated: ExperienceAiOutput[] = [];
  
    for (const obj of arr) {
      if (!obj.title || !obj.seniority_level || !obj.department || !obj.function ) continue;
  
      const functionArr = obj.function.split(",").map(s => s.trim()).filter(Boolean);

      const bestSeniority = stringSimilarity.findBestMatch(
        obj.seniority_level,
        seniorityList
      );
      const matchedSeniority = seniorityList[bestSeniority.bestMatchIndex];
  
      // Validate department (using similarity or exact)
      const bestDept = stringSimilarity.findBestMatch(
        obj.department,
        departmentList
      );
      const matchedDept = departmentList[bestDept.bestMatchIndex];
  
      const validFuncs = deptFunctions[matchedDept] || [];
      const validFunctions = functionArr.filter(f =>
        stringSimilarity.findBestMatch(f, validFuncs).bestMatch.rating >= similarityThreshold
      );

      logger.info(`Validation for ${obj.title} - ${obj.department} - ${obj.seniority_level} - ${obj.function}`)
      logger.info(`dept found ${bestDept.bestMatch.rating}: ${JSON.stringify(bestDept)} - sen found ${bestSeniority.bestMatch.rating}: ${JSON.stringify(bestSeniority)} - functions found : ${JSON.stringify(validFunctions)}`)

      // TODO: get those up again after testing, just to check the full path
      if (bestSeniority.bestMatch.rating < similarityThreshold) continue;
      if (bestDept.bestMatch.rating < similarityThreshold) continue;

      if (
        obj.function.length < 1 ||
        obj.function.length > 3 ||
        validFunctions.length !== obj.function.length
      ) continue; // must have 1-3 valid, department-matching functions
  
      // If all checks passed, snap to the best matches (optional)
      validated.push({
        title: obj.title,
        seniority_level: matchedSeniority,
        department: matchedDept,
        function: obj.function
      });
    }
  
    return validated;
  }