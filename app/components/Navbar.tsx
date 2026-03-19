import { useState } from "react";
import { useLocation, useRouteLoaderData, Link } from "@remix-run/react";
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Menu as MenuIcon, Close as CloseIcon } from "@mui/icons-material";
import Logo from "./Logo";

export default function Navbar() {
  const location = useLocation();
  const rootData = useRouteLoaderData("root") as { token: string | null } | undefined;
  const isLoggedIn = !!rootData?.token;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Hide navbar on dashboard (it has its own app bar)
  if (location.pathname === "/dashboard") return null;

  const navLinks = isLoggedIn
    ? [{ label: "Dashboard", to: "/dashboard" }]
    : [
        { label: "Login", to: "/login" },
        { label: "Sign Up", to: "/signup" },
      ];

  return (
    <AppBar
      position="fixed"
      component="nav"
      aria-label="Main navigation"
      sx={{
        background: "rgba(10, 10, 15, 0.6)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
          maxWidth: "1200px",
          width: "100%",
          mx: "auto",
          px: { xs: 2, sm: 3 },
        }}
      >
        <Link to="/" style={{ textDecoration: "none" }} aria-label="The List - Home">
          <Logo />
        </Link>

        {isMobile ? (
          <>
            <IconButton
              color="inherit"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              sx={{ color: "text.primary" }}
            >
              <MenuIcon />
            </IconButton>
            <Drawer
              anchor="right"
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              PaperProps={{
                sx: {
                  width: 280,
                  background: "#141420",
                  borderLeft: "1px solid rgba(255,255,255,0.08)",
                },
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
                <IconButton
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close navigation menu"
                  sx={{ color: "text.primary" }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
              <List role="navigation" aria-label="Mobile navigation">
                {navLinks.map((link) => (
                  <ListItem key={link.to} disablePadding>
                    <ListItemButton
                      component={Link}
                      to={link.to}
                      onClick={() => setDrawerOpen(false)}
                      sx={{
                        px: 3,
                        py: 1.5,
                        "&:hover": {
                          backgroundColor: "rgba(232, 115, 74, 0.08)",
                        },
                      }}
                    >
                      <ListItemText
                        primary={link.label}
                        primaryTypographyProps={{
                          fontWeight: 600,
                          fontSize: "1.1rem",
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Drawer>
          </>
        ) : (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            {navLinks.map((link) =>
              link.label === "Sign Up" ? (
                <Button
                  key={link.to}
                  component={Link}
                  to={link.to}
                  variant="contained"
                  size="small"
                  sx={{ ml: 1 }}
                >
                  {link.label}
                </Button>
              ) : (
                <Button
                  key={link.to}
                  component={Link}
                  to={link.to}
                  sx={{
                    color: "text.secondary",
                    fontWeight: 500,
                    "&:hover": {
                      color: "text.primary",
                      backgroundColor: "rgba(255,255,255,0.04)",
                    },
                  }}
                >
                  {link.label}
                </Button>
              )
            )}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
