import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestionCard } from '../SuggestionCard';
import type { Suggestion } from '../../types';

describe('SuggestionCard', () => {
  const mockSuggestion: Suggestion = {
    id: 'sugg-1',
    category: 'ats_keyword',
    title: 'Integrate Missing Skill: Docker',
    description: 'Add Docker containerization experience to your resume.',
    impact: 'high',
    targetSection: 'Skills & Experience',
    referenceSnippet: 'Containerized 10+ microservices using Docker to standardize deployments.',
    status: 'pending',
  };

  it('renders suggestion details and reference snippet', () => {
    render(
      <SuggestionCard
        suggestion={mockSuggestion}
        onStatusChange={vi.fn()}
        onOpenHumanizer={vi.fn()}
      />
    );

    expect(screen.getByText('Integrate Missing Skill: Docker')).toBeInTheDocument();
    expect(screen.getByText('ATS Keyword')).toBeInTheDocument();
    expect(screen.getByText(/high impact/i)).toBeInTheDocument();
    expect(screen.getByText(/Containerized 10\+ microservices/)).toBeInTheDocument();
  });

  it('calls onStatusChange with "accepted" when Accept button is clicked', () => {
    const handleStatusChange = vi.fn();
    render(
      <SuggestionCard
        suggestion={mockSuggestion}
        onStatusChange={handleStatusChange}
        onOpenHumanizer={vi.fn()}
      />
    );

    const acceptBtn = screen.getByRole('button', { name: /accept/i });
    fireEvent.click(acceptBtn);
    expect(handleStatusChange).toHaveBeenCalledWith('sugg-1', 'accepted');
  });

  it('opens adapt scratchpad and allows customizing the snippet', () => {
    const handleStatusChange = vi.fn();
    const handleInsert = vi.fn();
    render(
      <SuggestionCard
        suggestion={mockSuggestion}
        onStatusChange={handleStatusChange}
        onOpenHumanizer={vi.fn()}
        onInsertIntoEditor={handleInsert}
      />
    );

    const adaptBtn = screen.getByRole('button', { name: /adapt/i });
    fireEvent.click(adaptBtn);

    const textarea = screen.getByPlaceholderText(/adapt this snippet/i);
    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: 'Deployed Docker containers on AWS ECS.' } });

    const saveBtn = screen.getByRole('button', { name: /save & mark applied/i });
    fireEvent.click(saveBtn);

    expect(handleInsert).toHaveBeenCalledWith('Deployed Docker containers on AWS ECS.');
    expect(handleStatusChange).toHaveBeenCalledWith('sugg-1', 'accepted');
  });

  it('triggers onOpenHumanizer when Humanize button is clicked', () => {
    const handleHumanize = vi.fn();
    render(
      <SuggestionCard
        suggestion={mockSuggestion}
        onStatusChange={vi.fn()}
        onOpenHumanizer={handleHumanize}
      />
    );

    const humanizeBtn = screen.getByTitle(/open side-by-side humanizer/i);
    fireEvent.click(humanizeBtn);
    expect(handleHumanize).toHaveBeenCalledWith(
      mockSuggestion.referenceSnippet,
      mockSuggestion.title
    );
  });
});
