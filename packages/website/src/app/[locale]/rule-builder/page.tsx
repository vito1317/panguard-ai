'use client';

import { useState, useCallback, useMemo } from 'react';

/**
 * ATR Rule Builder UI
 *
 * Provides a visual interface for community contributors to build and test
 * ATR (Agent Threat Rules) rules. Supports editing rule metadata, patterns,
 * test cases, YAML preview, and export/import.
 */

// =============================================================================
// Types
// =============================================================================

interface RulePattern {
  id: string;
  field: 'content' | 'name' | 'description';
  regex: string;
  description: string;
  previewMatches: string[];
}

interface TestCase {
  id: string;
  content: string;
  type: 'true-positive' | 'true-negative';
  passed: boolean;
}

interface RuleData {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  category:
    | 'prompt-injection'
    | 'tool-poisoning'
    | 'context-exfiltration'
    | 'agent-manipulation'
    | 'privilege-escalation'
    | 'excessive-autonomy'
    | 'data-poisoning'
    | 'model-abuse'
    | 'skill-compromise';
  owasp: string;
  mitre: string;
  patterns: RulePattern[];
  testCases: TestCase[];
}

// =============================================================================
// Constants
// =============================================================================

const SEVERITY_OPTIONS = ['critical', 'high', 'medium', 'low', 'informational'] as const;
const CATEGORY_OPTIONS = [
  'prompt-injection',
  'tool-poisoning',
  'context-exfiltration',
  'agent-manipulation',
  'privilege-escalation',
  'excessive-autonomy',
  'data-poisoning',
  'model-abuse',
  'skill-compromise',
] as const;

// =============================================================================
// Main Component
// =============================================================================

