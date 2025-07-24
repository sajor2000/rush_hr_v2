/**
 * Score calculator for mathematical computation of candidate scores
 * based on rubric evaluations
 */

import { RubricEvaluation, ScoreBreakdown, EnhancedJobRequirements } from '@/types';
import { 
  getRubricForJobType, 
  transferableSkillsBonus, 
  preferredQualificationsBonus,
  RubricItem
} from './scoringRubric';

/**
 * Calculate score for a single rubric item based on the evaluation
 */
function calculateItemScore(
  item: RubricItem, 
  evaluation: RubricEvaluation,
  jobRequirements: EnhancedJobRequirements
): { points: number; reason: string } {
  
  switch (item.id) {
    // Technical Skills Items
    case 'tech_exact_match': {
      const requiredTechs = jobRequirements.mustHave?.filter(req => 
        req.toLowerCase().includes('experience') || 
        req.includes('knowledge') ||
        req.includes('proficiency')
      ).length || 0;
      
      const foundTechs = evaluation.technicalSkills.requiredTechsFound.length;
      const percentage = requiredTechs > 0 ? (foundTechs / requiredTechs) * 100 : 0;
      
      let points = 0;
      let reason = '';
      
      if (percentage >= 100) {
        points = item.scoringGuide['all_required'];
        reason = `All ${requiredTechs} required technologies found`;
      } else if (percentage >= 75) {
        points = item.scoringGuide['75_percent'];
        reason = `${foundTechs} of ${requiredTechs} required technologies found`;
      } else if (percentage >= 50) {
        points = item.scoringGuide['50_percent'];
        reason = `${foundTechs} of ${requiredTechs} required technologies found`;
      } else if (percentage >= 25) {
        points = item.scoringGuide['25_percent'];
        reason = `${foundTechs} of ${requiredTechs} required technologies found`;
      } else {
        points = item.scoringGuide['none'];
        reason = 'No required technologies found';
      }
      
      return { points, reason };
    }
    
    case 'tech_similar': {
      const similarCount = evaluation.technicalSkills.similarTechsFound.length;
      let points = 0;
      let reason = '';
      
      if (similarCount >= 3) {
        points = item.scoringGuide['multiple_related'];
        reason = `${similarCount} related technologies found`;
      } else if (similarCount >= 1) {
        points = item.scoringGuide['some_related'];
        reason = `${similarCount} related technology found`;
      } else {
        points = item.scoringGuide['none'];
        reason = 'No related technologies found';
      }
      
      return { points, reason };
    }
    
    case 'tech_years': {
      const yearsRequired = extractYearsFromRequirements(jobRequirements.mustHave || []);
      const yearsFound = evaluation.technicalSkills.yearsOfExperience;
      
      let points = 0;
      let reason = '';
      
      if (yearsFound >= yearsRequired + 2) {
        points = item.scoringGuide['exceeds_requirement'];
        reason = `${yearsFound} years exceeds requirement of ${yearsRequired} years`;
      } else if (yearsFound >= yearsRequired) {
        points = item.scoringGuide['meets_requirement'];
        reason = `${yearsFound} years meets requirement`;
      } else if (yearsFound >= yearsRequired - 1) {
        points = item.scoringGuide['slightly_below'];
        reason = `${yearsFound} years slightly below requirement`;
      } else if (yearsFound > 0) {
        points = item.scoringGuide['significantly_below'];
        reason = `${yearsFound} years significantly below requirement`;
      } else {
        points = item.scoringGuide['none'];
        reason = 'No relevant experience found';
      }
      
      return { points, reason };
    }
    
    case 'tech_complexity': {
      const complexity = evaluation.technicalSkills.projectComplexity;
      const points = item.scoringGuide[complexity === 'enterprise' ? 'enterprise_scale' :
                                      complexity === 'medium' ? 'medium_complexity' :
                                      complexity === 'basic' ? 'basic_projects' :
                                      complexity === 'learning' ? 'learning_projects' : 'no_projects'];
      const reason = `Project complexity: ${complexity}`;
      return { points, reason };
    }
    
    // Experience Items
    case 'exp_industry': {
      const match = evaluation.experience.industryMatch;
      const key = match === 'exact' ? 'exact_industry' : match;
      const points = item.scoringGuide[key] || 0;
      const reason = `Industry match: ${match.replace('_', ' ')}`;
      return { points, reason };
    }
    
    case 'exp_role': {
      const match = evaluation.experience.roleMatch;
      const key = match === 'exact' ? 'exact_role' :
                  match === 'very_similar' ? 'very_similar' :
                  match === 'related' ? 'related_role' :
                  match === 'some_overlap' ? 'some_overlap' : 'different';
      const points = item.scoringGuide[key] || 0;
      const reason = `Role match: ${match.replace('_', ' ')}`;
      return { points, reason };
    }
    
    case 'exp_achievements': {
      const count = evaluation.experience.quantifiableAchievements.length;
      let points = 0;
      let reason = '';
      
      if (count >= 3) {
        points = item.scoringGuide['multiple_significant'];
        reason = `${count} quantifiable achievements`;
      } else if (count >= 2) {
        points = item.scoringGuide['some_significant'];
        reason = `${count} quantifiable achievements`;
      } else if (count === 1) {
        points = item.scoringGuide['basic_achievements'];
        reason = '1 quantifiable achievement';
      } else {
        points = item.scoringGuide['responsibilities_only'];
        reason = 'No quantifiable achievements';
      }
      
      return { points, reason };
    }
    
    case 'exp_progression': {
      const progression = evaluation.experience.careerProgression;
      const points = item.scoringGuide[progression] || 0;
      const reason = `Career progression: ${progression.replace(/_/g, ' ')}`;
      return { points, reason };
    }
    
    // Education Items
    case 'edu_degree': {
      const requirement = evaluation.education.meetsRequirement;
      const key = requirement === 'exceeds' ? 'exceeds_requirement' :
                  requirement === 'meets' ? 'meets_requirement' :
                  requirement === 'equivalent_experience' ? 'equivalent_experience' :
                  requirement === 'related' ? 'related_degree' : 'no_degree';
      const points = item.scoringGuide[key] || 0;
      const reason = `Education: ${requirement.replace('_', ' ')}`;
      return { points, reason };
    }
    
    case 'edu_relevance': {
      const relevance = evaluation.education.relevanceToRole;
      const points = item.scoringGuide[relevance] || 0;
      const reason = `Education relevance: ${relevance.replace(/_/g, ' ')}`;
      return { points, reason };
    }
    
    case 'edu_certifications': {
      const count = evaluation.education.certifications.length;
      let points = 0;
      let reason = '';
      
      if (count >= 2) {
        points = item.scoringGuide['multiple_relevant'];
        reason = `${count} relevant certifications`;
      } else if (count === 1) {
        points = item.scoringGuide['one_relevant'];
        reason = '1 relevant certification';
      } else {
        points = item.scoringGuide['none'];
        reason = 'No relevant certifications';
      }
      
      return { points, reason };
    }
    
    // Soft Skills Items
    case 'soft_communication': {
      const evidence = evaluation.softSkills.communicationEvidence;
      const key = evidence === 'extensive' ? 'extensive_evidence' :
                  evidence === 'good' ? 'good_evidence' :
                  evidence === 'some' ? 'some_evidence' : 'no_evidence';
      const points = item.scoringGuide[key] || 0;
      const reason = `Communication evidence: ${evidence}`;
      return { points, reason };
    }
    
    case 'soft_leadership': {
      const experience = evaluation.softSkills.leadershipExperience;
      const key = experience === 'formal' ? 'formal_leadership' :
                  experience === 'project' ? 'project_leadership' :
                  experience === 'team' ? 'team_collaboration' : 'individual_contributor';
      const points = item.scoringGuide[key] || 0;
      const reason = `Leadership: ${experience} level`;
      return { points, reason };
    }
    
    case 'soft_cultural_fit': {
      const indicators = evaluation.softSkills.culturalFitIndicators.length;
      let points = 0;
      let reason = '';
      
      if (indicators >= 3) {
        points = item.scoringGuide['strong_alignment'];
        reason = `Strong cultural alignment (${indicators} indicators)`;
      } else if (indicators >= 2) {
        points = item.scoringGuide['good_alignment'];
        reason = `Good cultural alignment (${indicators} indicators)`;
      } else if (indicators >= 1) {
        points = item.scoringGuide['neutral'];
        reason = 'Neutral cultural fit';
      } else {
        points = item.scoringGuide['concerns'];
        reason = 'No cultural fit indicators';
      }
      
      return { points, reason };
    }
    
    case 'soft_adaptability': {
      const adaptability = evaluation.softSkills.adaptabilityEvidence;
      const points = item.scoringGuide[adaptability] || 0;
      const reason = `Adaptability: ${adaptability.replace(/_/g, ' ')}`;
      return { points, reason };
    }
    
    // Resume Quality Items
    case 'quality_clarity': {
      const clarity = evaluation.resumeQuality.clarity;
      const points = item.scoringGuide[clarity] || 0;
      const reason = `Resume clarity: ${clarity}`;
      return { points, reason };
    }
    
    case 'quality_completeness': {
      const completeness = evaluation.resumeQuality.completeness;
      const points = item.scoringGuide[completeness] || 0;
      const reason = `Resume completeness: ${completeness}`;
      return { points, reason };
    }
    
    // Bonus Items
    case 'transferable_skills': {
      const count = evaluation.bonusFactors.transferableSkills.length;
      let points = 0;
      let reason = '';
      
      if (count >= 5) {
        points = item.scoringGuide['multiple_strong'];
        reason = `${count} transferable skills identified`;
      } else if (count >= 3) {
        points = item.scoringGuide['several_relevant'];
        reason = `${count} transferable skills identified`;
      } else if (count >= 2) {
        points = item.scoringGuide['some_relevant'];
        reason = `${count} transferable skills identified`;
      } else if (count === 1) {
        points = item.scoringGuide['few_relevant'];
        reason = '1 transferable skill identified';
      } else {
        points = item.scoringGuide['none'];
        reason = 'No transferable skills identified';
      }
      
      return { points, reason };
    }
    
    case 'preferred_quals': {
      const total = jobRequirements.niceToHave?.length || 0;
      const met = evaluation.bonusFactors.preferredQualificationsMet.length;
      const percentage = total > 0 ? (met / total) * 100 : 0;
      
      let points = 0;
      let reason = '';
      
      if (percentage >= 100) {
        points = item.scoringGuide['all_met'];
        reason = 'All preferred qualifications met';
      } else if (percentage >= 75) {
        points = item.scoringGuide['most_met'];
        reason = `${met} of ${total} preferred qualifications met`;
      } else if (percentage >= 50) {
        points = item.scoringGuide['some_met'];
        reason = `${met} of ${total} preferred qualifications met`;
      } else if (percentage > 0) {
        points = item.scoringGuide['few_met'];
        reason = `${met} of ${total} preferred qualifications met`;
      } else {
        points = item.scoringGuide['none'];
        reason = 'No preferred qualifications met';
      }
      
      return { points, reason };
    }
    
    default:
      return { points: 0, reason: 'Unknown rubric item' };
  }
}

