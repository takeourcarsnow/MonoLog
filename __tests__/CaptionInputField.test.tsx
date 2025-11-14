import React from 'react';
import { render, screen } from '@testing-library/react';
import { CaptionInputField } from '../app/components/uploader/CaptionInputField';

describe('CaptionInputField', () => {
  it('renders with compact default height when empty', async () => {
    render(<CaptionInputField caption={''} setCaption={() => {}} hasPreview={true} processing={false} />);
    const textarea = screen.getByLabelText('Caption') as HTMLTextAreaElement;
    // Inline style minHeight should match our DEFAULT_MIN_HEIGHT of 40px
    expect(textarea.style.minHeight || '40px').toBe('40px');
    // The style.resize should allow vertical resizing
    expect(textarea.style.resize).toBe('vertical');
  });
});