export default function RuleBuilderPage() {
  const [rule, setRule] = useState<RuleData>({
    id: 'ATR-2024-001',
    title: 'Example Rule',
    description: 'Detects example threat patterns',
    severity: 'high',
    category: 'prompt-injection',
    owasp: 'LLM01',
    mitre: 'AML.T0051',
    patterns: [],
    testCases: [],
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'patterns' | 'tests' | 'preview'>('editor');
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [importError, setImportError] = useState<string>('');

  // =========================================================================
  // Handlers: Rule Metadata
  // =========================================================================

  const handleRuleChange = useCallback(
    (field: keyof Omit<RuleData, 'patterns' | 'testCases'>, value: string) => {
      setRule((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // =========================================================================
  // Handlers: Patterns
  // =========================================================================

  const addPattern = useCallback(() => {
    setRule((prev) => ({
      ...prev,
      patterns: [
        ...prev.patterns,
        {
          id: `pattern-${Date.now()}`,
          field: 'content' as const,
          regex: '',
          description: '',
          previewMatches: [],
        },
      ],
    }));
  }, []);

  const updatePattern = useCallback(
    (patternId: string, field: keyof RulePattern, value: string) => {
      setRule((prev) => ({
        ...prev,
        patterns: prev.patterns.map((p) => {
          if (p.id === patternId) {
            // Update preview matches when regex changes
            if (field === 'regex') {
              const previewMatches: string[] = [];
              try {
                const regex = new RegExp(value, 'gi');
                for (const testCase of prev.testCases) {
                  const matches = testCase.content.match(regex);
                  if (matches) {
                    previewMatches.push(...matches.slice(0, 3)); // Limit to 3 matches for preview
                  }
                }
              } catch {
                // Invalid regex - skip preview
              }
              return { ...p, [field]: value, previewMatches };
            }
            return { ...p, [field]: value };
          }
          return p;
        }),
      }));
    },
    []
  );

  const removePattern = useCallback((patternId: string) => {
    setRule((prev) => ({
      ...prev,
      patterns: prev.patterns.filter((p) => p.id !== patternId),
    }));
  }, []);

  // =========================================================================
  // Handlers: Test Cases
  // =========================================================================

  const addTestCase = useCallback((type: 'true-positive' | 'true-negative') => {
    setRule((prev) => ({
      ...prev,
      testCases: [
        ...prev.testCases,
        {
          id: `test-${Date.now()}`,
          content: '',
          type,
          passed: false,
        },
      ],
    }));
  }, []);

  const updateTestCase = useCallback((testId: string, field: string, value: string) => {
    setRule((prev) => ({
      ...prev,
      testCases: prev.testCases.map((t) => (t.id === testId ? { ...t, [field]: value } : t)),
    }));
  }, []);

  const removeTestCase = useCallback((testId: string) => {
    setRule((prev) => ({
      ...prev,
      testCases: prev.testCases.filter((t) => t.id !== testId),
    }));
  }, []);

  // =========================================================================
  // Test Execution
  // =========================================================================

  const runTests = useCallback(() => {
    const results: Record<string, boolean> = {};

    for (const testCase of rule.testCases) {
      let shouldMatch = false;

      // Check if any pattern matches the test content
      for (const pattern of rule.patterns) {
        try {
          const regex = new RegExp(pattern.regex, 'gi');
          if (regex.test(testCase.content)) {
            shouldMatch = true;
            break;
          }
        } catch {
          // Invalid regex - skip
        }
      }

      // Determine if test passed
      const passed =
        testCase.type === 'true-positive' ? shouldMatch : !shouldMatch;
      results[testCase.id] = passed;
    }

    setTestResults(results);

    // Update test case passed status
    setRule((prev) => ({
      ...prev,
      testCases: prev.testCases.map((t) => ({
        ...t,
        passed: results[t.id] ?? false,
      })),
    }));
  }, [rule.patterns, rule.testCases]);

  // =========================================================================
  // YAML Generation & Export
  // =========================================================================

  const generatedYAML = useMemo(() => {
    const conditions = rule.patterns.map((p) => ({
      field: p.field,
      operator: 'regex',
      value: p.regex,
      description: p.description,
    }));

    const yamlContent = {
      title: rule.title,
      id: rule.id,
      status: 'draft',
      description: rule.description,
      author: 'Community Contributor',
      date: new Date().toISOString().split('T')[0],
      severity: rule.severity,
      references: {
        owasp_llm: [rule.owasp],
        mitre_atlas: [rule.mitre],
      },
      tags: {
        category: rule.category,
        confidence: 'medium',
      },
      agent_source: {
        type: 'llm_io',
        framework: ['any'],
        provider: ['any'],
      },
      detection: {
        conditions,
        condition: 'any',
        false_positives: ['Legitimate traffic matching pattern'],
      },
      response: {
        actions: ['alert', 'block_input'],
        auto_response_threshold: rule.severity,
        message_template: `[${rule.id}] ${rule.title} detected.`,
      },
    };

    return stringifyYAML(yamlContent);
  }, [rule]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedYAML);
      alert('YAML copied to clipboard!');
    } catch {
      alert('Failed to copy to clipboard');
    }
  }, [generatedYAML]);

  const downloadYAML = useCallback(() => {
    const element = document.createElement('a');
    element.setAttribute(
      'href',
      `data:text/yaml;charset=utf-8,${encodeURIComponent(generatedYAML)}`
    );
    element.setAttribute('download', `${rule.id}.yaml`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }, [generatedYAML, rule.id]);

  // =========================================================================
  // Import YAML
  // =========================================================================

  const handleImportYAML = useCallback((yamlText: string) => {
    try {
      setImportError('');
      const parsed = parseYAML(yamlText);

      // Extract patterns from detection conditions
      const patterns: RulePattern[] = (parsed.detection?.conditions || []).map(
        (c: Record<string, string>, idx: number) => ({
          id: `pattern-${idx}`,
          field: c.field || 'content',
          regex: c.value || '',
          description: c.description || '',
          previewMatches: [],
        })
      );

      const references = parsed.references || {};
      const owasp = (references.owasp_llm?.[0] || '');
      const mitre = (references.mitre_atlas?.[0] || '');
      const tags = parsed.tags || {};

      setRule({
        id: parsed.id || 'ATR-2024-001',
        title: parsed.title || '',
        description: parsed.description || '',
        severity: parsed.severity || 'high',
        category: tags.category || 'prompt-injection',
        owasp,
        mitre,
        patterns,
        testCases: rule.testCases, // Preserve existing test cases
      });

      setActiveTab('editor');
    } catch (error) {
      setImportError(
        `Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [rule.testCases]);

  const handlePasteYAML = useCallback(() => {
    const yamlText = prompt('Paste your YAML rule:');
    if (yamlText) {
      handleImportYAML(yamlText);
    }
  }, [handleImportYAML]);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">ATR Rule Builder</h1>
          <p className="mt-2 text-gray-600">
            Create and test Agent Threat Rules (ATR) for detecting AI agent threats
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {(['editor', 'patterns', 'tests', 'preview'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="rounded-lg bg-white p-6 shadow">
          {/* Editor Tab: Rule Metadata */}
          {activeTab === 'editor' && (
            <RuleEditorTab rule={rule} onRuleChange={handleRuleChange} onImport={handlePasteYAML} />
          )}

          {/* Patterns Tab */}
          {activeTab === 'patterns' && (
            <PatternBuilderTab
              patterns={rule.patterns}
              testCases={rule.testCases}
              onAddPattern={addPattern}
              onUpdatePattern={updatePattern}
              onRemovePattern={removePattern}
            />
          )}

          {/* Tests Tab */}
          {activeTab === 'tests' && (
            <TestCasesTab
              testCases={rule.testCases}
              testResults={testResults}
              onAddTestCase={addTestCase}
              onUpdateTestCase={updateTestCase}
              onRemoveTestCase={removeTestCase}
              onRunTests={runTests}
            />
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <PreviewTab
              yaml={generatedYAML}
              importError={importError}
              onCopyToClipboard={copyToClipboard}
              onDownload={downloadYAML}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Tab Components
// =============================================================================

interface RuleEditorTabProps {
  rule: RuleData;
  onRuleChange: (field: keyof Omit<RuleData, 'patterns' | 'testCases'>, value: string) => void;
  onImport: () => void;
}

function RuleEditorTab({ rule, onRuleChange, onImport }: RuleEditorTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Rule ID */}
        <div>
          <label className="block text-sm font-medium text-gray-900">Rule ID</label>
          <input
            type="text"
            value={rule.id}
            onChange={(e) => onRuleChange('id', e.target.value)}
            placeholder="ATR-2024-001"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm font-medium text-gray-900">Severity</label>
          <select
            value={rule.severity}
            onChange={(e) => onRuleChange('severity', e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {SEVERITY_OPTIONS.map((sev) => (
              <option key={sev} value={sev}>
                {sev.charAt(0).toUpperCase() + sev.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-900">Title</label>
        <input
          type="text"
          value={rule.title}
          onChange={(e) => onRuleChange('title', e.target.value)}
          placeholder="Descriptive rule title"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-900">Description</label>
        <textarea
          value={rule.description}
          onChange={(e) => onRuleChange('description', e.target.value)}
          placeholder="Detailed description of what this rule detects"
          rows={4}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-900">Category</label>
          <select
            value={rule.category}
            onChange={(e) => onRuleChange('category', e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* OWASP Mapping */}
        <div>
          <label className="block text-sm font-medium text-gray-900">OWASP LLM</label>
          <input
            type="text"
            value={rule.owasp}
            onChange={(e) => onRuleChange('owasp', e.target.value)}
            placeholder="e.g., LLM01"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* MITRE Mapping */}
      <div>
        <label className="block text-sm font-medium text-gray-900">MITRE ATL&S</label>
        <input
          type="text"
          value={rule.mitre}
          onChange={(e) => onRuleChange('mitre', e.target.value)}
          placeholder="e.g., AML.T0051"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Import Button */}
      <button
        onClick={onImport}
        className="w-full rounded bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
      >
        Import Existing YAML Rule
      </button>
    </div>
  );
}

interface PatternBuilderTabProps {
  patterns: RulePattern[];
  testCases: Array<{ id: string; content: string }>;
  onAddPattern: () => void;
  onUpdatePattern: (patternId: string, field: keyof RulePattern, value: string) => void;
  onRemovePattern: (patternId: string) => void;
}

function PatternBuilderTab({
  patterns,
  testCases,
  onAddPattern,
  onUpdatePattern,
  onRemovePattern,
}: PatternBuilderTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Detection Patterns</h2>
        <button
          onClick={onAddPattern}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
        >
          Add Pattern
        </button>
      </div>

      {patterns.length === 0 ? (
        <p className="text-gray-600">No patterns yet. Click "Add Pattern" to create one.</p>
      ) : (
        <div className="space-y-4">
          {patterns.map((pattern) => (
            <div key={pattern.id} className="rounded border border-gray-200 p-4">
              <div className="mb-4 grid grid-cols-2 gap-4">
                {/* Field Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-900">Field</label>
                  <select
                    value={pattern.field}
                    onChange={(e) => onUpdatePattern(pattern.id, 'field', e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="content">Content</option>
                    <option value="name">Name</option>
                    <option value="description">Description</option>
                  </select>
                </div>

                {/* Pattern Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-900">Description</label>
                  <input
                    type="text"
                    value={pattern.description}
                    onChange={(e) => onUpdatePattern(pattern.id, 'description', e.target.value)}
                    placeholder="What this pattern detects"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Regex */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900">Regex Pattern</label>
                <input
                  type="text"
                  value={pattern.regex}
                  onChange={(e) => onUpdatePattern(pattern.id, 'regex', e.target.value)}
                  placeholder="(?i)malicious.*pattern"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Preview */}
              {pattern.previewMatches.length > 0 && (
                <div className="mb-4 rounded bg-green-50 p-3">
                  <p className="text-sm font-medium text-green-900">Matches in test cases:</p>
                  <div className="mt-2 space-y-1">
                    {pattern.previewMatches.map((match, idx) => (
                      <code key={idx} className="block text-sm text-green-700">
                        {match}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Remove Button */}
              <button
                onClick={() => onRemovePattern(pattern.id)}
                className="rounded bg-red-100 px-3 py-1 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
              >
                Remove Pattern
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TestCasesTabProps {
  testCases: TestCase[];
  testResults: Record<string, boolean>;
  onAddTestCase: (type: 'true-positive' | 'true-negative') => void;
  onUpdateTestCase: (testId: string, field: string, value: string) => void;
  onRemoveTestCase: (testId: string) => void;
  onRunTests: () => void;
}

function TestCasesTab({
  testCases,
  testResults,
  onAddTestCase,
  onUpdateTestCase,
  onRemoveTestCase,
  onRunTests,
}: TestCasesTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Test Cases</h2>
        <button
          onClick={onRunTests}
          className="rounded bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-700"
        >
          Run Tests
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onAddTestCase('true-positive')}
          className="rounded bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
        >
          Add True Positive
        </button>
        <button
          onClick={() => onAddTestCase('true-negative')}
          className="rounded bg-orange-600 px-4 py-2 font-medium text-white transition-colors hover:bg-orange-700"
        >
          Add True Negative
        </button>
      </div>

      {testCases.length === 0 ? (
        <p className="text-gray-600">No test cases yet. Add some to validate your patterns.</p>
      ) : (
        <div className="space-y-4">
          {testCases.map((test) => (
            <div
              key={test.id}
              className={`rounded border-2 p-4 ${
                testResults[test.id] === undefined
                  ? 'border-gray-200 bg-gray-50'
                  : testResults[test.id]
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded px-3 py-1 text-xs font-semibold ${
                      test.type === 'true-positive'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {test.type === 'true-positive' ? 'Should Match' : 'Should NOT Match'}
                  </span>
                  {testResults[test.id] !== undefined && (
                    <span
                      className={`font-medium ${
                        testResults[test.id] ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {testResults[test.id] ? '✓ Passed' : '✗ Failed'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onRemoveTestCase(test.id)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>

              <textarea
                value={test.content}
                onChange={(e) => onUpdateTestCase(test.id, 'content', e.target.value)}
                placeholder="Enter test content here"
                rows={3}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PreviewTabProps {
  yaml: string;
  importError: string;
  onCopyToClipboard: () => void;
  onDownload: () => void;
}

function PreviewTab({ yaml, importError, onCopyToClipboard, onDownload }: PreviewTabProps) {
  return (
    <div className="space-y-4">
      {importError && (
        <div className="rounded border border-red-300 bg-red-50 p-4">
          <p className="text-sm text-red-700">{importError}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCopyToClipboard}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
        >
          Copy to Clipboard
        </button>
        <button
          onClick={onDownload}
          className="rounded bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
        >
          Download YAML
        </button>
      </div>

      <div className="rounded border border-gray-300 bg-gray-900 p-4">
        <pre className="overflow-auto text-sm text-gray-100">{yaml}</pre>
      </div>
    </div>
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Simple YAML stringification (generates YAML string)
 */
function stringifyYAML(obj: Record<string, unknown>, depth = 0): string {
  const indent = '  '.repeat(depth);
  let result = '';

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result += `${indent}${key}: ${value}\n`;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result += `${indent}${key}: ${value}\n`;
    } else if (Array.isArray(value)) {
      result += `${indent}${key}:\n`;
      for (const item of value) {
        if (typeof item === 'string') {
          result += `${indent}  - ${item}\n`;
        } else if (typeof item === 'object' && item !== null) {
          result += `${indent}  - ${stringifyYAML(item as Record<string, unknown>, depth + 2)}`;
        } else {
          result += `${indent}  - ${item}\n`;
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      result += `${indent}${key}:\n`;
      result += stringifyYAML(value as Record<string, unknown>, depth + 1);
    }
  }

  return result;
}

/**
 * Simple YAML parser (parses YAML string)
 */
function parseYAML(yamlText: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yamlText.split('\n');
  const stack: { indent: number; key: string; parent: Record<string, unknown> }[] = [];

  let currentParent = result;
  let currentIndent = -1;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const trimmed = line.trimStart();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const indent = line.length - trimmed.length;

    // Handle pop-up (back to parent level)
    while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
      currentParent = stack.length > 0 ? (stack[stack.length - 1].parent as Record<string, unknown>) : result;
    }

    if (trimmed.startsWith('- ')) {
      // Array item
      const value = trimmed.slice(2);
      if (!Array.isArray(currentParent[Object.keys(currentParent)[Object.keys(currentParent).length - 1]])) {
        const lastKey = Object.keys(currentParent)[Object.keys(currentParent).length - 1];
        if (lastKey) {
          currentParent[lastKey] = [];
        }
      }
      const lastKey = Object.keys(currentParent)[Object.keys(currentParent).length - 1];
      if (lastKey) {
        (currentParent[lastKey] as unknown[]).push(value);
      }
    } else if (trimmed.includes(':')) {
      // Key-value pair
      const [key, ...rest] = trimmed.split(':');
      const value = rest.join(':').trim();

      if (value) {
        currentParent[key.trim()] = value;
      } else {
        // Nested object
        const nestedObj: Record<string, unknown> = {};
        currentParent[key.trim()] = nestedObj;
        stack.push({ indent, key: key.trim(), parent: currentParent });
        currentParent = nestedObj;
      }
    }
  }

  return result;
}
