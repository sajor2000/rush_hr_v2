const fs = require('fs');
const path = require('path');

const NUM_RESUMES = 100;
const TEST_DATA_DIR = path.join(__dirname, 'test_resumes');

if (!fs.existsSync(TEST_DATA_DIR)) {
  fs.mkdirSync(TEST_DATA_DIR);
}

const sampleResumes = [
  {
    name: 'JCR.txt',
    content: 'Experienced Data Scientist with a background in machine learning and statistical analysis. Proficient in Python, R, and SQL. Completed projects in natural language processing and predictive modeling. Seeking a challenging role in a data-driven organization.',
  },
  {
    name: 'jason.txt',
    content: 'Environmental Services professional with over 10 years of experience in waste management and regulatory compliance. Certified in hazardous materials handling. Proven track record of improving recycling programs and reducing environmental impact. Strong leadership and communication skills.',
  },
  {
    name: 'calvin.txt',
    content: 'Entry-level software developer with a passion for creating elegant and efficient code. Skilled in JavaScript, React, and Node.js. Eager to contribute to a collaborative team and grow as a developer. Completed a coding bootcamp with a focus on full-stack web development.',
  },
];

for (let i = 1; i <= NUM_RESUMES; i++) {
  const resumeTemplate = sampleResumes[i % sampleResumes.length];
  const fileName = `resume_${i}_${resumeTemplate.name}`;
  const filePath = path.join(TEST_DATA_DIR, fileName);
  const content = `Resume #${i}\n\n${resumeTemplate.content}`;

  fs.writeFileSync(filePath, content);
}

console.log(`Successfully generated ${NUM_RESUMES} test resumes in the '${TEST_DATA_DIR}' directory.`);
