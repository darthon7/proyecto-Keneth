import { Button } from '@/components/atoms/Button';
import { SearchBar } from '@/components/molecules/SearchBar';

interface HeroSectionProps {
  onExplore: () => void;
  onSearch: (term: string) => void;
  onPublish: () => void;
}

export function HeroSection({ onExplore, onSearch, onPublish }: HeroSectionProps) {
  return (
    <section>
      <div className="page-container pt-16 pb-24">
        <div className="max-w-2xl">
          <h1 className="text-display text-[#0F172A]">
            Busca el juego.
            <br />
            Compra la edición.
          </h1>
          <p className="mt-6 max-w-md text-body text-[#475569]">
            Ediciones digitales y físicas, promociones activas y tu biblioteca
            siempre a mano.
          </p>

          <div className="mt-10 max-w-xl">
            <SearchBar
              onSearch={onSearch}
              onAction={onPublish}
              actionLabel="Publica el tuyo"
              placeholder="Busca videojuegos, plataformas, publishers…"
            />
          </div>

          <div className="mt-10">
            <Button variant="primary" size="lg" onClick={onExplore}>
              Ver el catálogo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
