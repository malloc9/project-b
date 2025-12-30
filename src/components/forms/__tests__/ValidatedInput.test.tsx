import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ValidatedInput } from '../ValidatedInput';

describe('ValidatedInput', () => {
  const mockOnChange = vi.fn();
  const mockOnValidate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input with correct value', () => {
    render(
      <ValidatedInput
        value="test value"
        onChange={mockOnChange}
        placeholder="Enter text"
      />
    );

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toHaveValue('test value');
  });

  it('calls onChange when input value changes', async () => {
    render(
      <ValidatedInput
        value=""
        onChange={mockOnChange}
        placeholder="Enter text"
      />
    );

    const input = screen.getByPlaceholderText('Enter text');
    fireEvent.change(input, { target: { value: 'new text' } });

    expect(mockOnChange).toHaveBeenCalledWith('new text');
  });

  it('sanitizes input by default', async () => {
    render(
      <ValidatedInput
        value=""
        onChange={mockOnChange}
        placeholder="Enter text"
      />
    );

    const input = screen.getByPlaceholderText('Enter text');
    fireEvent.change(input, { target: { value: '<script>alert("xss")</script>' } });

    expect(mockOnChange).toHaveBeenCalledWith('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  });

  it('validates on blur when validateOnBlur is true', async () => {
    const user = userEvent.setup();
    mockOnValidate.mockReturnValue({ field: 'test', message: 'Invalid input' });
    
    render(
      <ValidatedInput
        value="invalid"
        onChange={mockOnChange}
        onValidate={mockOnValidate}
        validateOnBlur={true}
        placeholder="Enter text"
      />
    );

    const input = screen.getByPlaceholderText('Enter text');
    await user.click(input);
    await user.tab(); // Blur the input

    expect(mockOnValidate).toHaveBeenCalledWith('invalid');
    expect(screen.getByText('Invalid input')).toBeInTheDocument();
  });

  it('validates on change when validateOnChange is true', async () => {
    mockOnValidate.mockReturnValue(null); // Valid input
    
    render(
      <ValidatedInput
        value=""
        onChange={mockOnChange}
        onValidate={mockOnValidate}
        validateOnChange={true}
        debounceMs={0}
        placeholder="Enter text"
      />
    );

    const input = screen.getByPlaceholderText('Enter text');
    fireEvent.change(input, { target: { value: 'valid' } });

    await waitFor(() => {
      expect(mockOnValidate).toHaveBeenCalledWith('valid');
    });
  });

  it('debounces validation when debounceMs is set', async () => {
    mockOnValidate.mockReturnValue(null);
    
    render(
      <ValidatedInput
        value=""
        onChange={mockOnChange}
        onValidate={mockOnValidate}
        validateOnChange={true}
        debounceMs={100}
        placeholder="Enter text"
      />
    );

    const input = screen.getByPlaceholderText('Enter text');
    fireEvent.change(input, { target: { value: 'test' } });

    // Should not validate immediately
    expect(mockOnValidate).not.toHaveBeenCalledWith('test');

    // Should validate after debounce delay
    await waitFor(() => {
      expect(mockOnValidate).toHaveBeenCalledWith('test');
    }, { timeout: 200 });
  });

  it('displays validation error with correct styling', () => {
    mockOnValidate.mockReturnValue({ field: 'test', message: 'Error message' });
    
    const {} = render(
      <ValidatedInput
        value="invalid"
        onChange={mockOnChange}
        onValidate={mockOnValidate}
        validateOnBlur={true}
        placeholder="Enter text"
      />
    );

    const input = screen.getByPlaceholderText('Enter text');
    
    // Trigger validation by blurring
    fireEvent.blur(input);

    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(input).toHaveClass('border-red-300');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('clears validation error when typing if not validating on change', async () => {
    const user = userEvent.setup();
    mockOnValidate.mockReturnValue({ field: 'test', message: 'Error message' });
    
    render(
      <ValidatedInput
        value="invalid"
        onChange={mockOnChange}
        onValidate={mockOnValidate}
        validateOnBlur={true}
        validateOnChange={false}
        placeholder="Enter text"
      />
    );

    const input = screen.getByPlaceholderText('Enter text');
    
    // Trigger validation error
    fireEvent.blur(input);
    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Start typing - error should clear
    await user.type(input, 'x');
    expect(screen.queryByText('Error message')).not.toBeInTheDocument();
  });

  it('applies custom sanitization options', async () => {
    render(
      <ValidatedInput
        value=""
        onChange={mockOnChange}
        sanitizeOptions={{ maxLength: 5, trimWhitespace: true }}
        placeholder="Enter text"
      />
    );

    const input = screen.getByPlaceholderText('Enter text');
    fireEvent.change(input, { target: { value: '  toolongtext  ' } });

    expect(mockOnChange).toHaveBeenCalledWith('toolo');
  });

  it('disables sanitization when sanitize is false', async () => {
    render(
      <ValidatedInput
        value=""
        onChange={mockOnChange}
        sanitize={false}
        placeholder="Enter text"
      />
    );

    const input = screen.getByPlaceholderText('Enter text');
    fireEvent.change(input, { target: { value: '<script>test</script>' } });

    expect(mockOnChange).toHaveBeenCalledWith('<script>test</script>');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    
    render(
      <ValidatedInput
        ref={ref}
        value="test"
        onChange={mockOnChange}
        placeholder="Enter text"
      />
    );

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.value).toBe('test');
  });

  it('passes through other input props', () => {
    render(
      <ValidatedInput
        value="test"
        onChange={mockOnChange}
        placeholder="Enter text"
        type="email"
        disabled={true}
        maxLength={10}
      />
    );

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('maxLength', '10');
  });
});