#!/usr/bin/env python3
"""
SecondBrain Context Persistence System - Verification Tests

This module contains tests to verify that the context persistence system
properly preserves context according to the fundamental requirements:
- NEVER truncate or simplify
- Maintain full surrounding context (±5 paragraphs)
- Preserve emotional context completely
- Maintain chronological integrity
- Preserve associative connections
- Include complete source identification

The tests use actual examples to validate the entire context pipeline.
"""

import os
import json
import uuid
import re
import datetime
import unittest
from typing import List, Dict, Any, Optional

# Import the context persistence system components
from context_persistence_system import (
    load_env,
    extract_with_full_context,
    retrieve_context_by_id,
    split_into_paragraphs,
    get_paragraph,
    identify_speakers,
    extract_emotional_markers,
    get_embedding
)

from agent_context_integration import (
    create_agent_with_context,
    SessionContext
)

# Load environment variables
load_env()

class TestData:
    """Test data for context verification."""
    
    @staticmethod
    def get_test_text_with_paragraphs() -> str:
        """
        Get a test text with multiple paragraphs for extraction testing.
        
        Returns:
            Test text with multiple paragraphs
        """
        return """
# Simple Finance Systems: What Comes In > What Goes Out

When I talk about finance systems for small businesses, I always start with the most fundamental rule: what comes in must be greater than what goes out. This isn't just accounting 101; it's the survival principle that so many entrepreneurs seem to forget.

Let me be absolutely clear about something: Your business is not your personal ATM. I don't care how many entrepreneurial podcasts tell you to "pay yourself first." If your business can't reliably generate more cash than it consumes, you won't have a business for long - and then you won't be able to pay yourself at all.

## The Three-Account System

The simplest, most effective financial system I've ever encountered is what I call the Three-Account System. It's embarrassingly simple, but that's precisely why it works when complex budgeting systems fail.

Here's how it works:

1. **Income Account**: ALL money from sales comes here first
2. **Tax Account**: Immediately move 25-30% of income here
3. **Operating Account**: Transfer what's left to run the business

The genius of this system is that it forces you to confront reality. When the operating account runs low, you have only two legitimate options: increase income or decrease expenses. There's no third magical option.

Most entrepreneurs miss this entirely. They use a single account for everything, so they never truly know their financial position. Then, when tax season arrives, they're shocked to discover they've spent money that wasn't actually theirs to spend.

## Profit Clarity Through Separation

Think of these three accounts as creating a financial boundary system. Money in your Income account isn't really yours yet. Part of it belongs to the government, and you're just temporarily holding it.

I had a client - let's call her Sarah - who increased her take-home pay by $4,000 per month simply by implementing this system. Not because she made more sales, but because she stopped fooling herself about how much money was actually available to spend.

Sarah was making about $20,000 a month in revenue but always felt broke. When we separated her accounts, she realized she had been spending tax money on operating expenses. Once that stopped, she was forced to make hard decisions about what expenses were truly necessary.

## The Power of Regular Financial Reviews

The Three-Account System works best when paired with regular financial reviews. At minimum, you should review your numbers weekly, asking:

1. What came in this week?
2. What went out this week?
3. What's my current position?
4. What adjustments do I need to make?

Most business owners avoid these reviews because they don't want to face reality. But reality doesn't go away just because you ignore it. In fact, ignoring financial reality only ensures it will come crashing down on you at the worst possible moment.

I've worked with hundreds of entrepreneurs over my career, and I can tell you with absolute certainty that the business owners who conduct regular financial reviews sleep better at night. Not because they always like what they see, but because they're never blindsided.

## From Information to Action

The entire point of a financial system is to give you actionable information. If your system doesn't lead to clear actions, it's just busywork.

After every financial review, you should be able to answer this question: "Based on these numbers, what's the single most important financial action I should take this week?"

Sometimes that action is to follow up on outstanding invoices. Sometimes it's to raise your prices. Sometimes it's to cut an expense. The specific action will vary, but you should always know what it is.

Most business failures I've witnessed weren't due to sudden catastrophes. They were the result of small financial issues that went unaddressed for too long. The business owner didn't have a system that converted financial information into clear actions.

Remember this: Your business finances are like a garden. A little attention every day keeps everything healthy. Neglect them for too long, and the weeds will take over.
"""
    
    @staticmethod
    def get_test_text_with_speakers() -> str:
        """
        Get a test text with multiple speakers for speaker identification testing.
        
        Returns:
            Test text with multiple speakers
        """
        return """
Transcript: Simple Time Mastery Workshop

Tina: Welcome everyone to our Simple Time Mastery workshop. Today we're going to talk about the most mismanaged resource in business: time. Before we dive in, I want to ask you a question: How many of you feel like you never have enough time in your day?

Participant 1: *raises hand* I'm constantly overwhelmed. I have a to-do list that never ends.

Tina: I hear that a lot. And what's interesting is that we all have exactly the same amount of time - 24 hours in a day. So the difference between people who feel time-wealthy and people who feel time-poor isn't about how much time they have. It's about how they're managing that time.

Participant 2: But some people have more responsibilities than others. I'm running my business while also taking care of my family.

Tina: That's absolutely true, and I'm not saying everyone's circumstances are the same. What I am saying is that within your circumstances, how you manage your time makes an enormous difference. Let me show you what I mean with a simple exercise.

Tina: I want everyone to take out a piece of paper and write down everything you did yesterday in 30-minute blocks. Be honest - no one else will see this.

*Group works on exercise for 5 minutes*

Tina: Now, I want you to mark each block with one of three labels: high-value, low-value, or no-value. High-value activities directly contribute to your income or well-being. Low-value activities are necessary but don't directly generate results. No-value activities are pure distractions.

Participant 3: Wow, I spent way more time on no-value activities than I realized.

Tina: That's a common discovery. Most people are shocked when they see how their time is actually spent versus how they think it's spent. This clarity is the first step toward mastering your time.

Participant 4: I'm seeing that I spend a lot of time on social media throughout the day. Small chunks, but they add up.

Tina: Those small chunks are what I call "time leaks." Individually, they seem insignificant, but together they can drain hours from your day. The good news is that once you spot them, you can start to patch those leaks.

Tina: Let's talk about the Time Block Method, which is the simplest, most effective time management system I've ever used. Instead of managing a to-do list, you schedule specific blocks of time for your high-value activities. Everything gets an appointment in your calendar.

Participant 5: But what about unexpected things that come up during the day?

Tina: Great question. You'll want to build buffer time into your schedule for exactly that reason. I recommend blocking only 60-70% of your day, leaving the rest as flexible time to handle the unexpected. Remember, the goal isn't perfect adherence to a schedule. The goal is intentionality about how you use your time.
"""
    
    @staticmethod
    def get_test_text_with_emotional_markers() -> str:
        """
        Get a test text with emotional markers for emotional context testing.
        
        Returns:
            Test text with emotional markers
        """
        return """
# Mindset and Heart: The Inner Game of Business

I want to talk about something that doesn't get enough attention in business education: the INNER game. Everyone focuses on strategies and tactics, but your mindset will make or break your business long before your marketing plan does.

Here's a truth that might be uncomfortable: Your business will never outgrow YOUR limitations. It just won't. Your business is a direct reflection of what's going on inside your head and heart.

I had a client once - I'll call him James - who was *brilliant* at what he did. Technically gifted, creative, hardworking... but his business was struggling. When we dug deeper, we discovered that James had a deeply held belief that "money corrupts people." 

Can you see the problem? James was unconsciously SABOTAGING his own success because part of him believed that becoming too successful would make him a bad person! This wasn't a strategy problem. It was a mindset problem.

Once James recognized this belief and worked to reframe it — understanding that money is neutral and can be used for tremendous good — his business grew by 40% in six months. Nothing else changed! Same services, same market, same marketing. Just a different mindset.

Let me be very clear about something: This isn't some fluffy, feel-good nonsense. Your mindset is PRACTICAL. It affects every decision you make, how you show up with clients, the opportunities you see or miss, and how resilient you are when facing challenges.

I've seen businesses with "perfect" business models fail because the owner couldn't handle the emotional rollercoaster of entrepreneurship. And I've seen "imperfect" businesses thrive because the owner had unwavering belief and emotional stability.

There are five mindset shifts that I believe every entrepreneur needs to make:

1. From perfectionism to iteration
2. From scarcity to abundance
3. From comparison to focus
4. From victim to creator
5. From fear to calculated risk

Today, I want to focus on the first one: moving from perfectionism to iteration.

Perfectionism is the ENEMY of progress! I see so many entrepreneurs who won't launch until everything is "perfect." But here's the truth — and please write this down — DONE is better than PERFECT.

When you embrace iteration, you understand that version 1.0 just needs to WORK, not be perfect. You can improve it in version 1.1, 1.2, and so on. This mindset gets you to market faster, generates revenue sooner, and — this is crucial — gives you REAL feedback instead of hypothetical scenarios.

The entrepreneurs who win aren't the ones with perfect products. They're the ones who get their solutions in front of customers quickly, listen intently, and improve rapidly.

What area of your business are you currently over-perfecting? Where could you release something that's good enough and then improve based on feedback? I'd love to hear your thoughts on this...
"""

    @staticmethod
    def get_test_text_with_story() -> str:
        """
        Get a test text with a complete story for story preservation testing.
        
        Returns:
            Test text with a complete story
        """
        return """
# Building Your Dream Team: The Right People at the Right Time

One of the biggest challenges entrepreneurs face is knowing when and how to build their team. Hire too soon, and you'll drain your cash reserves. Hire too late, and you'll burn yourself out. Hire the wrong person, and you'll create more problems than solutions.

Let me tell you a story about a client of mine named Michael. Michael ran a digital marketing agency that was growing quickly. He was working 70-hour weeks and turning away potential clients because he just couldn't handle the workload.

When Michael came to me, he was convinced he needed to hire another full-time marketing specialist immediately. His logic seemed sound: he had more work than he could handle, so he needed another person just like him, right?

But when we dug into his workday, we discovered something interesting. Michael wasn't spending most of his time on specialized marketing work. He was spending it on administrative tasks, client communication, proposal writing, and invoicing. All important tasks, but none requiring his specialized expertise.

So instead of hiring another marketing specialist for $75,000 a year, we identified his first hire should be an administrative assistant at $45,000. This person could take over all the tasks that were necessary but weren't the highest use of Michael's time and expertise.

Within a month of making this hire, Michael's workweek dropped from 70 hours to 45, and his capacity to take on new clients doubled. All because he made the right hire for his actual needs, not what he initially assumed he needed.

The moral of this story is that your first hire should almost never be a clone of you. It should be someone who can take over the tasks that are necessary but not the highest value use of your time.

This leads me to what I call the Dream Team Framework. Building your team isn't about hiring as many people as possible as quickly as possible. It's about methodically filling the roles that will create the most leverage for your time and expertise.

Here's the process I recommend:

1. Track your activities for two weeks to identify where your time is really going
2. Categorize each activity as either $10/hour, $100/hour, or $1,000/hour work
3. Look for patterns to identify which lower-value tasks are consuming your time
4. Create a role that bundles these lower-value tasks together
5. Hire for that specific role with clear expectations and outcomes

The beauty of this approach is that it ensures each hire you make directly increases your capacity to do your highest-value work. Over time, you'll build a team where everyone is focusing on what they do best, creating a much more efficient and effective organization.

Remember Michael's story. The right hire at the right time transformed his business and his life. And it all started with getting clear on what he actually needed, not what he assumed he needed.

What about you? Have you tracked your activities recently to see where your time is really going? This simple exercise is often the first step toward making a hiring decision that truly moves your business forward.
"""

