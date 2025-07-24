/**
 * Scoring rubrics for objective candidate evaluation
 * Each rubric item is scored 0-10 based on specific criteria
 */

export interface RubricItem {
  id: string;
  description: string;
  maxPoints: number;
  scoringGuide: Record<string, number>; // Maps conditions to points
}

export interface CategoryRubric {
  category: string;
  weight: number; // Percentage weight for this category
  items: RubricItem[];
}

// Technical Skills Rubric Items
export const technicalSkillsRubric: RubricItem[] = [
  {
    id: 'tech_exact_match',
    description: 'Required technologies exact match',
    maxPoints: 4,
    scoringGuide: {
      'all_required': 4,
      '75_percent': 3,
      '50_percent': 2,
      '25_percent': 1,
      'none': 0
    }
  },
  {
    id: 'tech_similar',
    description: 'Similar/related technologies',
    maxPoints: 2,
    scoringGuide: {
      'multiple_related': 2,
      'some_related': 1,
      'none': 0
    }
  },
  {
    id: 'tech_years',
    description: 'Years of relevant technical experience',
    maxPoints: 2,
    scoringGuide: {
      'exceeds_requirement': 2,
      'meets_requirement': 1.5,
      'slightly_below': 1,
      'significantly_below': 0.5,
      'none': 0
    }
  },
  {
    id: 'tech_complexity',
    description: 'Complexity of technical projects',
    maxPoints: 2,
    scoringGuide: {
      'enterprise_scale': 2,
      'medium_complexity': 1.5,
      'basic_projects': 1,
      'learning_projects': 0.5,
      'no_projects': 0
    }
  }
];

// Experience Relevance Rubric Items
export const experienceRubric: RubricItem[] = [
  {
    id: 'exp_industry',
    description: 'Industry experience match',
    maxPoints: 3,
    scoringGuide: {
      'exact_industry': 3,
      'healthcare_related': 2.5,
      'similar_regulated': 2,
      'transferable': 1,
      'unrelated': 0
    }
  },
  {
    id: 'exp_role',
    description: 'Role/position match',
    maxPoints: 3,
    scoringGuide: {
      'exact_role': 3,
      'very_similar': 2.5,
      'related_role': 2,
      'some_overlap': 1,
      'different': 0
    }
  },
  {
    id: 'exp_achievements',
    description: 'Quantifiable achievements',
    maxPoints: 2,
    scoringGuide: {
      'multiple_significant': 2,
      'some_significant': 1.5,
      'basic_achievements': 1,
      'responsibilities_only': 0.5,
      'none': 0
    }
  },
  {
    id: 'exp_progression',
    description: 'Career progression',
    maxPoints: 2,
    scoringGuide: {
      'clear_advancement': 2,
      'steady_growth': 1.5,
      'lateral_moves': 1,
      'gaps_explained': 0.5,
      'concerning_pattern': 0
    }
  }
];

// Education & Certifications Rubric Items
export const educationRubric: RubricItem[] = [
  {
    id: 'edu_degree',
    description: 'Required education level',
    maxPoints: 4,
    scoringGuide: {
      'exceeds_requirement': 4,
      'meets_requirement': 3,
      'equivalent_experience': 2,
      'related_degree': 1,
      'no_degree': 0
    }
  },
  {
    id: 'edu_relevance',
    description: 'Education relevance to role',
    maxPoints: 3,
    scoringGuide: {
      'directly_relevant': 3,
      'somewhat_relevant': 2,
      'transferable_skills': 1,
      'unrelated': 0
    }
  },
  {
    id: 'edu_certifications',
    description: 'Professional certifications',
    maxPoints: 3,
    scoringGuide: {
      'multiple_relevant': 3,
      'one_relevant': 2,
      'in_progress': 1,
      'none': 0
    }
  }
];

