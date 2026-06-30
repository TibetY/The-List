import { useState } from "react";
import { useLocation, useRouteLoaderData, Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
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
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar() {
  const location = useLocation();
  const { t } = useTranslation();
  const rootData = useRouteLoaderData("root") as { isLoggedIn: boolean } | undefined;
  const isLoggedIn = !!rootData?.isLoggedIn;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Hide navbar on the dashboard and the public share view (both have their own
  // header).
  if (location.pathname === "/dashboard" || location.pathname.startsWith("/s/")) {
    return null;
  }

  const navLinks = isLoggedIn
    ? [
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.profile"), to: "/profile" },
      ]
    : [
        { label: t("nav.login"), to: "/login" },
        { label: t("nav.signup"), to: "/signup" },
      ];

  return (
    <AppBar
      position="fixed"
      component="nav"
      aria-label={t("nav.main")}
      sx={{
        background: "rgba(14, 21, 13, 0.7)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(239, 228, 210, 0.1)",
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
        <Link to="/" style={{ textDecoration: "none" }} aria-label={t("nav.home")}>
          <Logo />
        </Link>

        {isMobile ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LanguageSwitcher />
            <IconButton
              color="inherit"
              onClick={() => setDrawerOpen(true)}
              aria-label={t("nav.openMenu")}
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
                  background: "#15201B",
                  borderLeft: "1px solid rgba(239,228,210,0.1)",
                },
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
                <IconButton
                  onClick={() => setDrawerOpen(false)}
                  aria-label={t("nav.closeMenu")}
                  sx={{ color: "text.primary" }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
              <List role="navigation" aria-label={t("nav.mobileNav")}>
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
                          backgroundColor: "rgba(217, 145, 63, 0.1)",
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
          </Box>
        ) : (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <LanguageSwitcher />
            {navLinks.map((link) =>
              link.to === "/signup" ? (
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
