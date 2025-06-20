"""
Text mapping functionality for medical concepts
"""

import re
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class TextSpan:
    """Represents a span of text that might contain a medical concept"""
    text: str
    start: int
    end: int


class TextMapper:
    """Map free text to medical concepts"""
    
    def __init__(self, search_engine=None):
        self.search_engine = search_engine
        
        # Common medical patterns
        self.medication_patterns = [
            r'\b(\w+)\s+(\d+)\s*mg\b',  # medication dose
            r'\b(\w+)\s+(\d+)\s*mcg\b',
            r'\b(\w+)\s+(\d+)\s*units?\b',
        ]
        
        # Common condition keywords
        self.condition_keywords = [
            'diabetes', 'hypertension', 'infection', 'disease', 'disorder',
            'syndrome', 'cancer', 'failure', 'insufficiency', 'deficiency'
        ]
    
    async def map_text(self,
                      text: str,
                      ontologies: List[str],
                      context: Optional[str] = None,
                      threshold: float = 0.7) -> List[Dict[str, Any]]:
        """
        Map free text to medical concepts
        
        Args:
            text: Input text to analyze
            ontologies: Target ontologies for mapping
            context: Clinical context (e.g., 'diagnosis', 'medication')
            threshold: Minimum confidence threshold
            
        Returns:
            List of mappings with text spans and matched concepts
        """
        if not self.search_engine:
            raise RuntimeError("Search engine not initialized")
        
        # Extract potential medical terms
        candidates = self._extract_candidates(text, context)
        
        # Map each candidate to concepts
        mappings = []
        
        for candidate in candidates:
            # Search for the term
            results = await self.search_engine.search(
                candidate.text,
                ontologies,
                limit=3
            )
            
            # Find best matches above threshold
            best_matches = {}
            
            for ontology, concepts in results.items():
                if concepts and concepts[0].get('score', 0) >= threshold:
                    best_match = concepts[0]
                    best_matches[ontology] = {
                        'code': best_match['code'],
                        'preferred_term': best_match['preferred_term'],
                        'confidence': best_match.get('score', 0)
                    }
            
            if best_matches:
                mappings.append({
                    'text_span': candidate.text,
                    'start': candidate.start,
                    'end': candidate.end,
                    'mappings': best_matches
                })
        
        return mappings
    
    def _extract_candidates(self, text: str, context: Optional[str] = None) -> List[TextSpan]:
        """Extract candidate terms from text"""
        candidates = []
        
        # Simple approach: extract noun phrases and medical patterns
        # In a real implementation, this would use NLP libraries
        
        # Look for medication patterns
        if context != 'diagnosis':
            for pattern in self.medication_patterns:
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    candidates.append(TextSpan(
                        text=match.group(1),
                        start=match.start(),
                        end=match.start() + len(match.group(1))
                    ))
        
        # Look for condition keywords
        text_lower = text.lower()
        for keyword in self.condition_keywords:
            # Find keyword and surrounding words
            pattern = r'\b(\w+\s+)?' + re.escape(keyword) + r'(\s+\w+)?\b'
            for match in re.finditer(pattern, text_lower):
                full_match = match.group(0).strip()
                start_pos = match.start()
                
                # Get original case version
                original_text = text[start_pos:start_pos + len(full_match)]
                
                candidates.append(TextSpan(
                    text=original_text,
                    start=start_pos,
                    end=start_pos + len(full_match)
                ))
        
        # Extract individual medical-looking terms
        # Simple heuristic: capitalized words that might be medical terms
        words = text.split()
        current_pos = 0
        
        for word in words:
            # Find word position in original text
            word_start = text.find(word, current_pos)
            if word_start == -1:
                continue
            
            current_pos = word_start + len(word)
            
            # Check if it looks like a medical term
            if (len(word) > 4 and 
                (word[0].isupper() or word.lower() in ['metformin', 'aspirin', 'insulin'])):
                
                candidates.append(TextSpan(
                    text=word,
                    start=word_start,
                    end=word_start + len(word)
                ))
        
        # Remove duplicates
        seen = set()
        unique_candidates = []
        for candidate in candidates:
            key = (candidate.text.lower(), candidate.start)
            if key not in seen:
                seen.add(key)
                unique_candidates.append(candidate)
        
        return unique_candidates