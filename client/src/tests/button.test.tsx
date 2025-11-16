import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/ui/button';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByText('Click me');
    expect(button).toBeDefined();
  });

  it('applies variant styles correctly', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByText('Delete');
    expect(button.className).toContain('bg-destructive');
  });

  it('handles click events', async () => {
    let clicked = false;
    render(<Button onClick={() => { clicked = true; }}>Test</Button>);
    
    const button = screen.getByText('Test');
    button.click();
    
    expect(clicked).toBe(true);
  });
});
