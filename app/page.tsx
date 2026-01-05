"use client";

import React, { useState } from 'react';
import { Lightbulb, Zap, Code, Users, DollarSign, Clock, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

interface Solution {
  name: string;
  description: string;
  advantages: string[];
  complexity: string;
  timeEstimate: string;
  technologies: string[];
}

interface ProblemTwist {
  label: string;
  prompt: string;
}

const MultiSolutionSolver = () => {
  const [problem, setProblem] = useState('');
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [expandedSolution, setExpandedSolution] = useState<number | null>(null);

  const generateSolutions = async () => {
    if (!problem.trim()) {
      alert('Please enter a problem statement first!');
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey) {
      alert('OpenRouter API key is not configured. Please add NEXT_PUBLIC_OPENROUTER_API_KEY to your .env.local file.');
      return;
    }

    setLoading(true);
    setLoadingStep('Step 1/3: Generating problem perspectives');
    setSolutions([]);

    try {
      // Stage 1: Generate problem twists
      const twists = await generateProblemTwists(problem, apiKey);

      // Stage 2: Parallel solver calls
      setLoadingStep('Step 2/3: Exploring multiple models');
      const candidateSolutions = await generateCandidateSolutions(twists, problem, apiKey);

      // Stage 3: Claude judge to rank and merge
      setLoadingStep('Step 3/3: Claude ranking solutions');
      const finalSolutions = await claudeJudge(candidateSolutions, problem, apiKey);

      setSolutions(finalSolutions);
    } catch (error) {
      console.error('Error in solution generation pipeline:', error);
      alert(`Error generating solutions: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const generateProblemTwists = async (problem: string, apiKey: string): Promise<ProblemTwist[]> => {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `Given this problem statement: "${problem}"

Generate exactly 3 alternative formulations of this problem from different perspectives. Each formulation should approach the problem from a unique angle (e.g., enterprise vs consumer, mobile-first vs web-first, technical vs user-experience focused).

Format your response as valid JSON:
{
  "twists": [
    { "label": "Short label (e.g., 'Enterprise Focus')", "prompt": "Rewritten problem statement from this perspective..." },
    { "label": "Short label (e.g., 'Mobile-First')", "prompt": "Rewritten problem statement from this perspective..." },
    { "label": "Short label (e.g., 'UX-Centric')", "prompt": "Rewritten problem statement from this perspective..." }
  ]
}

Respond with ONLY the JSON, no other text.`
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to generate problem twists: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Twist generation error: ${data.error.message}`);
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('No response from twist generation');
    }

    const cleanText = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanText);

    return parsed.twists || [];
  };

  const generateCandidateSolutions = async (twists: ProblemTwist[], originalProblem: string, apiKey: string): Promise<Solution[]> => {
    const solverModels = [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o-mini',
      'deepseek/deepseek-r1:free'
    ];

    const allPromises = [];

    // Create all combinations of twists × models
    for (const twist of twists) {
      for (const model of solverModels) {
        allPromises.push(
          fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: model,
              max_tokens: 800,
              messages: [{
                role: 'user',
                content: `Problem perspective: ${twist.label}
Rewritten problem: "${twist.prompt}"

Generate exactly 2 different solution approaches for this specific problem perspective. For each approach, provide:
1. A creative name for the approach
2. A detailed description (3-4 sentences explaining the approach thoroughly)
3. Key advantages
4. Implementation complexity (Low/Medium/High)
5. Time estimate to build
6. Main technologies/tools needed

Format your response as valid JSON:
{
  "solutions": [
    {
      "name": "Solution Name",
      "description": "Detailed description",
      "advantages": ["advantage1", "advantage2"],
      "complexity": "Medium",
      "timeEstimate": "2-3 days",
      "technologies": ["tech1", "tech2"]
    }
  ]
}

Respond with ONLY the JSON, no other text.`
              }]
            })
          }).then(async (response) => {
            if (!response.ok) return null;

            const data = await response.json();
            if (data.error) return null;

            const text = data.choices?.[0]?.message?.content;
            if (!text) return null;

            try {
              const cleanText = text.replace(/```json|```/g, '').trim();
              const parsed = JSON.parse(cleanText);
              return parsed.solutions || [];
            } catch {
              return null;
            }
          }).catch(() => null)
        );
      }
    }

    // Wait for all requests to complete
    const results = await Promise.all(allPromises);

    // Flatten and filter valid solutions
    const candidateSolutions: Solution[] = [];
    results.forEach(result => {
      if (result && Array.isArray(result)) {
        candidateSolutions.push(...result);
      }
    });

    return candidateSolutions;
  };

  const claudeJudge = async (candidateSolutions: Solution[], originalProblem: string, apiKey: string): Promise<Solution[]> => {
    if (candidateSolutions.length === 0) {
      // Fallback: direct Claude call
      console.log('No candidate solutions, using direct Claude fallback');
      return await fallbackDirectCall(originalProblem, apiKey);
    }

    // First try Claude
    try {
      console.log('Attempting Claude judge with', candidateSolutions.length, 'candidates');
      const result = await tryClaudeJudge(candidateSolutions, originalProblem, apiKey);
      return result;
    } catch (error) {
      console.error('Claude judge failed:', error);

      // Always try alternatives when Claude fails (not just 402 errors)
      console.log('Claude failed, trying alternative judge models...');
      try {
        return await fallbackJudgeWithAlternatives(candidateSolutions, originalProblem, apiKey);
      } catch (fallbackError) {
        console.error('All judge models failed:', fallbackError);
        // Return top candidates as final fallback
        console.log('Using final fallback: returning top candidate solutions');
        return candidateSolutions.slice(0, 5);
      }
    }
  };

  const fallbackDirectCall = async (originalProblem: string, apiKey: string): Promise<Solution[]> => {
    const models = ['openai/gpt-4o', 'openai/gpt-4o-mini', 'deepseek/deepseek-r1:free'];

    for (const model of models) {
      try {
        console.log(`Trying fallback model: ${model}`);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: `Given this problem statement: "${originalProblem}"

Generate exactly 5 different solution approaches. For each approach, provide:
1. A creative name for the approach
2. A detailed description (4-6 sentences explaining the approach thoroughly)
3. Key advantages
4. Implementation complexity (Low/Medium/High)
5. Time estimate to build
6. Main technologies/tools needed

Format your response as valid JSON:
{
  "solutions": [...]
}

Respond with ONLY the JSON, no other text.`
            }]
          })
        });

        if (!response.ok) {
          if (response.status === 402) {
            console.log(`${model} failed with payment error, trying next model...`);
            continue;
          }
          throw new Error(`${model} failed: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
          console.log(`${model} returned error: ${data.error.message}, trying next model...`);
          continue;
        }

        const text = data.choices?.[0]?.message?.content;
        if (!text) continue;

        const cleanText = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanText);

        console.log(`Successfully used fallback model: ${model}`);
        return parsed.solutions || [];
      } catch (error) {
        console.error(`Error with ${model}:`, error);
      }
    }

    throw new Error('All fallback models failed. Please check your OpenRouter credits.');
  };

  const tryClaudeJudge = async (candidateSolutions: Solution[], originalProblem: string, apiKey: string): Promise<Solution[]> => {
    // Compress candidate solutions for Claude
    const compressedCandidates = candidateSolutions.map((sol, index) => ({
      id: index + 1,
      name: sol.name,
      summary: sol.description.substring(0, 100) + '...',
      complexity: sol.complexity,
      twist: `Perspective ${Math.floor(index / 6) + 1}` // Rough grouping by twist
    }));

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: `Original problem: "${originalProblem}"

I have these candidate solutions from multiple AI models exploring different problem perspectives:

${compressedCandidates.map(c => `${c.id}. ${c.name} (${c.complexity}): ${c.summary}`).join('\n')}

Your task: Rank, merge, and refine these ideas to create exactly 5 high-quality final solutions. Remove duplicates, combine complementary ideas, and ensure diversity.

For each final solution, provide:
1. A creative name
2. A detailed description (4-6 sentences)
3. Key advantages (2-3 points)
4. Implementation complexity (Low/Medium/High)
5. Time estimate
6. Main technologies/tools

Format your response as valid JSON:
{
  "solutions": [
    {
      "name": "Solution Name",
      "description": "Detailed description...",
      "advantages": ["advantage1", "advantage2"],
      "complexity": "Medium",
      "timeEstimate": "2-3 days",
      "technologies": ["tech1", "tech2"]
    }
  ]
}

Respond with ONLY the JSON, no other text.`
        }]
      })
    });

    if (!response.ok) {
      if (response.status === 402) {
        throw new Error(`Claude judge failed: 402 (Payment Required - insufficient OpenRouter credits)`);
      }
      throw new Error(`Claude judge failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Claude judge error: ${data.error.message}`);
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('No Claude judge response');
    }

    try {
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);
      return parsed.solutions || [];
    } catch (error) {
      console.error('Failed to parse Claude judge response:', error);
      // Return original candidates if parsing fails
      return candidateSolutions.slice(0, 5);
    }
  };

  const fallbackJudgeWithAlternatives = async (candidateSolutions: Solution[], originalProblem: string, apiKey: string): Promise<Solution[]> => {
    const alternativeModels = ['openai/gpt-4o', 'deepseek/deepseek-r1:free'];

    for (const model of alternativeModels) {
      try {
        console.log(`Trying alternative judge model: ${model}`);

        // Compress candidates for the alternative model
        const compressedCandidates = candidateSolutions.map((sol, index) => ({
          id: index + 1,
          name: sol.name,
          summary: sol.description.substring(0, 80) + '...',
          complexity: sol.complexity
        }));

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: `Original problem: "${originalProblem}"

I have these candidate solutions from multiple AI models. Select and refine the best 5:

${compressedCandidates.map(c => `${c.id}. ${c.name} (${c.complexity}): ${c.summary}`).join('\n')}

Create exactly 5 final solutions by selecting the best ideas and combining complementary approaches.

Format your response as valid JSON:
{
  "solutions": [...]
}

Respond with ONLY the JSON, no other text.`
            }]
          })
        });

        if (!response.ok) {
          if (response.status === 402) {
            console.log(`${model} also failed with payment error, trying next...`);
            continue;
          }
          throw new Error(`${model} failed: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) continue;

        const text = data.choices?.[0]?.message?.content;
        if (!text) continue;

        try {
          const cleanText = text.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleanText);

          console.log(`Successfully used alternative judge: ${model}`);
          return parsed.solutions || [];
        } catch {
          continue;
        }
      } catch (error) {
        console.error(`Error with alternative judge ${model}:`, error);
      }
    }

    // If all alternatives fail, return the best candidates
    console.log('All judge models failed, returning top candidates');
    return candidateSolutions.slice(0, 5);
  };

  const getComplexityColor = (complexity: string | undefined) => {
    switch(complexity?.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const icons = [Lightbulb, Zap, Code, Users, TrendingUp];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Lightbulb className="w-10 h-10 text-purple-600" />
            <h1 className="text-4xl font-bold text-gray-800">
              AI Multi-Solution Generator
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Enter your hackathon problem and get 5 different solution approaches instantly
          </p>
          {loading && loadingStep && (
            <p className="text-purple-600 text-sm mt-2 font-medium">
              {loadingStep}
            </p>
          )}
          {solutions.length > 0 && (
            <p className="text-purple-600 text-sm mt-2">
              Final solutions synthesized by Claude using multiple models and twisted problem statements
            </p>
          )}
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Problem Statement
          </label>
          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Example: Create a platform to connect volunteers with local community service opportunities..."
            className="w-full h-32 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none resize-none text-gray-700"
          />
          
          <button
            onClick={generateSolutions}
            disabled={loading}
            className="mt-4 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating Solutions...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Generate 5 Solutions
              </>
            )}
          </button>
        </div>

        {/* Solutions Grid */}
        {solutions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Solution Approaches
            </h2>
            
            {solutions.map((solution, index) => {
              const Icon = icons[index % icons.length];
              const isExpanded = expandedSolution === index;
              
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedSolution(isExpanded ? null : index)}
                    className="p-6 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-3 rounded-lg">
                          <Icon className="w-6 h-6 text-purple-600" />
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-2">
                            {solution.name}
                          </h3>
                          <p className="text-gray-600 mb-3">
                            {solution.description}
                          </p>
                          
                          <div className="flex flex-wrap gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getComplexityColor(solution.complexity)}`}>
                              {solution.complexity} Complexity
                            </span>
                            <span className="px-3 py-1 rounded-full text-sm font-medium text-blue-600 bg-blue-50 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {solution.timeEstimate}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button className="text-gray-400 hover:text-gray-600 ml-4">
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-0 border-t border-gray-100">
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Key Advantages
                          </h4>
                          <ul className="space-y-1">
                            {solution.advantages?.map((adv, i) => (
                              <li key={i} className="text-gray-600 text-sm flex items-start gap-2">
                                <span className="text-green-500 mt-1">✓</span>
                                <span>{adv}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Code className="w-4 h-4" />
                            Technologies
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {solution.technologies?.map((tech, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && solutions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              Enter a problem statement above to generate solution approaches
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSolutionSolver;
