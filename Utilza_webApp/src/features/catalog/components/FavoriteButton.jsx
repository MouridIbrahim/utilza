import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useSessionStore } from '../../../stores/session.js';
import { isFavorited, useFavoritesQuery, useToggleFavorite } from '../../../hooks/useFavorites.js';

export function FavoriteButton({ toolId, toolSlug, size = 18 }) {
  const navigate = useNavigate();
  const { token } = useSessionStore();
  const favorites = useFavoritesQuery();
  const toggle = useToggleFavorite();
  const favorited = isFavorited(favorites.data, toolId);

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      navigate(`/login?returnTo=${encodeURIComponent(toolSlug ? `/tools/${toolSlug}` : '/tools')}`);
      return;
    }
    if (!toolId || toggle.isPending) return;
    toggle.mutate({ toolId, favorited, toolSlug });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={toggle.isPending}
      aria-pressed={favorited}
      aria-label={favorited ? 'Remove from favorites' : 'Save to favorites'}
      title={favorited ? 'Remove from favorites' : 'Save to favorites'}
      className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 hover:bg-[var(--color-surface-subtle)] disabled:opacity-60"
    >
      <Heart
        size={size}
        aria-hidden="true"
        fill={favorited ? 'currentColor' : 'none'}
        className={favorited ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}
      />
    </button>
  );
}
