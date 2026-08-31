import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompactATSHeader } from '../CompactATSHeader';
import type { ATSScoreBreakdown } from '../../types';

describe('CompactATSHeader', () => {
  const mockBreakdown: ATSScoreBreakdown = {
    overallScore: 88,
    keywordMatchScore: 85,
    skillsMatchScore: 85,
    actionVerbScore: 90,
    formattingScore: 95,
    brevityScore: 80,
    matchedKeywords: ['React', 'TypeScript', 'Node.js'],
    missingKeywords: ['Docker', 'Kubernetes'],
    matchedSkills: ['React', 'TypeScript'],
    missingSkills: ['Docker'],
    strongVerbsCount: 8,
    weakVerbsFound: [],
    clichesFound: [],
  };

  it('renders score percentage, target goal, and mini bars', () => {
    render(<CompactATSHeader breakdown={mockBreakdown} target={95} />);
    
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('ATS Score')).toBeInTheDocument();
    expect(screen.getByText(/Goal:/)).toBeInTheDocument();
    expect(screen.getByText('Keywords')).toBeInTheDocument();
    expect(screen.getByText('Verbs')).toBeInTheDocument();
  });

  it('expands details drawer on click to show matched and missing keyword pills', () => {
    render(<CompactATSHeader breakdown={mockBreakdown} target={95} />);
    
    const detailsButton = screen.getByRole('button', { name: /details/i });
    expect(detailsButton).toBeInTheDocument();

    // Click to expand
    fireEvent.click(detailsButton);
    expect(screen.getByText(/3 Matched \/ 2 Missing/i)).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Docker')).toBeInTheDocument();
  });
});