// Soft Skills Rubric Items
export const softSkillsRubric: RubricItem[] = [
  {
    id: 'soft_communication',
    description: 'Communication skills evidence',
    maxPoints: 3,
    scoringGuide: {
      'extensive_evidence': 3,
      'good_evidence': 2,
      'some_evidence': 1,
      'no_evidence': 0
    }
  },
  {
    id: 'soft_leadership',
    description: 'Leadership experience',
    maxPoints: 3,
    scoringGuide: {
      'formal_leadership': 3,
      'project_leadership': 2,
      'team_collaboration': 1,
      'individual_contributor': 0
    }
  },
  {
    id: 'soft_cultural_fit',
    description: 'Cultural fit indicators',
    maxPoints: 2,
    scoringGuide: {
      'strong_alignment': 2,
      'good_alignment': 1.5,
      'neutral': 1,
      'concerns': 0
    }
  },
  {
    id: 'soft_adaptability',
    description: 'Adaptability and learning',
    maxPoints: 2,
    scoringGuide: {
      'highly_adaptable': 2,
      'shows_flexibility': 1.5,
      'some_evidence': 1,
      'rigid_approach': 0
    }
  }
];

// Resume Quality Rubric Items
export const resumeQualityRubric: RubricItem[] = [
  {
    id: 'quality_clarity',
    description: 'Clarity and organization',
    maxPoints: 5,
    scoringGuide: {
      'exceptional': 5,
      'well_organized': 4,
      'adequate': 3,
      'needs_improvement': 2,
      'poor': 1
    }
  },
  {
    id: 'quality_completeness',
    description: 'Completeness of information',
    maxPoints: 5,
    scoringGuide: {
      'comprehensive': 5,
      'mostly_complete': 4,
      'adequate': 3,
      'missing_key_info': 2,
      'sparse': 1
    }
  }
];

// Job Type Weights
export const jobTypeWeights = {
  'entry-level': {
    softSkills: 0.35,
    experience: 0.20,
    education: 0.20,
    technicalSkills: 0.20,
    resumeQuality: 0.05
  },
  'technical': {
    technicalSkills: 0.40,
    experience: 0.30,
    education: 0.15,
    softSkills: 0.10,
    resumeQuality: 0.05
  },
  'general': {
    experience: 0.35,
    technicalSkills: 0.25,
    education: 0.20,
    softSkills: 0.15,
    resumeQuality: 0.05
  }
};

// Transferable Skills Bonus Rubric
export const transferableSkillsBonus: RubricItem = {
  id: 'transferable_skills',
  description: 'Transferable skills identified',
  maxPoints: 10, // Bonus points
  scoringGuide: {
    'multiple_strong': 10,
    'several_relevant': 7,
    'some_relevant': 5,
    'few_relevant': 3,
    'minimal': 1,
    'none': 0
  }
};

// Preferred Qualifications Bonus Rubric
export const preferredQualificationsBonus: RubricItem = {
  id: 'preferred_quals',
  description: 'Preferred qualifications met',
  maxPoints: 5, // Bonus points
  scoringGuide: {
    'all_met': 5,
    'most_met': 4,
    'some_met': 2,
    'few_met': 1,
    'none': 0
  }
};

/**
 * Get rubric configuration for a specific job type
 */
export function getRubricForJobType(jobType: string): CategoryRubric[] {
  const weights = jobTypeWeights[jobType as keyof typeof jobTypeWeights] || jobTypeWeights.general;
  
  return [
    {
      category: 'technicalSkills',
      weight: weights.technicalSkills,
      items: technicalSkillsRubric
    },
    {
      category: 'experience',
      weight: weights.experience,
      items: experienceRubric
    },
    {
      category: 'education',
      weight: weights.education,
      items: educationRubric
    },
    {
      category: 'softSkills',
      weight: weights.softSkills,
      items: softSkillsRubric
    },
    {
      category: 'resumeQuality',
      weight: weights.resumeQuality,
      items: resumeQualityRubric
    }
  ];
}

/**
 * Calculate maximum possible score for a job type
 */
export function getMaxScoreForJobType(jobType: string): number {
  const rubrics = getRubricForJobType(jobType);
  let maxScore = 0;
  
  for (const rubric of rubrics) {
    const categoryMax = rubric.items.reduce((sum, item) => sum + item.maxPoints, 0);
    maxScore += categoryMax * rubric.weight;
  }
  
  // Add maximum bonus points
  maxScore += transferableSkillsBonus.maxPoints;
  maxScore += preferredQualificationsBonus.maxPoints;
  
  return maxScore;
}