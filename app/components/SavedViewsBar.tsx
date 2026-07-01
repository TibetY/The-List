import { useState } from 'react';
import { Box, Menu, MenuItem } from '@mui/material';
import { Bookmark, BookmarkBorder, MoreVert, Add } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { ListView } from '~/types/restaurant';
import type { listTokens } from '~/listTheme';

type Tokens = (typeof listTokens)['light'];

interface SavedViewsBarProps {
  tokens: Tokens;
  views: ListView[];
  /** Canonical serialized current filter params, for the active-view highlight. */
  currentParams: string;
  hasActiveFilters: boolean;
  onApply: (view: ListView) => void;
  onSave: () => void;
  onRename: (view: ListView) => void;
  onDelete: (view: ListView) => void;
}

/**
 * A calm row of the user's saved filter views, plus a "Save view" affordance when
 * there are active filters worth keeping. Applying a view is just applying its
 * stored querystring; the pill highlights when the current filters match it.
 */
export default function SavedViewsBar({
  tokens: t,
  views,
  currentParams,
  hasActiveFilters,
  onApply,
  onSave,
  onRename,
  onDelete,
}: SavedViewsBarProps) {
  const { t: tr } = useTranslation();
  const [menu, setMenu] = useState<{ anchor: HTMLElement; view: ListView } | null>(null);

  if (views.length === 0 && !hasActiveFilters) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', mt: '18px' }}>
      {views.map((view) => {
        const active = view.params === currentParams;
        return (
          <Box
            key={view.id}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              border: `1px solid ${active ? t.accent : t.pillBorder}`,
              background: active ? t.pBg : 'transparent',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <Box
              component="button"
              type="button"
              onClick={() => onApply(view)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                background: 'transparent',
                color: active ? t.pFg : t.chip,
                fontFamily: "'DM Sans',sans-serif",
                fontSize: '13px',
                fontWeight: 500,
                padding: '7px 6px 7px 14px',
                cursor: 'pointer',
              }}
            >
              {active ? <Bookmark sx={{ fontSize: 15 }} /> : <BookmarkBorder sx={{ fontSize: 15 }} />}
              {view.name}
            </Box>
            <Box
              component="button"
              type="button"
              aria-label={tr('views.options', { name: view.name })}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => setMenu({ anchor: e.currentTarget, view })}
              sx={{ display: 'inline-flex', alignItems: 'center', border: 'none', background: 'transparent', color: active ? t.pFg : t.faint, cursor: 'pointer', padding: '7px 8px 7px 2px' }}
            >
              <MoreVert sx={{ fontSize: 16 }} />
            </Box>
          </Box>
        );
      })}

      {hasActiveFilters && (
        <Box
          component="button"
          type="button"
          onClick={onSave}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            border: `1px dashed ${t.pillBorder}`,
            background: 'transparent',
            color: t.accent,
            borderRadius: '999px',
            fontFamily: "'DM Sans',sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            padding: '7px 14px',
            cursor: 'pointer',
          }}
        >
          <Add sx={{ fontSize: 16 }} /> {tr('views.save')}
        </Box>
      )}

      <Menu anchorEl={menu?.anchor ?? null} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            if (menu) onRename(menu.view);
            setMenu(null);
          }}
        >
          {tr('views.rename')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menu) onDelete(menu.view);
            setMenu(null);
          }}
        >
          {tr('views.delete')}
        </MenuItem>
      </Menu>
    </Box>
  );
}
