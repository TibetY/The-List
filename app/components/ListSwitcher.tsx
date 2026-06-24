import { useState } from 'react';
import {
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import {
  KeyboardArrowDown,
  Add,
  Check,
  People,
} from '@mui/icons-material';
import type { RestaurantList } from '~/types/restaurant';

interface ListSwitcherProps {
  lists: RestaurantList[];
  activeList: RestaurantList | null;
  serifFont: string;
  onSelect: (listId: string) => void;
  onCreate: () => void;
}

export default function ListSwitcher({
  lists,
  activeList,
  serifFont,
  onSelect,
  onCreate,
}: ListSwitcherProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  return (
    <>
      <Box
        component="button"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
          setAnchor(e.currentTarget)
        }
        aria-label="Switch list"
        aria-haspopup="true"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          p: 0,
          color: 'inherit',
          fontFamily: serifFont,
          fontSize: { xs: 34, md: 44 },
          fontWeight: 400,
          lineHeight: 1.05,
          textAlign: 'left',
        }}
      >
        {activeList?.name ?? 'My List'}
        <KeyboardArrowDown sx={{ fontSize: 28, opacity: 0.6, mb: '6px' }} />
      </Box>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {lists.map((list) => (
          <MenuItem
            key={list.id}
            selected={list.id === activeList?.id}
            onClick={() => {
              setAnchor(null);
              onSelect(list.id);
            }}
          >
            <ListItemIcon>
              {list.id === activeList?.id ? (
                <Check fontSize="small" />
              ) : (
                <Box sx={{ width: 20 }} />
              )}
            </ListItemIcon>
            <ListItemText primary={list.name} />
            {list.role !== 'owner' && (
              <Chip
                size="small"
                label={list.role}
                sx={{ ml: 1, height: 20, fontSize: 11 }}
              />
            )}
            {(list.memberCount ?? 1) > 1 && (
              <Box
                sx={{
                  ml: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  color: 'text.secondary',
                  fontSize: 12,
                }}
              >
                <People sx={{ fontSize: 14 }} />
                {list.memberCount}
              </Box>
            )}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onCreate();
          }}
        >
          <ListItemIcon>
            <Add fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="New list…" />
        </MenuItem>
      </Menu>
    </>
  );
}
