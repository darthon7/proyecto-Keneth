import { Link } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';

export function NotFoundPage() {
  return (
    <section className="page-container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-caption uppercase tracking-[0.18em] text-[#FF2A5F] font-bold">Error 404</p>
      <h1 className="text-heading font-extrabold text-[#0F172A]">Esta página no existe</h1>
      <p className="max-w-md text-body-sm text-[#475569]">
        El enlace que buscas no está disponible en la tienda.
      </p>
      <Link to="/">
        <Button variant="brand">Volver al inicio</Button>
      </Link>
    </section>
  );
}
