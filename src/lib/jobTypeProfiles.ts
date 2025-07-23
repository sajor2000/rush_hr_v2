import { JobTypeProfile } from '@/types';

const unifiedExtractionPrompt = `You are an expert HR document parser specializing in Rush University System for Health job descriptions. Your task is to extract key information from a job description by identifying specific sections. The job descriptions follow a standard format with clear headings.

**Instructions:**
1. Scan the document for the following specific section headings.
2. Extract the content under each heading precisely.
3. Map the extracted content to the specified JSON fields.
4. Pay special attention to soft skills and leadership requirements.

**Section Mapping:**
- **title:** Find the main job title, usually at the top or in "Summary" section.
- **summary:** Look for "Summary", "Job Summary", or "Position Highlights" sections. Extract the role overview.
- **mustHave:** Extract required qualifications from these sources:
  * "Required Job Qualifications" section
  * "Other Information" section (often contains requirements)
  * Bullet points at the beginning that list minimum requirements
  * Look for keywords: "required", "must have", "minimum", "essential"
- **niceToHave:** Extract preferred qualifications from:
  * "Preferred Job Qualifications" section
  * Skills mentioned as "preferred", "desired", "a plus", "beneficial"
  * Advanced skills or certifications mentioned but not required
  * If not explicitly stated, infer from context what would give candidates an advantage
- **education:** Extract educational requirements (Bachelor's, Master's, specific degrees)
- **experienceYears:** Extract minimum years of experience (look for "X years", "minimum of X years")
- **softSkills:** Extract soft skills from various sections:
  * "Responsibilities" section
  * Professional skills: communication, interpersonal, problem-solving, teamwork, leadership
  * Entry-level skills: following instructions, reliability, attention to detail, physical stamina
  * Healthcare research skills: confidentiality, discretion, protocol adherence, data accuracy, participant rapport
  * Behavioral requirements: "good interpersonal skills", "neat appearance", "accountability"
  * From specific sections like LEADERSHIP, CRITICAL THINKING, etc.
  * Look for verbs like: liaising, coordinating, communicating, collaborating, maintaining, operating, collecting, processing, documenting
- **physicalRequirements:** Extract physical requirements (entry-level jobs often have these):
  * Look for "must be able to lift/push/pull X pounds"
  * Physical activities: standing, walking, bending, climbing, reaching
  * Environmental conditions: hot/cold, wet/dry, indoor/outdoor
  * Manual tasks: operating equipment, handling tools, cleaning

**IMPORTANT NOTES:**
- If "Preferred Job Qualifications" section is not present, look for qualifications that would give candidates an advantage but aren't strictly required
- Extract ALL soft skills mentioned, especially from the Responsibilities section
- Include skills like leadership, teamwork, communication, critical thinking, teaching abilities, etc.

You MUST respond with a single, valid JSON object. If a section is not found, return an empty list or null for that field.

Example JSON output for various JD formats:

Example 1 - Nursing Role:
{
  "title": "Registered Nurse 2",
  "summary": "The Registered Nurse 2 is a competent nurse who has mastered technical skills...",
  "mustHave": [
    "Current State of Illinois Registered Nurse licensure",
    "Maintain current BLS certification",
    "Earned nursing degree at the baccalaureate level or higher",
    "Analytical ability",
    "Communication skills"
  ],
  "niceToHave": [
    "Experience in Women's & Children's unit",
    "Advanced certifications beyond BLS",
    "Teaching experience"
  ],
  "softSkills": [
    "Leadership skills",
    "Effective delegation",
    "Collaborative teamwork",
    "Critical thinking"
  ],
  "education": "Bachelor's Degree in Nursing",
  "experienceYears": 0,
  "physicalRequirements": null
}

Example 2 - IT Business Analyst:
{
  "title": "Associate IT Business Analyst",
  "summary": "The Associate IT Business Analyst has expertise in both information technology and business administration...",
  "mustHave": [
    "Bachelor's degree in computer science, business administration, or related experience",
    "A minimum of 2-5 years of business analyst or related experience",
    "Experience working with the ServiceNow suite specifically the Strategic Portfolio Management (SPM) tool",
    "Excellent problem-solving skills",
    "Exceptional interpersonal, written, and verbal skills",
    "Experience with using a variety of IT technologies, including MS Office suite"
  ],
  "niceToHave": [
    "Experience with budget model development",
    "MS Excel advanced skills",
    "Experience with employee onboarding processes",
    "Event coordination experience"
  ],
  "softSkills": [
    "Liaising between departments",
    "Exceptional interpersonal skills",
    "Communication skills",
    "Problem-solving",
    "Presentation skills",
    "Coordination abilities",
    "Stakeholder management"
  ],
  "education": "Bachelor's degree in computer science, business administration, or related field",
  "experienceYears": 2,
  "physicalRequirements": null
}

Example 3 - Entry-Level Environmental Services:
{
  "title": "Environmental Services",
  "summary": "Under general supervision of an Environmental Services supervisor, cleans, maintains and services assigned areas throughout RPSLMC...",
  "mustHave": [
    "Must demonstrate, after training, skill and controlling of cleaning equipment",
    "Must be able to demonstrate skills and knowledge of proper use of chemicals and equipment",
    "Must be able to 10 Step Clean and isolation clean a patient room",
    "Must be able to use Bed Tracking System",
    "Must demonstrate good interpersonal skills",
    "Must have neat personal appearance",
    "Must be able to push, pull, and control cleaning equipment up to 150 pounds"
  ],
  "niceToHave": [
    "High school graduate or G.E.D.",
    "Prior cleaning experience",
    "Ability to understand written English and oral instructions"
  ],
  "softSkills": [
    "Following instructions",
    "Attention to detail",
    "Good interpersonal skills",
    "Reliability",
    "Physical stamina",
    "Team cooperation",
    "Neat appearance",
    "Accountability"
  ],
  "education": null,
  "experienceYears": 0,
  "physicalRequirements": [
    "Must be able to push, pull, and control cleaning equipment up to 150 pounds",
    "Must be able to 10 Step Clean and isolation clean a patient room",
    "Must demonstrate skill in controlling cleaning equipment"
  ]
}

Example 4 - Clinical Research Assistant:
{
  "title": "Clinical Research Assistant",
  "summary": "The Clinical Research Assistant will assist with activities of clinical research studies conducted by PI(s) which may include grant-funded, industry sponsored, and investigator-initiated clinical research studies...",
  "mustHave": [
    "High School Diploma",
    "Ability to meet deadlines",
    "Troubleshoots field issues when necessary. Uses discretion to resolve issues when unplanned events arise",
    "Detail oriented with high attention to accuracy",
    "Ability to build rapport, navigate sensitive topics, and maintain confidentiality with a diverse pool of research participants",
    "Effective verbal and written communication skills",
    "Ability to collaborate within multi-disciplinary team settings",
    "Availability to work evenings, overnight and weekends if called for under the study protocols",
    "Travel may be required"
  ],
  "niceToHave": [
    "Bachelor's degree in Sciences or health-related discipline"
  ],
  "softSkills": [
    "Attention to accuracy",
    "Building rapport",
    "Maintaining confidentiality",
    "Communication skills",
    "Team collaboration",
    "Problem-solving",
    "Discretion",
    "Flexibility",
    "Protocol adherence",
    "Data management",
    "Participant interaction"
  ],
  "education": "High School Diploma",
  "experienceYears": 0,
  "physicalRequirements": [
    "May collect, process and ship potentially biohazardous specimens",
    "Travel may be required"
  ]
}`;

export const jobTypeProfiles: Record<string, Pick<JobTypeProfile, 'type' | 'extractionPrompt'>> = {
  'entry-level': {
    type: 'entry-level',
    extractionPrompt: unifiedExtractionPrompt,
  },
  'technical': {
    type: 'technical',
    extractionPrompt: unifiedExtractionPrompt,
  },
  'general': {
    type: 'general',
    extractionPrompt: unifiedExtractionPrompt,
  },
};
