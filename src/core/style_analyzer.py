"""
SecondBrain Style Analyzer Module

This module analyzes content to extract style patterns, teaching frameworks, 
and communication characteristics unique to Tina's teaching approach.
"""

import os
import json
import logging
from typing import Dict, List, Optional, Union, Any
from pathlib import Path
import re
from collections import Counter, defaultdict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class StyleAnalyzer:
    """
    Core class for analyzing teaching style patterns in content.
    Extracts sentence structures, phrases, and communication patterns.
    """
    
    def __init__(self):
        """Initialize the StyleAnalyzer."""
        logger.info("Initializing StyleAnalyzer")
    
    def analyze_content(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze content to extract style characteristics.
        
        Args:
            content: Normalized content dictionary
            
        Returns:
            Dictionary containing style analysis results
        """
        content_text = content.get('content', '')
        if not content_text:
            return {'error': 'No content to analyze'}
        
        # Run analysis components
        sentence_analysis = self.analyze_sentence_structure(content_text)
        phrase_analysis = self.analyze_characteristic_phrases(content_text)
        question_analysis = self.analyze_questions(content_text)
        transition_analysis = self.analyze_transitions(content_text)
        storytelling_analysis = self.analyze_storytelling(content_text)
        
        # Combine results
        style_profile = {
            'sentence_structure': sentence_analysis,
            'characteristic_phrases': phrase_analysis,
            'questions': question_analysis,
            'transitions': transition_analysis,
            'storytelling': storytelling_analysis,
            'overall_profile': self._generate_overall_profile(
                sentence_analysis, 
                phrase_analysis,
                question_analysis,
                transition_analysis,
                storytelling_analysis
            )
        }
        
        return style_profile
    
    def analyze_sentence_structure(self, text: str) -> Dict[str, Any]:
        """
        Analyze sentence structure patterns.
        
        Args:
            text: Content text to analyze
            
        Returns:
            Dictionary of sentence structure metrics
        """
        # Split into sentences (simple approach)
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        # Calculate metrics
        sentence_lengths = [len(s.split()) for s in sentences]
        
        result = {
            'count': len(sentences),
            'length': {
                'average': sum(sentence_lengths) / max(len(sentence_lengths), 1),
                'min': min(sentence_lengths) if sentence_lengths else 0,
                'max': max(sentence_lengths) if sentence_lengths else 0,
                'distribution': {
                    'short': sum(1 for l in sentence_lengths if l <= 10) / max(len(sentence_lengths), 1),
                    'medium': sum(1 for l in sentence_lengths if 10 < l <= 20) / max(len(sentence_lengths), 1),
                    'long': sum(1 for l in sentence_lengths if l > 20) / max(len(sentence_lengths), 1)
                }
            },
            'types': {
                'declarative': self._count_sentence_type(sentences, r'[.]\s*$') / max(len(sentences), 1),
                'interrogative': self._count_sentence_type(sentences, r'[?]\s*$') / max(len(sentences), 1),
                'exclamatory': self._count_sentence_type(sentences, r'[!]\s*$') / max(len(sentences), 1)
            },
            'structure_patterns': self._identify_structure_patterns(sentences)
        }
        
        return result
    
    def _count_sentence_type(self, sentences: List[str], pattern: str) -> int:
        """Count sentences matching a specific pattern."""
        return sum(1 for s in sentences if re.search(pattern, s))
    
    def _identify_structure_patterns(self, sentences: List[str]) -> Dict[str, float]:
        """Identify common sentence structure patterns."""
        patterns = {
            'starts_with_conjunction': r'^(And|But|So|Or|Yet|For)\b',
            'starts_with_pronoun': r'^(I|You|We|They|He|She|It)\b',
            'starts_with_question_word': r'^(What|Why|How|When|Where|Who)\b',
            'contains_em_dash': r'—',
            'contains_parenthetical': r'\([^)]*\)',
            'contains_list': r'(?:, (?:and|or) )|(?:, [^,]+(?:, [^,]+)+)'
        }
        
        results = {}
        for name, pattern in patterns.items():
            matches = sum(1 for s in sentences if re.search(pattern, s, re.IGNORECASE))
            results[name] = matches / max(len(sentences), 1)
            
        return results
    
    def analyze_characteristic_phrases(self, text: str) -> Dict[str, Any]:
        """
        Identify characteristic phrases and expressions.
        
        Args:
            text: Content text to analyze
            
        Returns:
            Dictionary of phrase analysis results
        """
        # Define phrase categories to look for
        phrase_categories = {
            'emphasis': [
                r'let me be clear',
                r'here\'s the thing',
                r'the truth is',
                r'the reality is',
                r'i need you to understand',
                r'the key point',
                r'what\'s important'
            ],
            'storytelling': [
                r'let me tell you',
                r'i had a client',
                r'i worked with',
                r'for example',
                r'a few years ago'
            ],
            'audience_engagement': [
                r'think about',
                r'imagine if',
                r'ask yourself',
                r'consider this',
                r'can you see how'
            ],
            'value_statements': [
                r'what matters most',
                r'the real value',
                r'what\'s really important',
                r'the most important',
                r'what really counts'
            ],
            'action_prompts': [
                r'you need to',
                r'start by',
                r'the first step',
                r'begin with',
                r'take action'
            ]
        }
        
        # Count occurrences
        phrase_counts = {category: {} for category in phrase_categories}
        
        for category, phrases in phrase_categories.items():
            for phrase in phrases:
                matches = re.findall(phrase, text.lower())
                if matches:
                    phrase_counts[category][phrase] = len(matches)
        
        # Calculate category frequencies
        total_phrases = sum(sum(counts.values()) for counts in phrase_counts.values())
        category_frequencies = {}
        
        for category, counts in phrase_counts.items():
            category_sum = sum(counts.values())
            category_frequencies[category] = {
                'count': category_sum,
                'frequency': category_sum / max(total_phrases, 1) if total_phrases else 0,
                'top_phrases': sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]
            }
        
        # Extract other common phrases (n-grams) - simplified implementation
        ngrams = self._extract_common_ngrams(text, 3, 10)
        
        result = {
            'category_frequencies': category_frequencies,
            'common_ngrams': ngrams
        }
        
        return result
    
    def _extract_common_ngrams(self, text: str, n: int, top_count: int) -> List[Dict[str, Any]]:
        """Extract common n-grams from text."""
        words = re.findall(r'\b\w+\b', text.lower())
        ngrams = []
        
        for i in range(len(words) - n + 1):
            ngram = ' '.join(words[i:i+n])
            ngrams.append(ngram)
        
        # Count frequencies
        counter = Counter(ngrams)
        
        # Return top N
        top_ngrams = [
            {'ngram': ngram, 'count': count}
            for ngram, count in counter.most_common(top_count)
        ]
        
        return top_ngrams
    
    def analyze_questions(self, text: str) -> Dict[str, Any]:
        """
        Analyze question patterns in the content.
        
        Args:
            text: Content text to analyze
            
        Returns:
            Dictionary of question analysis results
        """
        # Extract questions
        questions = re.findall(r'[^.!?]*\?\s*', text)
        questions = [q.strip() for q in questions if q.strip()]
        
        # Categorize questions
        question_types = {
            'rhetorical': r'^(Do you know|Have you ever|Isn\'t it|Can you imagine|Are you ready)',
            'reflective': r'^(What if|How would|How might|What would|How could)',
            'direct': r'^(What is|How do|When should|Why is|Where)',
            'challenging': r'^(Why aren\'t you|What\'s stopping you|Why haven\'t you)',
            'leading': r'^(Don\'t you think|Wouldn\'t you agree|Shouldn\'t you)'
        }
        
        type_counts = {qtype: 0 for qtype in question_types}
        
        for question in questions:
            for qtype, pattern in question_types.items():
                if re.match(pattern, question, re.IGNORECASE):
                    type_counts[qtype] += 1
                    break
        
        # Calculate question positioning
        sections = self._divide_text_into_sections(text, 3)  # Divide into beginning, middle, end
        section_questions = []
        
        for section in sections:
            section_q = re.findall(r'[^.!?]*\?\s*', section)
            section_questions.append(len(section_q))
        
        question_positioning = {
            'beginning': section_questions[0] / max(sum(section_questions), 1) if section_questions else 0,
            'middle': section_questions[1] / max(sum(section_questions), 1) if len(section_questions) > 1 else 0,
            'end': section_questions[-1] / max(sum(section_questions), 1) if section_questions else 0
        }
        
        result = {
            'count': len(questions),
            'frequency': len(questions) / (len(text.split()) / 100),  # questions per 100 words
            'types': {
                qtype: {
                    'count': count,
                    'percentage': count / max(len(questions), 1)
                }
                for qtype, count in type_counts.items()
            },
            'positioning': question_positioning,
            'examples': questions[:5] if questions else []
        }
        
        return result
    
    def _divide_text_into_sections(self, text: str, num_sections: int) -> List[str]:
        """Divide text into equal sections."""
        words = text.split()
        section_size = len(words) // num_sections
        
        sections = []
        for i in range(0, len(words), section_size):
            section = ' '.join(words[i:i+section_size])
            sections.append(section)
            
            if len(sections) == num_sections:
                # Add any remaining words to the last section
                if i + section_size < len(words):
                    sections[-1] += ' ' + ' '.join(words[i+section_size:])
                break
                
        return sections
    
    def analyze_transitions(self, text: str) -> Dict[str, Any]:
        """
        Analyze transition techniques and patterns.
        
        Args:
            text: Content text to analyze
            
        Returns:
            Dictionary of transition analysis results
        """
        # Define transition categories
        transition_categories = {
            'contrast': [
                r'\bbut\b', r'\bhowever\b', r'\byet\b', r'\binstead\b', r'\bon the other hand\b',
                r'\bin contrast\b', r'\bdespite\b', r'\bnevertheless\b'
            ],
            'addition': [
                r'\band\b', r'\balso\b', r'\bin addition\b', r'\bfurthermore\b', r'\bmoreover\b',
                r'\badditionally\b', r'\bas well as\b'
            ],
            'example': [
                r'\bfor example\b', r'\bto illustrate\b', r'\bfor instance\b', r'\bspecifically\b',
                r'\bnamely\b', r'\blet\'s say\b'
            ],
            'cause_effect': [
                r'\bbecause\b', r'\btherefore\b', r'\bconsequently\b', r'\bas a result\b',
                r'\bso\b', r'\bthus\b', r'\bhence\b'
            ],
            'sequence': [
                r'\bfirst\b', r'\bsecond\b', r'\bnext\b', r'\bthen\b', r'\bfinally\b',
                r'\bafter\b', r'\bbefore\b', r'\bsubsequently\b'
            ],
            'conclusion': [
                r'\bin conclusion\b', r'\bto sum up\b', r'\bultimately\b', r'\bin summary\b',
                r'\boverall\b', r'\bthe bottom line\b'
            ]
        }
        
        # Count transitions by category
        transition_counts = {category: 0 for category in transition_categories}
        transition_examples = {category: [] for category in transition_categories}
        
        paragraphs = text.split('\n\n')
        paragraph_transitions = []
        
        # Analyze paragraph transitions
        for i in range(1, len(paragraphs)):
            prev_para = paragraphs[i-1]
            curr_para = paragraphs[i]
            
            # Get first 10 words of current paragraph
            first_words = ' '.join(curr_para.split()[:10])
            
            # Check for transition patterns
            found_transition = False
            for category, patterns in transition_categories.items():
                for pattern in patterns:
                    match = re.search(pattern, first_words, re.IGNORECASE)
                    if match:
                        transition_counts[category] += 1
                        transition_examples[category].append(match.group(0))
                        found_transition = True
                        break
                if found_transition:
                    break
                    
            paragraph_transitions.append(found_transition)
            
        # Calculate transition metrics
        total_transitions = sum(transition_counts.values())
        transition_frequency = total_transitions / max(len(paragraphs) - 1, 1)
        
        result = {
            'total_count': total_transitions,
            'frequency': transition_frequency,
            'paragraph_transitions': sum(paragraph_transitions) / max(len(paragraph_transitions), 1) if paragraph_transitions else 0,
            'categories': {
                category: {
                    'count': count,
                    'percentage': count / max(total_transitions, 1) if total_transitions else 0,
                    'examples': list(set(transition_examples[category]))[:3]
                }
                for category, count in transition_counts.items()
            }
        }
        
        return result
    
    def analyze_storytelling(self, text: str) -> Dict[str, Any]:
        """
        Analyze storytelling patterns and techniques.
        
        Args:
            text: Content text to analyze
            
        Returns:
            Dictionary of storytelling analysis results
        """
        # Look for story indicators
        story_indicators = [
            r'I had a client',
            r'I worked with',
            r'Let me tell you about',
            r'For example, I',
            r'A few years ago',
            r'I remember when',
            r'One of my clients',
            r'There was a time',
            r'I\'ve seen this happen'
        ]
        
        # Find potential story sections
        story_sections = []
        
        for indicator in story_indicators:
            matches = re.finditer(indicator, text, re.IGNORECASE)
            for match in matches:
                start_idx = match.start()
                
                # Try to find end of story (next paragraph or next story beginning)
                next_para = text.find('\n\n', start_idx)
                if next_para == -1:
                    next_para = len(text)
                
                # Check for another story indicator after this one
                next_story = float('inf')
                for indicator2 in story_indicators:
                    next_match = text.find(indicator2, start_idx + len(indicator))
                    if next_match != -1 and next_match < next_story:
                        next_story = next_match
                
                end_idx = min(next_para, next_story)
                
                story_sections.append({
                    'indicator': match.group(0),
                    'text': text[start_idx:end_idx].strip(),
                    'position': start_idx / len(text)  # Relative position in text
                })
        
        # Analyze story structure
        story_structure = {
            'has_challenge': 0,
            'has_resolution': 0,
            'has_lesson': 0
        }
        
        challenge_indicators = [
            r'struggle', r'problem', r'challenge', r'issue', r'difficult',
            r'wasn\'t working', r'couldn\'t', r'didn\'t know how'
        ]
        
        resolution_indicators = [
            r'solved', r'solution', r'figured out', r'resolved', r'overcame',
            r'managed to', r'succeeded', r'accomplished'
        ]
        
        lesson_indicators = [
            r'learned', r'lesson', r'takeaway', r'moral', r'key insight',
            r'what this means', r'the point is', r'what matters'
        ]
        
        for story in story_sections:
            story_text = story['text'].lower()
            
            # Check for challenge
            if any(re.search(pattern, story_text) for pattern in challenge_indicators):
                story_structure['has_challenge'] += 1
                
            # Check for resolution
            if any(re.search(pattern, story_text) for pattern in resolution_indicators):
                story_structure['has_resolution'] += 1
                
            # Check for lesson
            if any(re.search(pattern, story_text) for pattern in lesson_indicators):
                story_structure['has_lesson'] += 1
        
        # Calculate metrics
        total_stories = len(story_sections)
        
        result = {
            'count': total_stories,
            'frequency': total_stories / (len(text.split()) / 1000),  # Stories per 1000 words
            'positioning': {
                'beginning': sum(1 for s in story_sections if s['position'] < 0.33) / max(total_stories, 1) if total_stories else 0,
                'middle': sum(1 for s in story_sections if 0.33 <= s['position'] < 0.66) / max(total_stories, 1) if total_stories else 0,
                'end': sum(1 for s in story_sections if s['position'] >= 0.66) / max(total_stories, 1) if total_stories else 0
            },
            'structure': {
                'has_challenge': story_structure['has_challenge'] / max(total_stories, 1) if total_stories else 0,
                'has_resolution': story_structure['has_resolution'] / max(total_stories, 1) if total_stories else 0,
                'has_lesson': story_structure['has_lesson'] / max(total_stories, 1) if total_stories else 0,
                'complete': sum(1 for _ in range(total_stories) 
                               if all(story_structure.values())) / max(total_stories, 1) if total_stories else 0
            },
            'examples': [s['indicator'] for s in story_sections[:3]] if story_sections else []
        }
        
        return result
    
    def _generate_overall_profile(self, *analysis_components) -> Dict[str, Any]:
        """
        Generate overall style profile from individual analysis components.
        
        Args:
            *analysis_components: Individual analysis results
            
        Returns:
            Dictionary with overall style profile metrics
        """
        overall = {}
        
        # Extract sentence style
        sentence_analysis = analysis_components[0] if len(analysis_components) > 0 else {}
        if sentence_analysis:
            overall['sentence_style'] = {
                'prefers_short': sentence_analysis.get('length', {}).get('distribution', {}).get('short', 0) > 0.5,
                'uses_questions': sentence_analysis.get('types', {}).get('interrogative', 0) > 0.15,
                'uses_emphasis': sentence_analysis.get('types', {}).get('exclamatory', 0) > 0.05
            }
        
        # Extract communication style
        phrase_analysis = analysis_components[1] if len(analysis_components) > 1 else {}
        question_analysis = analysis_components[2] if len(analysis_components) > 2 else {}
        transition_analysis = analysis_components[3] if len(analysis_components) > 3 else {}
        
        category_scores = {}
        if phrase_analysis and 'category_frequencies' in phrase_analysis:
            for category, data in phrase_analysis['category_frequencies'].items():
                category_scores[category] = data.get('frequency', 0)
        
        top_categories = sorted(category_scores.items(), key=lambda x: x[1], reverse=True)
        dominant_category = top_categories[0][0] if top_categories else None
        
        question_frequency = question_analysis.get('frequency', 0) if question_analysis else 0
        transition_frequency = transition_analysis.get('frequency', 0) if transition_analysis else 0
        
        overall['communication_style'] = {
            'dominant_phrase_category': dominant_category,
            'question_frequency': 'high' if question_frequency > 5 else 'medium' if question_frequency > 2 else 'low',
            'transition_usage': 'high' if transition_frequency > 0.7 else 'medium' if transition_frequency > 0.4 else 'low'
        }
        
        # Extract storytelling style
        storytelling_analysis = analysis_components[4] if len(analysis_components) > 4 else {}
        
        if storytelling_analysis:
            overall['storytelling_style'] = {
                'frequency': 'high' if storytelling_analysis.get('frequency', 0) > 2 else 
                             'medium' if storytelling_analysis.get('frequency', 0) > 1 else 'low',
                'completeness': storytelling_analysis.get('structure', {}).get('complete', 0) > 0.6,
                'preferred_position': max(storytelling_analysis.get('positioning', {}).items(), 
                                        key=lambda x: x[1])[0] if storytelling_analysis.get('positioning') else None
            }
        
        # Overall style characterization
        overall['style_characteristics'] = {}
        
        # Conversational vs. Formal
        conversational_indicators = 0
        if sentence_analysis.get('length', {}).get('distribution', {}).get('short', 0) > 0.4:
            conversational_indicators += 1
        if sentence_analysis.get('structure_patterns', {}).get('starts_with_conjunction', 0) > 0.1:
            conversational_indicators += 1
        if question_analysis.get('frequency', 0) > 3:
            conversational_indicators += 1
        if phrase_analysis.get('category_frequencies', {}).get('audience_engagement', {}).get('frequency', 0) > 0.1:
            conversational_indicators += 1
        
        formality_scale = conversational_indicators / 4
        overall['style_characteristics']['formality'] = 'conversational' if formality_scale > 0.5 else 'balanced' if formality_scale > 0.3 else 'formal'
        
        # Direct vs. Indirect
        direct_indicators = 0
        if phrase_analysis.get('category_frequencies', {}).get('action_prompts', {}).get('frequency', 0) > 0.1:
            direct_indicators += 1
        if sentence_analysis.get('types', {}).get('exclamatory', 0) > 0.05:
            direct_indicators += 1
        if question_analysis.get('types', {}).get('direct', {}).get('percentage', 0) > 0.3:
            direct_indicators += 1
        if phrase_analysis.get('category_frequencies', {}).get('emphasis', {}).get('frequency', 0) > 0.1:
            direct_indicators += 1
            
        directness_scale = direct_indicators / 4
        overall['style_characteristics']['directness'] = 'direct' if directness_scale > 0.5 else 'balanced' if directness_scale > 0.3 else 'indirect'
        
        # Analytical vs. Emotional
        analytical_indicators = 0
        emotional_indicators = 0
        
        if transition_analysis.get('categories', {}).get('cause_effect', {}).get('percentage', 0) > 0.2:
            analytical_indicators += 1
        if transition_analysis.get('categories', {}).get('contrast', {}).get('percentage', 0) > 0.2:
            analytical_indicators += 1
            
        if storytelling_analysis.get('frequency', 0) > 2:
            emotional_indicators += 1
        if phrase_analysis.get('category_frequencies', {}).get('value_statements', {}).get('frequency', 0) > 0.1:
            emotional_indicators += 1
            
        overall['style_characteristics']['tone'] = 'analytical' if analytical_indicators > emotional_indicators else 'balanced' if analytical_indicators == emotional_indicators else 'emotional'
        
        return overall


class TeachingFrameworkAnalyzer:
    """
    Analyzes content to identify teaching frameworks and patterns.
    """
    
    def __init__(self):
        """Initialize the TeachingFrameworkAnalyzer."""
        logger.info("Initializing TeachingFrameworkAnalyzer")
        
        # Define known frameworks
        self.known_frameworks = {
            'value_ladder': {
                'indicators': [
                    r'value ladder', r'lead magnet', r'tripwire', r'core offer', r'upsell'
                ],
                'components': [
                    'free_content', 'low_level_offer', 'core_offer', 'upsell'
                ]
            },
            'three_tier_service': {
                'indicators': [
                    r'three.tier', r'high.level.tier', r'mid.level.tier', r'entry.level'
                ],
                'components': [
                    'high_tier', 'mid_tier', 'low_tier'
                ]
            },
            'ten_percent_rule': {
                'indicators': [
                    r'10%.rule', r'ten percent', r'highest price', r'add 10%'
                ],
                'components': [
                    'current_price', 'comfort_zone', 'price_increase', 'market_testing'
                ]
            },
            'profit_first': {
                'indicators': [
                    r'profit first', r'income account', r'profit account', r'tax account', r'operating expense'
                ],
                'components': [
                    'income_allocation', 'profit_percentage', 'tax_percentage', 'expense_percentage'
                ]
            },
            'effective_hourly_rate': {
                'indicators': [
                    r'effective hourly rate', r'hourly rate', r'project fee', r'hours spent'
                ],
                'components': [
                    'calculation', 'interpretation', 'optimization'
                ]
            }
        }
    
    def analyze_content(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze content to extract teaching frameworks.
        
        Args:
            content: Normalized content dictionary
            
        Returns:
            Dictionary containing framework analysis results
        """
        content_text = content.get('content', '')
        if not content_text:
            return {'error': 'No content to analyze'}
        
        # Identify frameworks
        framework_matches = self._identify_frameworks(content_text)
        
        # Extract framework instances
        framework_instances = self._extract_framework_instances(content_text, framework_matches)
        
        # Analyze framework structure
        framework_structures = self._analyze_framework_structure(framework_instances)
        
        # Generate outcome
        result = {
            'identified_frameworks': framework_matches,
            'framework_instances': framework_instances,
            'framework_structures': framework_structures
        }
        
        return result
    
    def _identify_frameworks(self, text: str) -> Dict[str, Dict[str, Any]]:
        """
        Identify known frameworks in the text.
        
        Args:
            text: Content text to analyze
            
        Returns:
            Dictionary of identified frameworks with confidence scores
        """
        results = {}
        
        for framework_id, framework_data in self.known_frameworks.items():
            indicators = framework_data['indicators']
            
            # Count indicator matches
            matches = 0
            matched_indicators = []
            
            for indicator in indicators:
                indicator_matches = re.findall(indicator, text, re.IGNORECASE)
                if indicator_matches:
                    matches += len(indicator_matches)
                    matched_indicators.append(indicator)
            
            # Calculate confidence score
            confidence = min(1.0, matches / (len(indicators) * 2)) if indicators else 0
            
            # Only include frameworks with some evidence
            if confidence > 0:
                results[framework_id] = {
                    'confidence': confidence,
                    'matched_indicators': matched_indicators,
                    'match_count': matches
                }
        
        return results
    
    def _extract_framework_instances(self, text: str, framework_matches: Dict[str, Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Extract instances of identified frameworks from text.
        
        Args:
            text: Content text to analyze
            framework_matches: Dictionary of identified frameworks
            
        Returns:
            Dictionary mapping framework IDs to lists of framework instances
        """
        instances = {framework_id: [] for framework_id in framework_matches}
        paragraphs = text.split('\n\n')
        
        for framework_id, match_data in framework_matches.items():
            framework_data = self.known_frameworks[framework_id]
            indicators = framework_data['indicators']
            
            # Look for framework instances in paragraphs
            for i, para in enumerate(paragraphs):
                para_lower = para.lower()
                
                # Check if paragraph contains framework indicators
                if any(re.search(indicator, para_lower) for indicator in indicators):
                    # Find the start of the framework explanation
                    start_idx = i
                    
                    # Try to find the entire framework explanation (may span multiple paragraphs)
                    end_idx = start_idx
                    components_found = set()
                    
                    # Look at subsequent paragraphs for components
                    for j in range(start_idx, min(start_idx + 10, len(paragraphs))):
                        para_j = paragraphs[j].lower()
                        
                        # Check for framework components
                        new_components = set()
                        for component in framework_data['components']:
                            # Convert snake_case to regex pattern
                            component_pattern = component.replace('_', '[ _]')
                            if re.search(component_pattern, para_j):
                                new_components.add(component)
                        
                        # If we found components, extend the range
                        if new_components:
                            components_found.update(new_components)
                            end_idx = j
                        # If we found no new components and already have some, we might be at the end
                        elif components_found and j > start_idx + 1:
                            break
                    
                    # Create a framework instance
                    instance_text = '\n\n'.join(paragraphs[start_idx:end_idx+1])
                    
                    instance = {
                        'text': instance_text,
                        'components_found': list(components_found),
                        'completeness': len(components_found) / len(framework_data['components']),
                        'position': {
                            'start_paragraph': start_idx,
                            'end_paragraph': end_idx
                        }
                    }
                    
                    instances[framework_id].append(instance)
                    
                    # Skip ahead to avoid overlapping instances
                    i = end_idx
        
        return instances
    
    def _analyze_framework_structure(self, framework_instances: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Dict[str, Any]]:
        """
        Analyze the structure of extracted framework instances.
        
        Args:
            framework_instances: Dictionary of framework instances
            
        Returns:
            Dictionary with structural analysis of each framework
        """
        result = {}
        
        for framework_id, instances in framework_instances.items():
            if not instances:
                continue
                
            framework_data = self.known_frameworks[framework_id]
            expected_components = framework_data['components']
            
            # Analyze component presence
            component_presence = {component: 0 for component in expected_components}
            component_order = []
            
            for instance in instances:
                # Count component presence
                for component in instance['components_found']:
                    if component in component_presence:
                        component_presence[component] += 1
                
                # Analyze component order in this instance
                instance_components = []
                for component in expected_components:
                    component_pattern = component.replace('_', '[ _]')
                    if re.search(component_pattern, instance['text'].lower()):
                        instance_components.append(component)
                
                if instance_components:
                    component_order.append(instance_components)
            
            # Calculate component frequencies
            component_frequencies = {
                component: count / len(instances) 
                for component, count in component_presence.items()
            }
            
            # Determine typical order
            typical_order = None
            if component_order:
                # Simplified approach - use first instance with most components
                typical_order = max(component_order, key=len)
            
            result[framework_id] = {
                'component_frequencies': component_frequencies,
                'typical_order': typical_order,
                'completeness': sum(component_frequencies.values()) / len(component_frequencies) if component_frequencies else 0
            }
        
        return result


class ObjectionHandlerAnalyzer:
    """
    Analyzes content to identify objection handling patterns.
    """
    
    def __init__(self):
        """Initialize the ObjectionHandlerAnalyzer."""
        logger.info("Initializing ObjectionHandlerAnalyzer")
        
        # Define common objection types
        self.objection_types = {
            'price_too_high': [
                r"too expensive", r"can't afford", r"budget", r"cost too much",
                r"don't have the money", r"pricing"
            ],
            'not_expert_enough': [
                r"not expert enough", r"not qualified", r"impostor syndrome",
                r"who am I to", r"expert enough", r"credentials"
            ],
            'no_time': [
                r"don't have time", r"too busy", r"schedule", r"time commitment",
                r"how long will it take"
            ],
            'fear_of_failure': [
                r"what if it doesn't work", r"what if I fail", r"success rate",
                r"guarantee", r"risk"
            ],
            'market_saturation': [
                r"market is saturated", r"too much competition", r"niche is crowded",
                r"differentiator", r"stand out"
            ]
        }
        
        # Define handling techniques
        self.handling_techniques = {
            'acknowledge': r"(I understand|I get it|That's a valid concern|I hear you|That's a common concern)",
            'reframe': r"(Let's look at this differently|Consider it this way|Reframe this|From another perspective|Instead of thinking)",
            'provide_evidence': r"(I've seen|The data shows|According to|Research indicates|Statistics show|The evidence)",
            'use_story': r"(I had a client|Let me tell you about|For example|I worked with|One of my clients)",
            'future_pacing': r"(Imagine if|What if|Picture yourself|Fast forward|Think about when)"
        }
    
    def analyze_content(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze content to extract objection handling patterns.
        
        Args:
            content: Normalized content dictionary
            
        Returns:
            Dictionary containing objection handling analysis
        """
        content_text = content.get('content', '')
        if not content_text:
            return {'error': 'No content to analyze'}
        
        # Identify objections addressed
        objections = self._identify_objections(content_text)
        
        # Extract handling instances
        handling_instances = self._extract_handling_instances(content_text, objections)
        
        # Analyze handling techniques
        handling_techniques = self._analyze_handling_techniques(handling_instances)
        
        # Generate outcome
        result = {
            'identified_objections': objections,
            'handling_instances': handling_instances,
            'handling_techniques': handling_techniques
        }
        
        return result
    
    def _identify_objections(self, text: str) -> Dict[str, Dict[str, Any]]:
        """
        Identify objections addressed in the text.
        
        Args:
            text: Content text to analyze
            
        Returns:
            Dictionary of identified objections with confidence scores
        """
        results = {}
        
        for objection_id, indicators in self.objection_types.items():
            # Count indicator matches
            matches = 0
            matched_indicators = []
            
            for indicator in indicators:
                indicator_matches = re.findall(indicator, text, re.IGNORECASE)
                if indicator_matches:
                    matches += len(indicator_matches)
                    matched_indicators.append(indicator)
            
            # Calculate confidence score
            confidence = min(1.0, matches / (len(indicators) * 1.5)) if indicators else 0
            
            # Only include objections with some evidence
            if confidence > 0:
                results[objection_id] = {
                    'confidence': confidence,
                    'matched_indicators': matched_indicators,
                    'match_count': matches
                }
        
        return results
    
    def _extract_handling_instances(self, text: str, objections: Dict[str, Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Extract instances of objection handling from text.
        
        Args:
            text: Content text to analyze
            objections: Dictionary of identified objections
            
        Returns:
            Dictionary mapping objection IDs to lists of handling instances
        """
        instances = {objection_id: [] for objection_id in objections}
        paragraphs = text.split('\n\n')
        
        for objection_id, objection_data in objections.items():
            indicators = self.objection_types[objection_id]
            
            # Look for objection handling in paragraphs
            for i, para in enumerate(paragraphs):
                para_lower = para.lower()
                
                # Check if paragraph contains objection indicators
                if any(re.search(indicator, para_lower) for indicator in indicators):
                    # Find the start of the objection handling
                    start_idx = i
                    
                    # Try to find the entire objection handling (may span multiple paragraphs)
                    end_idx = start_idx
                    handling_found = False
                    
                    # Look at subsequent paragraphs for handling techniques
                    for j in range(start_idx, min(start_idx + 5, len(paragraphs))):
                        para_j = paragraphs[j].lower()
                        
                        # Check for handling techniques
                        techniques_found = []
                        for technique_id, pattern in self.handling_techniques.items():
                            if re.search(pattern, para_j, re.IGNORECASE):
                                techniques_found.append(technique_id)
                        
                        # If we found techniques, extend the range
                        if techniques_found:
                            handling_found = True
                            end_idx = j
                        # If we found no techniques and already have some, we might be at the end
                        elif handling_found and j > start_idx + 1:
                            break
                    
                    # Create a handling instance
                    instance_text = '\n\n'.join(paragraphs[start_idx:end_idx+1])
                    
                    # Identify techniques used
                    techniques_used = []
                    for technique_id, pattern in self.handling_techniques.items():
                        if re.search(pattern, instance_text, re.IGNORECASE):
                            techniques_used.append(technique_id)
                    
                    instance = {
                        'text': instance_text,
                        'techniques_used': techniques_used,
                        'technique_count': len(techniques_used),
                        'position': {
                            'start_paragraph': start_idx,
                            'end_paragraph': end_idx
                        }
                    }
                    
                    instances[objection_id].append(instance)
                    
                    # Skip ahead to avoid overlapping instances
                    i = end_idx
        
        return instances
    
    def _analyze_handling_techniques(self, handling_instances: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Dict[str, Any]]:
        """
        Analyze the techniques used in objection handling instances.
        
        Args:
            handling_instances: Dictionary of handling instances
            
        Returns:
            Dictionary with analysis of handling techniques for each objection
        """
        result = {}
        
        for objection_id, instances in handling_instances.items():
            if not instances:
                continue
            
            # Analyze technique usage
            technique_usage = {technique: 0 for technique in self.handling_techniques}
            technique_sequences = []
            
            for instance in instances:
                # Count technique usage
                for technique in instance['techniques_used']:
                    if technique in technique_usage:
                        technique_usage[technique] += 1
                
                # Record technique sequence
                if instance['techniques_used']:
                    technique_sequences.append(instance['techniques_used'])
            
            # Calculate technique frequencies
            technique_frequencies = {
                technique: count / len(instances) 
                for technique, count in technique_usage.items()
            }
            
            # Determine typical sequence
            typical_sequence = None
            if technique_sequences:
                # Simplified approach - use first instance with most techniques
                typical_sequence = max(technique_sequences, key=len)
            
            result[objection_id] = {
                'technique_frequencies': technique_frequencies,
                'typical_sequence': typical_sequence,
                'technique_diversity': len([t for t, f in technique_frequencies.items() if f > 0]) / len(technique_frequencies)
            }
        
        return result


def create_style_profile(content_id: str, style_analysis: Dict[str, Any], 
                         framework_analysis: Dict[str, Any], objection_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a comprehensive style profile from multiple analysis results.
    
    Args:
        content_id: ID of the analyzed content
        style_analysis: Style analysis results
        framework_analysis: Framework analysis results
        objection_analysis: Objection handling analysis results
        
    Returns:
        Comprehensive style profile
    """
    profile = {
        'content_id': content_id,
        'timestamp': import_from_js('Date.now')() if _is_js_environment() else None,
        'voice_characteristics': _extract_voice_characteristics(style_analysis),
        'teaching_approaches': _extract_teaching_approaches(framework_analysis),
        'objection_handling': _extract_objection_handling(objection_analysis),
        'communication_patterns': _extract_communication_patterns(style_analysis)
    }
    
    return profile


def _extract_voice_characteristics(style_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Extract voice characteristics from style analysis."""
    if not style_analysis or 'overall_profile' not in style_analysis:
        return {}
    
    overall = style_analysis['overall_profile']
    
    return {
        'sentence_style': overall.get('sentence_style', {}),
        'formality': overall.get('style_characteristics', {}).get('formality'),
        'directness': overall.get('style_characteristics', {}).get('directness'),
        'tone': overall.get('style_characteristics', {}).get('tone'),
        'characteristic_phrases': _get_top_phrases(style_analysis)
    }


def _extract_teaching_approaches(framework_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Extract teaching approaches from framework analysis."""
    if not framework_analysis or 'identified_frameworks' not in framework_analysis:
        return {}
    
    frameworks = {}
    for framework_id, data in framework_analysis.get('identified_frameworks', {}).items():
        if framework_id in framework_analysis.get('framework_structures', {}):
            structure = framework_analysis['framework_structures'][framework_id]
            frameworks[framework_id] = {
                'confidence': data.get('confidence', 0),
                'completeness': structure.get('completeness', 0),
                'typical_order': structure.get('typical_order')
            }
    
    return {
        'frameworks': frameworks,
        'dominant_framework': max(frameworks.items(), key=lambda x: x[1]['confidence'])[0] if frameworks else None
    }


def _extract_objection_handling(objection_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Extract objection handling from analysis."""
    if not objection_analysis or 'identified_objections' not in objection_analysis:
        return {}
    
    objections = {}
    for objection_id, data in objection_analysis.get('identified_objections', {}).items():
        if objection_id in objection_analysis.get('handling_techniques', {}):
            techniques = objection_analysis['handling_techniques'][objection_id]
            objections[objection_id] = {
                'confidence': data.get('confidence', 0),
                'technique_diversity': techniques.get('technique_diversity', 0),
                'typical_sequence': techniques.get('typical_sequence')
            }
    
    return {
        'addressed_objections': objections,
        'primary_objection': max(objections.items(), key=lambda x: x[1]['confidence'])[0] if objections else None
    }


def _extract_communication_patterns(style_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Extract communication patterns from style analysis."""
    if not style_analysis:
        return {}
    
    patterns = {}
    
    # Extract question patterns
    if 'questions' in style_analysis:
        question_data = style_analysis['questions']
        patterns['questions'] = {
            'frequency': question_data.get('frequency'),
            'dominant_type': max(question_data.get('types', {}).items(), 
                                key=lambda x: x[1].get('percentage', 0))[0]
                                if question_data.get('types') else None,
            'preferred_position': max(question_data.get('positioning', {}).items(),
                                     key=lambda x: x[1])[0]
                                     if question_data.get('positioning') else None
        }
    
    # Extract transition patterns
    if 'transitions' in style_analysis:
        transition_data = style_analysis['transitions']
        patterns['transitions'] = {
            'frequency': transition_data.get('frequency'),
            'dominant_category': max(transition_data.get('categories', {}).items(),
                                   key=lambda x: x[1].get('percentage', 0))[0]
                                   if transition_data.get('categories') else None
        }
    
    # Extract storytelling patterns
    if 'storytelling' in style_analysis:
        storytelling_data = style_analysis['storytelling']
        patterns['storytelling'] = {
            'frequency': storytelling_data.get('frequency'),
            'completeness': storytelling_data.get('structure', {}).get('complete'),
            'preferred_position': max(storytelling_data.get('positioning', {}).items(),
                                    key=lambda x: x[1])[0]
                                    if storytelling_data.get('positioning') else None
        }
    
    return patterns


def _get_top_phrases(style_analysis: Dict[str, Any]) -> List[str]:
    """Extract top characteristic phrases from style analysis."""
    phrases = []
    
    if 'characteristic_phrases' in style_analysis:
        phrase_data = style_analysis['characteristic_phrases']
        if 'category_frequencies' in phrase_data:
            for category, data in phrase_data['category_frequencies'].items():
                if 'top_phrases' in data:
                    phrases.extend([phrase for phrase, count in data['top_phrases']])
    
    return phrases[:10]  # Return top 10 phrases


def _is_js_environment() -> bool:
    """Check if running in JavaScript environment."""
    try:
        import js
        return True
    except ImportError:
        return False


def import_from_js(name):
    """Import a JavaScript global if in JS environment."""
    if _is_js_environment():
        import js
        return getattr(js.globalThis, name)
    return None


def main():
    """Example usage of the style analysis modules."""
    import glob
    from pathlib import Path
    
    from content_processor import ContentProcessor, ContentNormalizer
    
    # Setup
    processor = ContentProcessor()
    normalizer = ContentNormalizer()
    style_analyzer = StyleAnalyzer()
    framework_analyzer = TeachingFrameworkAnalyzer()
    objection_analyzer = ObjectionHandlerAnalyzer()
    
    # Process sample content
    try:
        # Find sample content
        content_dir = os.path.join(os.getcwd(), 'processed_content')
        if not os.path.exists(content_dir):
            content_dir = '/Volumes/Envoy/SecondBrain/processed_content'
        
        sample_files = glob.glob(os.path.join(content_dir, '*.json'))[:1]
        
        if not sample_files:
            logger.error("No sample files found")
            return
            
        # Process the first sample file
        sample_file = sample_files[0]
        logger.info(f"Processing sample file: {sample_file}")
        
        # Read and normalize content
        content = processor.process_file(sample_file)
        normalized = normalizer.normalize(content)
        
        # Analyze style
        style_analysis = style_analyzer.analyze_content(normalized)
        framework_analysis = framework_analyzer.analyze_content(normalized)
        objection_analysis = objection_analyzer.analyze_content(normalized)
        
        # Create style profile
        profile = create_style_profile(
            normalized.get('id', 'sample'),
            style_analysis,
            framework_analysis,
            objection_analysis
        )
        
        # Save results
        output_dir = os.path.join(os.path.dirname(content_dir), 'style_analysis')
        os.makedirs(output_dir, exist_ok=True)
        
        with open(os.path.join(output_dir, 'sample_style_profile.json'), 'w', encoding='utf-8') as f:
            json.dump(profile, f, indent=2)
            
        logger.info(f"Saved style profile to {output_dir}/sample_style_profile.json")
            
    except Exception as e:
        logger.error(f"Error in main processing: {str(e)}")
        raise


if __name__ == "__main__":
    main()