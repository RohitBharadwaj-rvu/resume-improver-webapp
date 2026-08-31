import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from '../SettingsModal';
import type { LLMConfig } from '../../types';

describe('SettingsModal', () => {
  const initialConfig: LLMConfig = {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-test-12345',
    model: 'gpt-4o',
    provider: 'openai',
  };

  it('renders settings fields and switches provider presets', () => {
    const handleSave = vi.fn();
    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        config={initialConfig}
        onSave={handleSave}
      />
    );

    expect(screen.getByText('OpenAI-Compatible LLM Settings')).toBeInTheDocument();
    
    // Switch to OpenRouter
    const openRouterBtn = screen.getByRole('button', { name: /openrouter/i });
    fireEvent.click(openRouterBtn);

    const baseUrlInput = screen.getByPlaceholderText('https://api.openai.com/v1') as HTMLInputElement;
    expect(baseUrlInput.value).toBe('https://openrouter.ai/api/v1');
  });

  it('submits updated config on Save', () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      <SettingsModal
        isOpen={true}
        onClose={handleClose}
        config={initialConfig}
        onSave={handleSave}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /save configuration/i });
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test-12345',
      model: 'gpt-4o',
    }));
    expect(handleClose).toHaveBeenCalled();
  });
});
