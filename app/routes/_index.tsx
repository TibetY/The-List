import { Box, Container, Typography, Button, Grid } from "@mui/material";
import { Link } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useTranslation } from "react-i18next";
import {
  RestaurantMenu,
  Star,
  Share,
} from "@mui/icons-material";
import Logo from "~/components/Logo";
import { createSupabaseServerClient } from "~/supabase.server";
import { heroTokens } from "~/listTheme";

// Signed-in users don't need the marketing page — send them straight to their
// lists so the hero's "Get Started / Sign In" CTAs are never shown out of context.
export const loader: LoaderFunction = async ({ request }) => {
  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return redirect("/dashboard");
  return json({});
};

export default function Index() {
  const { t } = useTranslation();

  // Amber accent for icons on the warm-dark hero (the app's "Supper" accent).
  const accent = "#D9913F";

  const features = [
    {
      icon: <RestaurantMenu sx={{ fontSize: 32, color: accent }} />,
      title: t("landing.curateTitle"),
      description: t("landing.curateDesc"),
    },
    {
      icon: <Star sx={{ fontSize: 32, color: accent }} />,
      title: t("landing.rateTitle"),
      description: t("landing.rateDesc"),
    },
    {
      icon: <Share sx={{ fontSize: 32, color: accent }} />,
      title: t("landing.shareTitle"),
      description: t("landing.shareDesc"),
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        // Warm-dark hero: terracotta + amber glows over brand green-black — the
        // same palette as the app's night mode, never cold near-black.
        background: heroTokens.bg,
        color: heroTokens.ink,
      }}
    >
      {/* Hero */}
      <Container
        maxWidth="md"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          pt: { xs: 12, sm: 16 },
          pb: { xs: 6, sm: 10 },
          px: { xs: 3, sm: 4 },
          position: "relative",
          zIndex: 1,
        }}
      >
        <Box className="animate-fade-in-up" sx={{ mb: 3 }}>
          <Logo />
        </Box>

        <Typography
          component="h1"
          className="animate-fade-in-up delay-100"
          sx={{
            fontFamily: "'Instrument Serif', serif",
            fontWeight: 400,
            fontSize: { xs: "2.6rem", sm: "3.6rem", md: "4.4rem" },
            lineHeight: 1.04,
            letterSpacing: "-0.01em",
            mb: 2.5,
            color: heroTokens.ink,
          }}
        >
          {t("landing.titleLine1")}
          <br />
          <Box component="span" sx={{ color: accent }}>
            {t("landing.titleLine2")}
          </Box>
        </Typography>

        <Typography
          component="p"
          className="animate-fade-in-up delay-200"
          sx={{
            color: heroTokens.muted,
            fontWeight: 400,
            fontSize: { xs: "1rem", sm: "1.2rem" },
            maxWidth: "520px",
            mb: 5,
            lineHeight: 1.6,
          }}
        >
          {t("landing.subtitle")}
        </Typography>

        <Box
          className="animate-fade-in-up delay-300"
          sx={{
            display: "flex",
            gap: 2,
            flexDirection: { xs: "column", sm: "row" },
            width: { xs: "100%", sm: "auto" },
          }}
        >
          {/* Primary CTA — the one place Ember (gradient) is allowed: the hero. */}
          <Button
            component={Link}
            to="/signup"
            size="large"
            sx={{
              px: 5,
              py: 1.5,
              fontSize: "1.05rem",
              fontWeight: 600,
              color: "#fff",
              background: heroTokens.ember,
              borderRadius: "12px",
              "&:hover": {
                background: heroTokens.ember,
                filter: "brightness(1.05)",
                transform: "translateY(-1px)",
              },
            }}
          >
            {t("landing.getStarted")}
          </Button>
          <Button
            component={Link}
            to="/login"
            variant="outlined"
            size="large"
            sx={{
              px: 5,
              py: 1.5,
              fontSize: "1.05rem",
              color: heroTokens.ink,
              borderColor: heroTokens.glassBorder,
              "&:hover": {
                borderColor: accent,
                backgroundColor: "rgba(217,145,63,0.08)",
              },
            }}
          >
            {t("landing.signIn")}
          </Button>
        </Box>
      </Container>

      {/* Features */}
      <Container
        maxWidth="lg"
        sx={{
          pb: { xs: 8, sm: 12 },
          px: { xs: 3, sm: 4 },
          position: "relative",
          zIndex: 1,
        }}
      >
        <Grid container spacing={3}>
          {features.map((feature, i) => (
            <Grid item xs={12} sm={4} key={feature.title}>
              <Box
                className={`animate-fade-in-up delay-${(i + 3) * 100}`}
                sx={{
                  p: 4,
                  borderRadius: "20px",
                  // Warm frosted glass over brand dark (not cold white-alpha).
                  background: heroTokens.glass,
                  border: `1px solid ${heroTokens.glassBorder}`,
                  backdropFilter: "blur(12px)",
                  transition: "all 0.3s ease",
                  height: "100%",
                  "&:hover": {
                    background: "rgba(243,234,217,0.08)",
                    border: "1px solid rgba(243,234,217,0.2)",
                    transform: "translateY(-4px)",
                  },
                }}
              >
                <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                <Typography
                  component="h2"
                  sx={{
                    fontFamily: "'Instrument Serif', serif",
                    fontWeight: 400,
                    mb: 1,
                    fontSize: "1.4rem",
                    color: heroTokens.ink,
                  }}
                >
                  {feature.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: heroTokens.muted, lineHeight: 1.7 }}
                >
                  {feature.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          textAlign: "center",
          py: 4,
          borderTop: `1px solid ${heroTokens.glassBorder}`,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Typography variant="body2" sx={{ color: heroTokens.muted }}>
          {t("landing.footer")}
        </Typography>
      </Box>
    </Box>
  );
}
