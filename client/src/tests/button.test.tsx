// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from '../components/ui/button';

describe('Button Component', () => {
  it('renders button with text', () => {
    const { getByText } = render(<Button>Click me</Button>);
    const button = getByText('Click me');
    expect(button).toBeDefined();
  });

  it('applies variant styles correctly', () => {
    const { getByText } = render(<Button variant="destructive">Delete</Button>);
    const button = getByText('Delete');
    expect(button.className).toContain('bg-destructive');
  });

  it('handles click events', async () => {
    let clicked = false;
    const { getByText } = render(<Button onClick={() => { clicked = true; }}>Test</Button>);
    
    const button = getByText('Test');
    button.click();
    
    expect(clicked).toBe(true);
  });
});
