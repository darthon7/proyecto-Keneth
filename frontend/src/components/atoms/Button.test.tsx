import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button atom', () => {
  it('renders children and default classes with nintendo animation enabled by default', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('btn-nintendo-animation');
    expect(btn.className).toContain('btn-nintendo-shine');
    expect(btn.className).toContain('bg-[#FF2A5F]');
    expect(btn.className).toContain('rounded-full');
  });

  it('can opt out of animation when animation="none"', () => {
    render(<Button animation="none">No motion</Button>);
    const btn = screen.getByRole('button', { name: /no motion/i });
    expect(btn.className).toContain('transition-colors');
    expect(btn.className).not.toContain('btn-nintendo-animation');
  });

  it('renders nintendo variant with brand color and animation classes', () => {
    render(<Button variant="nintendo">Comprar juegos</Button>);
    const btn = screen.getByRole('button', { name: /comprar juegos/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('bg-[#e60012]');
    expect(btn.className).toContain('btn-nintendo-animation');
    expect(btn.className).toContain('btn-nintendo-shine');
    expect(btn.className).toContain('rounded-full');
  });

  it('renders success variant with emerald color and pill radius', () => {
    render(<Button variant="success">Confirmar compra</Button>);
    const btn = screen.getByRole('button', { name: /confirmar compra/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('bg-emerald-500');
    expect(btn.className).toContain('rounded-full');
  });

  it('applies nintendo animation when animation="nintendo" or animated={true} is set on other variants', () => {
    const { rerender } = render(<Button variant="primary" animation="nintendo">Explore</Button>);
    let btn = screen.getByRole('button', { name: /explore/i });
    expect(btn.className).toContain('btn-nintendo-animation');
    expect(btn.className).toContain('btn-nintendo-shine');

    rerender(<Button variant="brand" animated>Explore Brand</Button>);
    btn = screen.getByRole('button', { name: /explore brand/i });
    expect(btn.className).toContain('btn-nintendo-animation');
    expect(btn.className).toContain('btn-nintendo-shine');
  });

  it('disables the button and shows spinner when isLoading is true', () => {
    render(<Button isLoading>Cargando</Button>);
    const btn = screen.getByRole('button', { name: /cargando/i });
    expect(btn).toBeDisabled();
    expect(btn.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