class ContextPreservationTests(unittest.TestCase):
    """Tests for the context preservation system."""
    
    def setUp(self):
        """Set up for tests."""
        # Create a test directory if it doesn't exist
        self.test_dir = os.path.join(os.path.dirname(__file__), "test_data")
        os.makedirs(self.test_dir, exist_ok=True)
    
    def test_paragraph_extraction(self):
        """Test that paragraphs are correctly extracted."""
        text = TestData.get_test_text_with_paragraphs()
        paragraphs = split_into_paragraphs(text)
        
        # Verify we have the expected number of paragraphs
        self.assertGreaterEqual(len(paragraphs), 10, 
                              "Should extract at least 10 paragraphs")
        
        # Verify that the first paragraph contains the expected text
        self.assertIn("Simple Finance Systems", paragraphs[0], 
                     "First paragraph should contain the title")
        
        # Verify that we can get a specific paragraph
        third_para_text = "Let me be absolutely clear about something"
        third_para = next((p for p in paragraphs if third_para_text in p), None)
        self.assertIsNotNone(third_para, 
                           f"Could not find paragraph with '{third_para_text}'")
    
    def test_context_extraction_preserves_minimum_paragraphs(self):
        """Test that context extraction preserves at least ±5 paragraphs."""
        text = TestData.get_test_text_with_paragraphs()
        
        # Create a test file
        test_file = os.path.join(self.test_dir, "finance_systems.txt")
        with open(test_file, "w") as f:
            f.write(text)
        
        # Extract context with a pattern in the middle
        # The Three-Account System is around paragraph 5-6
        try:
            with open(test_file, "r") as f:
                file_text = f.read()
                context_id = extract_with_full_context(file_text, ["Three-Account System"])
            
            # Verify context was extracted
            self.assertIsNotNone(context_id, "Context extraction should succeed")
            
            # Retrieve the extracted context
            context = retrieve_context_by_id(context_id)
            self.assertIsNotNone(context, "Should be able to retrieve the context")
            
            # Count paragraphs in the extracted context
            extracted_paragraphs = split_into_paragraphs(context["full_context"])
            
            # Find the paragraph containing the pattern
            pattern_para_idx = next((i for i, p in enumerate(extracted_paragraphs) 
                                    if "Three-Account System" in p), -1)
            
            self.assertGreaterEqual(pattern_para_idx, 5, 
                                  "Should have at least 5 paragraphs before the pattern")
            
            self.assertGreaterEqual(len(extracted_paragraphs) - pattern_para_idx - 1, 5,
                                  "Should have at least 5 paragraphs after the pattern")
        
        except Exception as e:
            self.fail(f"Context extraction failed with error: {e}")
    
    def test_speaker_identification(self):
        """Test that speakers are correctly identified and preserved."""
        text = TestData.get_test_text_with_speakers()
        
        # Identify speakers
        speakers = identify_speakers(text)
        
        # Verify that we identified the correct speakers
        speaker_names = [s["name"] for s in speakers]
        self.assertIn("Tina", speaker_names, "Should identify Tina as a speaker")
        
        # Verify we have multiple participants
        participant_count = sum(1 for name in speaker_names if "Participant" in name)
        self.assertGreaterEqual(participant_count, 3, 
                              "Should identify at least 3 participants")
        
        # Verify that segments are preserved
        tina_segments = next((s["segments"] for s in speakers if s["name"] == "Tina"), [])
        self.assertGreaterEqual(len(tina_segments), 5, 
                              "Should preserve at least 5 segments for Tina")
    
    def test_emotional_marker_extraction(self):
        """Test that emotional markers are correctly extracted and preserved."""
        text = TestData.get_test_text_with_emotional_markers()
        
        # Extract emotional markers
        markers = extract_emotional_markers(text)
        
        # Verify that we extracted emphasis markers (ALL CAPS)
        emphasis_markers = [m for m in markers if m["type"] == "emphasis"]
        self.assertGreaterEqual(len(emphasis_markers), 3, 
                              "Should extract at least 3 emphasis markers")
        
        # Check for specific emphasized text
        emphasized_text = [m["text"] for m in emphasis_markers]
        self.assertTrue(any("INNER" in text for text in emphasized_text), 
                       "Should extract INNER as emphasized")
        self.assertTrue(any("SABOTAGING" in text for text in emphasized_text), 
                       "Should extract SABOTAGING as emphasized")
        
        # Verify that we extracted pause markers
        pause_markers = [m for m in markers if m["type"] == "pause"]
        self.assertGreaterEqual(len(pause_markers), 1, 
                              "Should extract at least 1 pause marker")
    
    def test_story_preservation(self):
        """Test that complete stories are preserved."""
        text = TestData.get_test_text_with_story()
        
        # Create a test file
        test_file = os.path.join(self.test_dir, "dream_team.txt")
        with open(test_file, "w") as f:
            f.write(text)
        
        # Extract context with a pattern in the middle of the story
        try:
            with open(test_file, "r") as f:
                file_text = f.read()
                context_id = extract_with_full_context(file_text, ["Michael"])
            
            # Verify context was extracted
            self.assertIsNotNone(context_id, "Context extraction should succeed")
            
            # Retrieve the extracted context
            context = retrieve_context_by_id(context_id)
            self.assertIsNotNone(context, "Should be able to retrieve the context")
            
            # Verify that the entire story is preserved
            full_context = context["full_context"]
            
            # Check for story beginning
            self.assertIn("Let me tell you a story about a client of mine named Michael", 
                         full_context, "Story beginning should be preserved")
            
            # Check for story middle
            self.assertIn("administrative assistant at $45,000", 
                         full_context, "Story middle should be preserved")
            
            # Check for story end/moral
            self.assertIn("The moral of this story", 
                         full_context, "Story moral should be preserved")
        
        except Exception as e:
            self.fail(f"Story preservation test failed with error: {e}")
    
    def test_agent_context_integration(self):
        """Test that agents can access and use preserved context."""
        # Create a test agent
        agent = create_agent_with_context("planner")
        
        # Create a test context
        text = TestData.get_test_text_with_paragraphs()
        test_file = os.path.join(self.test_dir, "finance_systems_for_agent.txt")
        with open(test_file, "w") as f:
            f.write(text)
        
        try:
            # Extract and store context
            with open(test_file, "r") as f:
                file_text = f.read()
                context_id = extract_with_full_context(file_text, ["Three-Account System"])
            
            # Verify context was extracted
            self.assertIsNotNone(context_id, "Context extraction should succeed")
            
            # Get context for the agent using a relevant query
            contexts = agent.get_context_for_query("financial systems for business")
            
            # Verify that the agent received at least one context
            self.assertGreaterEqual(len(contexts), 1, 
                                  "Agent should receive at least one context")
            
            # Verify that the context contains the key concept
            context_content = contexts[0]["content"]
            self.assertIn("Three-Account System", context_content, 
                         "Agent context should include the key concept")
            
            # Format the context as a prompt
            prompt = agent.format_contexts_as_prompt()
            
            # Verify the prompt contains the full context
            self.assertGreaterEqual(len(prompt), len(context_content), 
                                  "Prompt should contain the full context")
            
            # Verify the prompt is properly formatted
            self.assertIn("# Relevant Context", prompt, 
                         "Prompt should have a relevant context heading")
            
        except Exception as e:
            self.fail(f"Agent context integration test failed with error: {e}")
    
    def test_multiagent_context_sharing(self):
        """Test that context can be shared across multiple agents."""
        # Create a session with multiple agents
        session = SessionContext()
        planner = session.add_agent("planner")
        executor = session.add_agent("executor")
        
        # Create a test context
        text = TestData.get_test_text_with_story()
        test_file = os.path.join(self.test_dir, "dream_team_for_session.txt")
        with open(test_file, "w") as f:
            f.write(text)
        
        try:
            # Extract and store context
            with open(test_file, "r") as f:
                file_text = f.read()
                context_id = extract_with_full_context(file_text, ["Dream Team Framework"])
            
            # Verify context was extracted
            self.assertIsNotNone(context_id, "Context extraction should succeed")
            
            # Get context for the planner agent
            planner_contexts = planner.get_context_for_query("building a team for business")
            
            # Verify that the planner received the context
            self.assertGreaterEqual(len(planner_contexts), 1, 
                                  "Planner should receive at least one context")
            
            # Now get context for the executor agent with a similar query
            executor_contexts = executor.get_context_for_query("team building process")
            
            # Verify that the executor received the context
            self.assertGreaterEqual(len(executor_contexts), 1, 
                                  "Executor should receive at least one context")
            
            # Verify that both agents received the same key concept
            planner_content = planner_contexts[0]["content"]
            executor_content = executor_contexts[0]["content"]
            
            self.assertIn("Dream Team Framework", planner_content, 
                         "Planner context should include the key concept")
            self.assertIn("Dream Team Framework", executor_content, 
                         "Executor context should include the key concept")
            
        except Exception as e:
            self.fail(f"Multi-agent context sharing test failed with error: {e}")
    
    def test_embedding_quality(self):
        """Test that embeddings capture semantic meaning effectively."""
        try:
            # Generate embeddings for similar concepts
            embedding1 = get_embedding("business financial systems")
            embedding2 = get_embedding("managing company finances")
            
            # Generate embedding for an unrelated concept
            embedding3 = get_embedding("gardening techniques for beginners")
            
            # Helper function to calculate cosine similarity
            def cosine_similarity(v1, v2):
                dot_product = sum(a * b for a, b in zip(v1, v2))
                magnitude1 = sum(a * a for a in v1) ** 0.5
                magnitude2 = sum(b * b for b in v2) ** 0.5
                return dot_product / (magnitude1 * magnitude2)
            
            # Calculate similarities
            sim_related = cosine_similarity(embedding1, embedding2)
            sim_unrelated = cosine_similarity(embedding1, embedding3)
            
            # Verify that related concepts have higher similarity
            self.assertGreater(sim_related, 0.7, 
                             "Related concepts should have high similarity")
            self.assertLess(sim_unrelated, 0.5, 
                          "Unrelated concepts should have low similarity")
            self.assertGreater(sim_related, sim_unrelated, 
                             "Related concepts should be more similar than unrelated ones")
            
        except Exception as e:
            self.fail(f"Embedding quality test failed with error: {e}")
    
    def tearDown(self):
        """Clean up after tests."""
        # Remove test files
        for filename in os.listdir(self.test_dir):
            file_path = os.path.join(self.test_dir, filename)
            if os.path.isfile(file_path):
                os.unlink(file_path)

