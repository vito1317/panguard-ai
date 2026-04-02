#!/usr/bin/env python3
"""
Convert PanGuard scan JSON reports to SARIF 2.1.0 format for GitHub Code Scanning.

This script takes a PanGuard audit report in JSON format and converts it to
SARIF 2.1.0 format for integration with GitHub's code scanning features.

Usage:
    python3 sarif-converter.py <input-json> <output-sarif>

Args:
    input-json: Path to PanGuard scan report JSON file
    output-sarif: Path where SARIF report will be written

Example:
    python3 sarif-converter.py panguard-report.json report.sarif
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List


def map_severity_to_sarif_level(severity: str) -> str:
    """
    Map PanGuard severity levels to SARIF level values.

    SARIF uses: error, warning, note, none
    PanGuard uses: CRITICAL, HIGH, MEDIUM, LOW, INFO

    Args:
        severity: PanGuard severity level

    Returns:
        SARIF level string
    """
    severity_map = {
        'CRITICAL': 'error',
        'HIGH': 'error',
        'MEDIUM': 'warning',
        'LOW': 'note',
        'INFO': 'note',
    }
    return severity_map.get(severity.upper(), 'note')


def create_sarif_rule(finding: Dict[str, Any], rule_id: str) -> Dict[str, Any]:
    """
    Create a SARIF rule object from a PanGuard finding.

    Args:
        finding: PanGuard finding dictionary
        rule_id: Unique rule identifier

    Returns:
        SARIF rule object
    """
    rule = {
        'id': rule_id,
        'shortDescription': {
            'text': finding.get('title', 'MCP Security Finding')
        },
        'fullDescription': {
            'text': finding.get('description', 'No detailed description available.')
        },
        'defaultConfiguration': {
            'level': map_severity_to_sarif_level(finding.get('severity', 'LOW'))
        },
        'help': {
            'text': f"PanGuard security audit finding: {finding.get('title', 'Unknown')}"
        },
        'properties': {
            'category': finding.get('category', 'security'),
            'tags': ['security', 'mcp-skills'],
        }
    }

    # Add remediation if available
    if remediation := finding.get('remediation'):
        rule['help']['markdown'] = f"**Remediation:**\n\n{remediation}"

    # Add references if available
    if references := finding.get('references'):
        rule['relationships'] = []
        for ref in references if isinstance(references, list) else [references]:
            rule['relationships'].append({
                'target': {
                    'id': ref.get('id', 'unknown') if isinstance(ref, dict) else str(ref),
                    'index': -1,
                    'toolComponent': {
                        'name': 'external'
                    }
                },
                'kinds': ['relevant']
            })

    return rule


def create_sarif_result(
    finding: Dict[str, Any],
    skill_name: str,
    rule_id: str
) -> Dict[str, Any]:
    """
    Create a SARIF result object from a PanGuard finding.

    Args:
        finding: PanGuard finding dictionary
        skill_name: Name of the skill being audited
        rule_id: Reference to the rule ID

    Returns:
        SARIF result object
    """
    result = {
        'ruleId': rule_id,
        'level': map_severity_to_sarif_level(finding.get('severity', 'LOW')),
        'message': {
            'text': f"{finding.get('title', 'Security Finding')}: {finding.get('description', 'No description')}"
        },
        'properties': {
            'skill': skill_name,
            'severity': finding.get('severity', 'UNKNOWN'),
            'type': finding.get('type', 'security-issue'),
        }
    }

    # Add location information if available
    locations = []

    if file_path := finding.get('file'):
        location = {
            'physicalLocation': {
                'artifactLocation': {
                    'uri': file_path
                }
            }
        }

        # Add line/column information
        if line := finding.get('line'):
            location['physicalLocation']['region'] = {'startLine': int(line)}

            if column := finding.get('column'):
                location['physicalLocation']['region']['startColumn'] = int(column)

        if end_line := finding.get('endLine'):
            if 'region' not in location['physicalLocation']:
                location['physicalLocation']['region'] = {}
            location['physicalLocation']['region']['endLine'] = int(end_line)

        locations.append(location)

    # Fallback location if no specific file given
    if not locations:
        locations.append({
            'physicalLocation': {
                'artifactLocation': {
                    'uri': f"skills/{skill_name}/SKILL.md"
                },
                'region': {
                    'startLine': 1
                }
            }
        })

    result['locations'] = locations

    # Add related location references
    if related := finding.get('relatedLocations'):
        result['relatedLocations'] = []
        for rel in related if isinstance(related, list) else [related]:
            result['relatedLocations'].append({
                'id': rel.get('id', 'related'),
                'message': {
                    'text': rel.get('description', 'Related location')
                },
                'physicalLocation': {
                    'artifactLocation': {
                        'uri': rel.get('file', 'unknown')
                    }
                }
            })

    return result


def generate_sarif_report(panguard_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert PanGuard scan report to SARIF 2.1.0 format.

    Args:
        panguard_data: Parsed PanGuard JSON report

    Returns:
        SARIF report dictionary
    """
    rules: Dict[str, Dict[str, Any]] = {}
    results: List[Dict[str, Any]] = []
    rule_counter = 0

    # Process each skill
    for skill in panguard_data.get('skills', []):
        skill_name = skill.get('name', 'unknown')

        # Process each finding in the skill
        for finding in skill.get('findings', []):
            rule_counter += 1
            rule_id = f"PG{rule_counter:04d}"

            # Create rule entry (avoid duplicates by using title as key)
            rule_key = finding.get('title', f'rule_{rule_counter}')
            if rule_key not in rules:
                rules[rule_key] = create_sarif_rule(finding, rule_id)

            # Create result
            result = create_sarif_result(finding, skill_name, rule_id)
            results.append(result)

    # Build SARIF report
    sarif = {
        'version': '2.1.0',
        '$schema': 'https://json.schemastore.org/sarif-2.1.0.json',
        'runs': [
            {
                'tool': {
                    'driver': {
                        'name': 'PanGuard',
                        'version': panguard_data.get('version', 'unknown'),
                        'informationUri': 'https://panguard.ai',
                        'organization': 'PanGuard AI',
                        'semanticVersion': panguard_data.get('version', '1.0.0'),
                        'rules': list(rules.values()),
                        'properties': {
                            'description': 'Automatic security audit for MCP (Model Context Protocol) skills'
                        }
                    },
                    'extensions': [
                        {
                            'name': 'github',
                            'version': '1.0.0',
                            'informationUri': 'https://github.com/panguard-ai/panguard-guard'
                        }
                    ]
                },
                'invocations': [
                    {
                        'executionSuccessful': True,
                        'endTimeUtc': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                        'toolExecutionNotifications': []
                    }
                ],
                'results': results,
                'properties': {
                    'scanDetails': {
                        'scanStartTime': panguard_data.get('scanStartTime', ''),
                        'scanEndTime': panguard_data.get('scanEndTime', ''),
                        'highestRisk': panguard_data.get('highestRisk', 'UNKNOWN'),
                        'totalSkillsScanned': len(panguard_data.get('skills', [])),
                        'totalFindingsCount': len(results)
                    }
                }
            }
        ]
    }

    return sarif


