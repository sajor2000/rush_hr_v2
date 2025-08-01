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

// Required Qualifications Rubric - Primary scoring factor (50%)
export const requiredQualificationsRubric: RubricItem[] = [
  {
    id: 'req_exact_match',
    description: 'Required qualifications exact match',
    maxPoints: 7,
    scoringGuide: {
      'all_met': 7,
      '90_percent': 6.3,
      '80_percent': 5.6,
      '70_percent': 4.9,
      '60_percent': 4.2,
      '50_percent': 3.5,
      '40_percent': 2.8,
      '30_percent': 2.1,
      '20_percent': 1.4,
      '10_percent': 0.7,
      'none': 0
    }
  },
  {
    id: 'req_partial_match',
    description: 'Partial/equivalent matches for requirements',
    maxPoints: 3,
    scoringGuide: {
      'strong_equivalents': 3,
      'good_equivalents': 2.5,
      'some_equivalents': 2,
      'weak_equivalents': 1,
      'none': 0
    }
  }
];

// Preferred Qualifications Rubric - Secondary scoring factor (20%)
export const preferredQualificationsRubric: RubricItem[] = [
  {
    id: 'pref_match',
    description: 'Preferred qualifications match',
    maxPoints: 10,
    scoringGuide: {
      'all_met': 10,
      '90_percent': 9,
      '80_percent': 8,
      '70_percent': 7,
      '60_percent': 6,
      '50_percent': 5,
      '40_percent': 4,
      '30_percent': 3,
      '20_percent': 2,
      '10_percent': 1,
      'none': 0
    }
  }
];

// Job Type Weights - Flexible distribution based on job type
export const jobTypeWeights = {
  'entry-level': {
    requiredQualifications: 0.40,    // 40% - Lower for entry-level
    preferredQualifications: 0.15,   // 15% - Nice to have
    softSkills: 0.15,               // 15% - Higher emphasis on attitude
    transferableSkills: 0.15,       // 15% - Very important for entry-level
    experience: 0.10,               // 10% - Less emphasis on specific experience
    resumeQuality: 0.05,            // 5%
    technicalDepth: 0,              // Not used for entry-level
    leadershipExperience: 0         // Not used for entry-level
  },
  'technical': {
    requiredQualifications: 0.55,    // 55% - Critical technical skills
    preferredQualifications: 0.20,   // 20% - Advanced skills
    technicalDepth: 0.10,           // 10% - Project complexity, depth
    experience: 0.08,               // 8% - Industry/role relevance
    softSkills: 0.05,               // 5% - Still important
    resumeQuality: 0.02,            // 2%
    transferableSkills: 0,          // Not used for technical roles
    leadershipExperience: 0         // Not used for technical roles
  },
  'operational': {
    requiredQualifications: 0.45,    // 45% - Management experience
    preferredQualifications: 0.20,   // 20% - Advanced qualifications
    leadershipExperience: 0.15,     // 15% - Leadership specific
    softSkills: 0.10,               // 10% - Communication, leadership
    experience: 0.07,               // 7% - Industry experience
    resumeQuality: 0.03,            // 3%
    transferableSkills: 0,          // Not used for operational roles
    technicalDepth: 0               // Not used for operational roles
  },
  'general': {
    requiredQualifications: 0.50,    // 50% - Balanced approach
    preferredQualifications: 0.20,   // 20% - Secondary factor
    softSkills: 0.10,               // 10% - Part of 30% other factors
    transferableSkills: 0.08,       // 8%
    experience: 0.07,               // 7% - Industry/role relevance
    resumeQuality: 0.05,            // 5%
    technicalDepth: 0,              // Not used for general roles
    leadershipExperience: 0         // Not used for general roles
  }
};

// Transferable Skills Rubric - Now part of main scoring (8%)
export const transferableSkillsRubric: RubricItem[] = [
  {
    id: 'transferable_skills',
    description: 'Transferable skills identified',
    maxPoints: 10,
    scoringGuide: {
      'multiple_strong': 10,
      'several_relevant': 7,
      'some_relevant': 5,
      'few_relevant': 3,
      'minimal': 1,
      'none': 0
    }
  }
];

/**
 * Get rubric configuration for a specific job type
 */
export function getRubricForJobType(jobType: string): CategoryRubric[] {
  const weights = jobTypeWeights[jobType as keyof typeof jobTypeWeights] || jobTypeWeights.general;
  const rubrics: CategoryRubric[] = [];
  
  // Always include required and preferred qualifications
  rubrics.push({
    category: 'requiredQualifications',
    weight: weights.requiredQualifications,
    items: requiredQualificationsRubric
  });
  
  rubrics.push({
    category: 'preferredQualifications',
    weight: weights.preferredQualifications,
    items: preferredQualificationsRubric
  });
  
  // Add job-type specific categories
  if (jobType === 'entry-level') {
    rubrics.push({
      category: 'softSkills',
      weight: weights.softSkills,
      items: softSkillsRubric
    });
    rubrics.push({
      category: 'transferableSkills',
      weight: weights.transferableSkills,
      items: transferableSkillsRubric
    });
    rubrics.push({
      category: 'experience',
      weight: weights.experience,
      items: experienceRubric
    });
  } else if (jobType === 'technical') {
    rubrics.push({
      category: 'technicalSkills',
      weight: weights.technicalDepth || 0.10,
      items: technicalSkillsRubric  // Focus on depth and complexity
    });
    rubrics.push({
      category: 'experience',
      weight: weights.experience,
      items: experienceRubric
    });
    rubrics.push({
      category: 'softSkills',
      weight: weights.softSkills,
      items: softSkillsRubric
    });
  } else if (jobType === 'operational') {
    // For operational roles, experience category covers leadership & industry
    rubrics.push({
      category: 'experience',
      weight: (weights.leadershipExperience || 0.15) + weights.experience,
      items: experienceRubric  // Includes career progression, achievements, industry match
    });
    rubrics.push({
      category: 'softSkills',
      weight: weights.softSkills,
      items: softSkillsRubric
    });
  } else {
    // General - balanced approach
    rubrics.push({
      category: 'softSkills',
      weight: weights.softSkills || 0.10,
      items: softSkillsRubric
    });
    rubrics.push({
      category: 'transferableSkills',
      weight: weights.transferableSkills || 0.08,
      items: transferableSkillsRubric
    });
    rubrics.push({
      category: 'experience',
      weight: weights.experience || 0.07,
      items: experienceRubric
    });
  }
  
  // Always add resume quality at the end
  rubrics.push({
    category: 'resumeQuality',
    weight: weights.resumeQuality,
    items: resumeQualityRubric
  });
  
  return rubrics;
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
  
  return maxScore;
}