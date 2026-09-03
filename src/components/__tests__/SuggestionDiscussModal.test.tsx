import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SuggestionDiscussModal } from '../SuggestionDiscussModal';
import type { Suggestion } from '../../types';

describe('SuggestionDiscussModal', () => {
  const mockSuggestion: Suggestion = {
    id: 'sugg-agentic',
    category: 'ats_keyword',
    title: "Add 'Agentic AI' and 'Autonomous Agents' keyword presence",
    description: "The JD heavily emphasizes 'Agentic Transformation'.",
    impact: 'high',
    targetSection: 'Experience > TCS > Executive Leadership',
    referenceSnippet: 'Led enterprise-wide agentic transformation by deploying autonomous AI agents.',
    status: 'pending',
  };

  it('renders suggestion details and initial AI greeting', () => {
    render(
      <SuggestionDiscussModal
        isOpen={true}
        onClose={vi.fn()}
        suggestion={mockSuggestion}
        jdText="Principal Product Manager - Agentic AI"
        resumeText="Executive Resume"
        onApplyAdaptedSnippet={vi.fn()}
      />
    );

    expect(screen.getByText('Discuss & Adapt Suggestion')).toBeInTheDocument();
    expect(screen.getAllByText(/Experience > TCS > Executive Leadership/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Led enterprise-wide agentic transformation/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/How does this align with your actual experience\?/i)).toBeInTheDocument();
  });

  it('allows user to send a message and adapts the snippet based on discussion', async () => {
    const handleApply = vi.fn();
    render(
      <SuggestionDiscussModal
        isOpen={true}
        onClose={vi.fn()}
        suggestion={mockSuggestion}
        jdText="Principal Product Manager - Agentic AI"
        resumeText="Executive Resume"
        onApplyAdaptedSnippet={handleApply}
      />
    );

    const input = screen.getByPlaceholderText(/tell the agent about your actual experience/i);
    fireEvent.change(input, { target: { value: 'Add $2M metrics and cost reduction' } });

    const sendBtn = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendBtn);

    // Wait for the local coach reply to adapt snippet
    await waitFor(() => {
      expect(screen.getByText(/I've incorporated measurable metrics/i)).toBeInTheDocument();
    });

    const applyBtn = screen.getByRole('button', { name: /apply & insert into resume/i });
    fireEvent.click(applyBtn);

    expect(handleApply).toHaveBeenCalledWith(
      'sugg-agentic',
      expect.stringContaining('$1.5M+ in cost savings'),
      true
    );
  });

  it('updates card only when Update Card Only is clicked', () => {
    const handleApply = vi.fn();
    const handleClose = vi.fn();

    render(
      <SuggestionDiscussModal
        isOpen={true}
        onClose={handleClose}
        suggestion={mockSuggestion}
        jdText="Principal Product Manager"
        resumeText="Executive Resume"
        onApplyAdaptedSnippet={handleApply}
      />
    );

    const updateCardBtn = screen.getByRole('button', { name: /update card only/i });
    fireEvent.click(updateCardBtn);

    expect(handleApply).toHaveBeenCalledWith(
      'sugg-agentic',
      mockSuggestion.referenceSnippet,
      false
    );
    expect(handleClose).toHaveBeenCalled();
  });
});