# Additional verification tests for the entire pipeline
class EndToEndVerificationTests(unittest.TestCase):
    """End-to-end tests for the complete context preservation pipeline."""
    
    def setUp(self):
        """Set up for tests."""
        # Create a test directory if it doesn't exist
        self.test_dir = os.path.join(os.path.dirname(__file__), "test_data")
        os.makedirs(self.test_dir, exist_ok=True)
        
        # Create a test session
        self.session = SessionContext()
        
        # Create a set of test files with different patterns
        self.create_test_files()
    
    def create_test_files(self):
        """Create a set of test files with different patterns."""
        # Finance systems text
        with open(os.path.join(self.test_dir, "finance_systems.txt"), "w") as f:
            f.write(TestData.get_test_text_with_paragraphs())
        
        # Time mastery text
        with open(os.path.join(self.test_dir, "time_mastery.txt"), "w") as f:
            f.write(TestData.get_test_text_with_speakers())
        
        # Mindset text
        with open(os.path.join(self.test_dir, "mindset.txt"), "w") as f:
            f.write(TestData.get_test_text_with_emotional_markers())
        
        # Dream team text
        with open(os.path.join(self.test_dir, "dream_team.txt"), "w") as f:
            f.write(TestData.get_test_text_with_story())
    
    def test_end_to_end_extraction_and_retrieval(self):
        """Test the complete extraction, storage, and retrieval pipeline."""
        try:
            # Extract context from all test files
            context_ids = []
            
            # Finance systems
            with open(os.path.join(self.test_dir, "finance_systems.txt"), "r") as f:
                context_ids.append(extract_with_full_context(f.read(), ["Three-Account System"]))
            
            # Time mastery
            with open(os.path.join(self.test_dir, "time_mastery.txt"), "r") as f:
                context_ids.append(extract_with_full_context(f.read(), ["Time Block Method"]))
            
            # Mindset
            with open(os.path.join(self.test_dir, "mindset.txt"), "r") as f:
                context_ids.append(extract_with_full_context(f.read(), ["mindset shifts"]))
            
            # Dream team
            with open(os.path.join(self.test_dir, "dream_team.txt"), "r") as f:
                context_ids.append(extract_with_full_context(f.read(), ["Dream Team Framework"]))
            
            # Verify all extractions succeeded
            self.assertEqual(len(context_ids), 4, "Should extract context from all 4 files")
            self.assertTrue(all(context_ids), "All context extractions should succeed")
            
            # Create a planner agent
            planner = self.session.add_agent("planner")
            
            # Test retrieval for multiple queries
            queries = [
                "financial systems for small business",
                "time management techniques",
                "entrepreneur mindset",
                "hiring and team building"
            ]
            
            for query in queries:
                contexts = planner.get_context_for_query(query)
                
                # Verify that we got at least one context for each query
                self.assertGreaterEqual(len(contexts), 1, 
                                      f"Should get at least one context for query '{query}'")
                
                # Verify that the context is relevant to the query
                if "financial" in query:
                    self.assertTrue(any("Three-Account System" in c["content"] for c in contexts),
                                  "Financial query should return context with Three-Account System")
                
                elif "time" in query:
                    self.assertTrue(any("Time Block Method" in c["content"] for c in contexts),
                                  "Time query should return context with Time Block Method")
                
                elif "mindset" in query:
                    self.assertTrue(any("mindset shifts" in c["content"] for c in contexts),
                                  "Mindset query should return context with mindset shifts")
                
                elif "team" in query:
                    self.assertTrue(any("Dream Team Framework" in c["content"] for c in contexts),
                                  "Team query should return context with Dream Team Framework")
            
            # Test cross-domain contexts
            complex_query = "building systems for business growth"
            contexts = planner.get_context_for_query(complex_query)
            
            # Complex query should return multiple relevant contexts
            self.assertGreaterEqual(len(contexts), 2, 
                                  "Complex query should return multiple contexts")
            
        except Exception as e:
            self.fail(f"End-to-end test failed with error: {e}")
    
    def test_preservation_requirements_compliance(self):
        """
        Test that the system complies with all preservation requirements.
        This test validates against each specific requirement in the PRESERVATION_REQUIREMENTS.md.
        """
        try:
            # Extract a context with a story
            with open(os.path.join(self.test_dir, "dream_team.txt"), "r") as f:
                context_id = extract_with_full_context(f.read(), ["Michael"])
            
            # Retrieve the context
            context = retrieve_context_by_id(context_id)
            
            # 1. Full Surrounding Context
            paragraphs = split_into_paragraphs(context["full_context"])
            self.assertGreaterEqual(len(paragraphs), 10, 
                                  "Should extract at least 10 paragraphs for full context")
            
            # 2. Complete Emotional Context
            self.assertIsNotNone(context.get("emotional_markers"), 
                               "Should include emotional markers")
            
            # 3. Chronological Integrity
            self.assertIn("timestamps", context, "Should include timestamps")
            
            # 4. Associative Connections
            self.assertIn("related_patterns", context, "Should include related patterns")
            
            # 5. Source Identification
            source = context.get("source", {})
            self.assertIn("file", source, "Should include source file")
            self.assertIn("session_type", source, "Should include session type")
            
            # 6. Technical Implementation
            # Verify full context is stored, not a summary
            original_text = None
            with open(os.path.join(self.test_dir, "dream_team.txt"), "r") as f:
                original_text = f.read()
            
            # The stored context should contain substantial portions of the original text
            self.assertTrue(
                len(context["full_context"]) > len(original_text) * 0.5,
                "Stored context should contain a substantial portion of the original text"
            )
            
        except Exception as e:
            self.fail(f"Preservation requirements compliance test failed with error: {e}")
    
    def tearDown(self):
        """Clean up after tests."""
        # Remove test files
        for filename in os.listdir(self.test_dir):
            file_path = os.path.join(self.test_dir, filename)
            if os.path.isfile(file_path):
                os.unlink(file_path)

# Run the tests
if __name__ == "__main__":
    import sys
    
    # Create the test data directory if it doesn't exist
    test_dir = os.path.join(os.path.dirname(__file__), "test_data")
    os.makedirs(test_dir, exist_ok=True)
    
    # Run specific tests if specified
    if len(sys.argv) > 1:
        test_name = sys.argv[1]
        test_suite = unittest.TestSuite()
        
        if test_name == "context":
            test_suite.addTest(unittest.makeSuite(ContextPreservationTests))
        elif test_name == "end_to_end":
            test_suite.addTest(unittest.makeSuite(EndToEndVerificationTests))
        else:
            print(f"Unknown test: {test_name}")
            print("Available tests: context, end_to_end")
            sys.exit(1)
        
        unittest.TextTestRunner().run(test_suite)
    else:
        # Run all tests
        unittest.main()