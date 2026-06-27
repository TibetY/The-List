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
// lists so the hero's CTAs are never shown out of context.
export const loader: LoaderFunction = async ({ request }) => {
  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return redirect("/dashboard");
  return json({});
};

const ACCENT = "#D9913F"; // amber — the app's "Supper" accent, used on the warm-dark hero

/** A small decorative restaurant card for the hero cluster (not interactive). */
function PreviewCard({
  initial,
  name,
  meta,
  price,
  rating,
  statusLabel,
  been,
}: {
  initial: string;
  name: string;
  meta: string;
  price: string;
  rating?: number;
  statusLabel: string;
  been?: boolean;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        borderRadius: "14px",
        background: "#1C2A23",
        border: `1px solid ${heroTokens.glassBorder}`,
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 44,
          height: 44,
          flex: "none",
          borderRadius: "11px",
          background: "linear-gradient(135deg,#2A3A2F,#1A241E)",
          color: "rgba(217,145,63,.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Instrument Serif', serif",
          fontSize: 22,
        }}
      >
        {initial}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ fontFamily: "'Instrument Serif', serif", fontSize: 17, color: heroTokens.ink }}>
            {name}
          </Box>
          <Box sx={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, color: "#9FD3A6" }}>
            {price}
          </Box>
        </Box>
        <Box sx={{ color: heroTokens.muted, fontSize: 12.5, mt: "1px" }}>{meta}</Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: "5px" }}>
          <Box sx={{ color: ACCENT, fontSize: 13, letterSpacing: "1px" }}>
            {rating ? "★★★★★".slice(0, rating) + "☆☆☆☆☆".slice(0, 5 - rating) : ""}
          </Box>
          <Box
            sx={{
              fontSize: 10.5,
              fontWeight: 600,
              px: "9px",
              py: "3px",
              borderRadius: "999px",
              background: been ? "#24402F" : "#3A2A1A",
              color: been ? "#9FD3A6" : "#E0A85C",
            }}
          >
            {statusLabel}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function Index() {
  const { t } = useTranslation();

  const features = [
    {
      icon: <RestaurantMenu sx={{ fontSize: 30, color: ACCENT }} />,
      title: t("landing.curateTitle"),
      description: t("landing.curateDesc"),
    },
    {
      icon: <Star sx={{ fontSize: 30, color: ACCENT }} />,
      title: t("landing.rateTitle"),
      description: t("landing.rateDesc"),
    },
    {
      icon: <Share sx={{ fontSize: 30, color: ACCENT }} />,
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
        background: heroTokens.bg,
        color: heroTokens.ink,
        overflow: "hidden",
      }}
    >
      {/* Hero */}
      <Container
        maxWidth="lg"
        sx={{
          flex: 1,
          pt: { xs: 14, sm: 18 },
          pb: { xs: 8, sm: 12 },
          px: { xs: 3, sm: 4 },
        }}
      >
        <Grid container spacing={{ xs: 6, md: 8 }} alignItems="center">
          {/* Left — copy + CTAs */}
          <Grid item xs={12} md={7}>
            <Box className="animate-fade-in-up" sx={{ mb: 3 }}>
              <Logo />
            </Box>
            <Typography
              component="p"
              className="animate-fade-in-up delay-100"
              sx={{
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: ACCENT,
                mb: 2,
              }}
            >
              {t("landing.eyebrow")}
            </Typography>
            <Typography
              component="h1"
              className="animate-fade-in-up delay-100"
              sx={{
                fontFamily: "'Instrument Serif', serif",
                fontWeight: 400,
                fontSize: { xs: "2.7rem", sm: "3.6rem", md: "4.2rem" },
                lineHeight: 1.04,
                letterSpacing: "-0.01em",
                mb: 2.5,
                color: heroTokens.ink,
              }}
            >
              {t("landing.titleLine1")}
              <br />
              <Box component="span" sx={{ color: ACCENT }}>
                {t("landing.titleLine2")}
              </Box>
            </Typography>
            <Typography
              component="p"
              className="animate-fade-in-up delay-200"
              sx={{
                color: heroTokens.muted,
                fontSize: { xs: "1rem", sm: "1.15rem" },
                maxWidth: 520,
                mb: 4,
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
                  px: 4.5,
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
                {t("landing.ctaPrimary")}
              </Button>
              <Button
                component="a"
                href="#how-it-works"
                variant="outlined"
                size="large"
                sx={{
                  px: 4.5,
                  py: 1.5,
                  fontSize: "1.05rem",
                  color: heroTokens.ink,
                  borderColor: heroTokens.glassBorder,
                  "&:hover": {
                    borderColor: ACCENT,
                    backgroundColor: "rgba(217,145,63,0.08)",
                  },
                }}
              >
                {t("landing.ctaSecondary")}
              </Button>
            </Box>
          </Grid>

          {/* Right — sample-card cluster + social proof */}
          <Grid item xs={12} md={5}>
            <Box
              className="animate-fade-in-up delay-200"
              sx={{
                p: 2.5,
                borderRadius: "22px",
                background: heroTokens.glass,
                border: `1px solid ${heroTokens.glassBorder}`,
                backdropFilter: "blur(14px)",
                boxShadow: "0 24px 60px rgba(0,0,0,.45)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, px: 0.5 }}>
                <Box sx={{ display: "flex" }}>
                  {["M", "J", "R"].map((a, i) => (
                    <Box
                      key={a}
                      aria-hidden
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        ml: i === 0 ? 0 : "-9px",
                        border: "2px solid #15201B",
                        background: i === 0 ? ACCENT : i === 1 ? "#4F7A5A" : "#2F3E33",
                        color: i === 0 ? "#15201B" : "#EFE7D6",
                        fontSize: 12,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {a}
                    </Box>
                  ))}
                </Box>
                <Typography sx={{ color: heroTokens.muted, fontSize: 12.5 }}>
                  {t("landing.socialProof")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <PreviewCard
                  initial="W"
                  name="The Whalesbone"
                  meta={`Ottawa · ${t("cuisines.Seafood", "Seafood")}`}
                  price="$$$"
                  rating={5}
                  statusLabel={t("dashboard.statusBeen")}
                  been
                />
                <PreviewCard
                  initial="A"
                  name="Atelier"
                  meta={`Ottawa · ${t("cuisines.French", "French")}`}
                  price="$$$$"
                  statusLabel={t("dashboard.statusWant")}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* How it works */}
      <Container
        id="how-it-works"
        maxWidth="lg"
        sx={{ pb: { xs: 8, sm: 12 }, px: { xs: 3, sm: 4 }, scrollMarginTop: "90px" }}
      >
        <Typography
          component="h2"
          sx={{
            fontFamily: "'Instrument Serif', serif",
            fontWeight: 400,
            fontSize: { xs: "2rem", sm: "2.6rem" },
            mb: 4,
            color: heroTokens.ink,
          }}
        >
          {t("landing.howItWorksTitle")}
        </Typography>
        <Grid container spacing={3}>
          {features.map((feature) => (
            <Grid item xs={12} sm={4} key={feature.title}>
              <Box
                sx={{
                  p: 4,
                  borderRadius: "20px",
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
                  component="h3"
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
                <Typography variant="body2" sx={{ color: heroTokens.muted, lineHeight: 1.7 }}>
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
        }}
      >
        <Typography variant="body2" sx={{ color: heroTokens.muted }}>
          {t("landing.footer")}
        </Typography>
      </Box>
    </Box>
  );
}
