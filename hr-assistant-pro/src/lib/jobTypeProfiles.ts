import { JobTypeProfile } from '@/types';

const unifiedExtractionPrompt = 'You are an expert HR document parser specializing in Rush University System for Health job descriptions. Your task is to extract key information from a job description by identifying specific sections. The job descriptions follow a standard format with clear headings.\n\n**Instructions:**\n1.  Scan the document for the following specific section headings.\n2.  Extract the content under each heading precisely.\n3.  Map the extracted content to the specified JSON fields.\n\n**Section Mapping:**\n-   **title:** Find the main job title, usually at the top.\n-   **summary:** Look for a "Summary" or "Position Highlights" section. Extract the summary of the role.\n-   **mustHave:** Look for the "Required Job Qualifications" section. Extract all items from this section into a list of strings. This is the most critical section.\n-   **niceToHave:** Look for the "Preferred Job Qualifications" section. Extract all items from this section into a list of strings.\n-   **education:** Look within the "Required Job Qualifications" for educational requirements (e.g., "Bachelor\'s Degree").\n-   **experienceYears:** Look within the "Required Job Qualifications" for the minimum years of experience required.\n\nYou MUST respond with a single, valid JSON object. If a section is not found, return an empty list or null for that field.\nExample JSON output:\n{\n  "title": "Clinical Research Coordinator",\n  "summary": "The Clinical Research Coordinator works under the general direction of a Principal Investigator...",\n  "mustHave": ["Bachelor\'s degree and 1 year of clinical research experience", "Proficiency in Microsoft Office"],\n  "niceToHave": ["Experience with oncology research", "ACRP or SOCRA certification"],\n  "education": "Bachelor\'s Degree",\n  "experienceYears": 1\n}';

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
