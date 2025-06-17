import { FileUp, Cpu, BarChart3 } from 'lucide-react';

const steps = [
  {
    icon: <FileUp className="h-10 w-10 text-rush-blue" />,
    title: '1. Upload Documents',
    description: 'Provide a job description and upload candidate resumes in PDF or DOCX format.',
  },
  {
    icon: <Cpu className="h-10 w-10 text-rush-blue" />,
    title: '2. AI-Powered Analysis',
    description: 'Our AI extracts key requirements and scores each candidate based on their qualifications and experience.',
  },
  {
    icon: <BarChart3 className="h-10 w-10 text-rush-blue" />,
    title: '3. View Ranked Results',
    description: 'Receive a detailed breakdown of top candidates, including their strengths, weaknesses, and overall score.',
  },
];

export default function ProcessGuide() {
  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-rush-blue-dark text-center mb-8">How It Works</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        {steps.map((step, index) => (
          <div 
            key={index} 
            className="flex flex-col items-center opacity-0 animate-fadeInUp"
            style={{ animationDelay: `${index * 0.2}s` }}
          >
            <div className="bg-rush-green-lightest p-4 rounded-full mb-4">
              {step.icon}
            </div>
            <h3 className="text-lg font-semibold text-rush-blue-dark mb-2">{step.title}</h3>
            <p className="text-neutral-gray-dark text-sm">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