/**
 * Extract years requirement from must-have list
 */
function extractYearsFromRequirements(mustHaves: string[]): number {
  for (const req of mustHaves) {
    const match = req.match(/(\d+)\+?\s*years?/i);
    if (match) {
      return parseInt(match[1]);
    }
  }
  return 0; // No specific years requirement found
}

/**
 * Calculate all scores based on rubric evaluation
 */
export function calculateScores(
  evaluation: RubricEvaluation,
  jobType: string,
  jobRequirements: EnhancedJobRequirements
): {
  scores: {
    overall: number;
    technicalSkills: number;
    experienceRelevance: number;
    educationCertifications: number;
    softSkillsCulture: number;
    resumeQuality: number;
    baseScore: number;
    bonusPoints: number;
  };
  breakdown: ScoreBreakdown[];
} {
  const rubrics = getRubricForJobType(jobType);
  const breakdown: ScoreBreakdown[] = [];
  let totalWeightedScore = 0;
  let bonusPoints = 0;
  
  // Calculate scores for each category
  const categoryScores: Record<string, number> = {};
  
  for (const categoryRubric of rubrics) {
    const categoryBreakdown: ScoreBreakdown = {
      category: categoryRubric.category,
      rawScore: 0,
      maxPossible: 0,
      weight: categoryRubric.weight,
      weightedScore: 0,
      details: []
    };
    
    // Calculate score for each item in the category
    for (const item of categoryRubric.items) {
      const { points, reason } = calculateItemScore(item, evaluation, jobRequirements);
      
      categoryBreakdown.details.push({
        item: item.description,
        points,
        maxPoints: item.maxPoints,
        reason
      });
      
      categoryBreakdown.rawScore += points;
      categoryBreakdown.maxPossible += item.maxPoints;
    }
    
    // Normalize to 0-100 scale for the category
    const normalizedScore = categoryBreakdown.maxPossible > 0 
      ? (categoryBreakdown.rawScore / categoryBreakdown.maxPossible) * 100
      : 0;
    
    // Apply weight
    categoryBreakdown.weightedScore = normalizedScore * categoryRubric.weight;
    totalWeightedScore += categoryBreakdown.weightedScore;
    
    // Store normalized score for the category
    categoryScores[categoryRubric.category] = Math.round(normalizedScore);
    
    breakdown.push(categoryBreakdown);
  }
  
  // Calculate bonus points
  const transferableScore = calculateItemScore(transferableSkillsBonus, evaluation, jobRequirements);
  const preferredScore = calculateItemScore(preferredQualificationsBonus, evaluation, jobRequirements);
  
  bonusPoints = transferableScore.points + preferredScore.points;
  
  // Add bonus breakdown
  breakdown.push({
    category: 'bonus',
    rawScore: bonusPoints,
    maxPossible: transferableSkillsBonus.maxPoints + preferredQualificationsBonus.maxPoints,
    weight: 0, // Bonus points are not weighted
    weightedScore: bonusPoints,
    details: [
      {
        item: transferableSkillsBonus.description,
        points: transferableScore.points,
        maxPoints: transferableSkillsBonus.maxPoints,
        reason: transferableScore.reason
      },
      {
        item: preferredQualificationsBonus.description,
        points: preferredScore.points,
        maxPoints: preferredQualificationsBonus.maxPoints,
        reason: preferredScore.reason
      }
    ]
  });
  
  // Calculate final scores
  const baseScore = Math.round(totalWeightedScore * 0.85); // Scale to 0-85 range
  const overall = Math.min(100, baseScore + bonusPoints);
  
  return {
    scores: {
      overall,
      technicalSkills: categoryScores['technicalSkills'] || 0,
      experienceRelevance: categoryScores['experience'] || 0,
      educationCertifications: categoryScores['education'] || 0,
      softSkillsCulture: categoryScores['softSkills'] || 0,
      resumeQuality: categoryScores['resumeQuality'] || 0,
      baseScore,
      bonusPoints
    },
    breakdown
  };
}

/**
 * Determine tier based on calculated score
 */
export function determineTier(score: number, jobType: string): string {
  if (jobType === 'entry-level') {
    if (score >= 85) return 'Top Tier';
    if (score >= 70) return 'Qualified';
    if (score >= 55) return 'Potential';
    return 'Not Qualified';
  } else if (jobType === 'technical') {
    if (score >= 90) return 'Top Tier';
    if (score >= 80) return 'Qualified';
    if (score >= 70) return 'Potential';
    return 'Not Qualified';
  } else {
    if (score >= 85) return 'Top Tier';
    if (score >= 75) return 'Qualified';
    if (score >= 65) return 'Potential';
    return 'Not Qualified';
  }
}