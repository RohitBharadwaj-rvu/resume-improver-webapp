import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HumanizerModal } from '../HumanizerModal';

describe('HumanizerModal', () => {
  const sampleAIText = 'Spearheaded cutting-edge initiatives to seamlessly orchestrate cross-functional synergy.';

  it('renders side-by-side view with AI tone score and replacements', async () => {
    render(
      <HumanizerModal
        isOpen={true}
        onClose={vi.fn()}
        initialText={sampleAIText}
        contextTitle="Senior Engineer"
      />
    );

    expect(screen.getByText('AI Detection & Humanizer Tool')).toBeInTheDocument();
    expect(screen.getByText('Context: Senior Engineer')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/AI Tone Score/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Detected Clichés/i)).toBeInTheDocument();
    expect(screen.getByText(/Flagged AI Tells/i)).toBeInTheDocument();
  });

  it('calls onInsertToEditor when Insert into Resume button is clicked', async () => {
    const handleInsert = vi.fn();
    const handleClose = vi.fn();

    render(
      <HumanizerModal
        isOpen={true}
        onClose={handleClose}
        initialText={sampleAIText}
        onInsertToEditor={handleInsert}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /insert into resume/i })).toBeInTheDocument();
    });

    const insertBtn = screen.getByRole('button', { name: /insert into resume/i });
    fireEvent.click(insertBtn);

    expect(handleInsert).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
  });
});