def validate_input(input_path: str) -> Dict[str, Any]:
    """
    Validate and parse input JSON file.

    Args:
        input_path: Path to input JSON file

    Returns:
        Parsed JSON data

    Raises:
        FileNotFoundError: If input file doesn't exist
        json.JSONDecodeError: If input is not valid JSON
        ValueError: If input is missing required fields
    """
    path = Path(input_path)

    if not path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        raise json.JSONDecodeError(
            f"Invalid JSON in {input_path}: {e.msg}",
            e.doc,
            e.pos
        )

    # Validate that this looks like a PanGuard report
    if 'skills' not in data:
        raise ValueError(
            "Input JSON does not appear to be a PanGuard report. "
            "Expected 'skills' field at root level."
        )

    return data


def main(input_path: str, output_path: str) -> int:
    """
    Main entry point for SARIF conversion.

    Args:
        input_path: Path to PanGuard JSON report
        output_path: Path for output SARIF file

    Returns:
        Exit code (0 for success, 1 for error)
    """
    try:
        # Validate and load input
        print(f"Reading PanGuard report from: {input_path}", file=sys.stderr)
        panguard_data = validate_input(input_path)

        # Convert to SARIF
        print("Converting to SARIF 2.1.0 format...", file=sys.stderr)
        sarif_report = generate_sarif_report(panguard_data)

        # Write output
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(sarif_report, f, indent=2)

        # Print summary
        run = sarif_report['runs'][0]
        result_count = len(run['results'])
        rule_count = len(run['tool']['driver']['rules'])

        print(f"Successfully converted to SARIF", file=sys.stderr)
        print(f"  Results: {result_count}", file=sys.stderr)
        print(f"  Rules: {rule_count}", file=sys.stderr)
        print(f"Output written to: {output_path}", file=sys.stderr)

        return 0

    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON - {e.msg}", file=sys.stderr)
        return 1
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(
            'Usage: sarif-converter.py <input-json> <output-sarif>',
            file=sys.stderr
        )
        sys.exit(1)

    exit_code = main(sys.argv[1], sys.argv[2])
    sys.exit(exit_code)
