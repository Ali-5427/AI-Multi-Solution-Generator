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

const MultiSolutionSolver = () => {
  const [problem, setProblem] = useState('');
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(false);
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
    setSolutions([]);

    const models = [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-3-haiku',
      'meta-llama/llama-3.1-405b-instruct',
      'meta-llama/llama-3.1-70b-instruct',
      'google/gemini-pro-1.5',
      'mistralai/mistral-7b-instruct'
    ];

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);

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
              content: `Given this problem statement: "${problem}"

Generate exactly 5 different solution approaches. For each approach, provide:
1. A creative name for the approach
2. A detailed description (4-6 sentences explaining the approach thoroughly)
3. Key advantages
4. Implementation complexity (Low/Medium/High)
5. Time estimate to build
6. Main technologies/tools needed

Format your response as valid JSON with this structure:
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
        });

        if (!response.ok) {
          if (response.status === 402) {
            console.log(`Model ${model} failed with payment error, trying next model...`);
            continue;
          }
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          console.log(`Model ${model} returned error: ${data.error.message}, trying next model...`);
          continue;
        }

        const text = data.choices?.[0]?.message?.content;

        if (!text) {
          console.log(`Model ${model} returned invalid response format, trying next model...`);
          continue;
        }

        // Clean up the response
        const cleanText = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanText);

        console.log(`Successfully used model: ${model}`);
        setSolutions(parsed.solutions || []);
        return; // Success, exit the loop

      } catch (error) {
        console.error(`Error with model ${model}:`, error);
        if (model === models[models.length - 1]) {
          // Last model failed
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
          alert(`Error generating solutions: ${errorMessage}`);
        }
        // Continue to next model
      }
    }

    setLoading(false);
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
