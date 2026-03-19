import { Box, Container, Typography, Button, Grid } from "@mui/material";
import { Link } from "@remix-run/react";
import {
  RestaurantMenu,
  Star,
  Share,
} from "@mui/icons-material";
import Logo from "~/components/Logo";

const features = [
  {
    icon: <RestaurantMenu sx={{ fontSize: 32, color: "#E8734A" }} />,
    title: "Curate Your List",
    description:
      "Save every restaurant you visit with ratings, photos, and personal notes.",
  },
  {
    icon: <Star sx={{ fontSize: 32, color: "#E8734A" }} />,
    title: "Rate & Review",
    description:
      "Your honest ratings and comments — no fake reviews, just your real experience.",
  },
  {
    icon: <Share sx={{ fontSize: 32, color: "#E8734A" }} />,
    title: "Share Favorites",
    description:
      "Email your curated restaurant list to friends who always ask where to eat.",
  },
];

export default function Index() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient background glow */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(232,115,74,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          bottom: "-10%",
          left: "-10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

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
        <Box
          className="animate-fade-in-up"
          sx={{ mb: 3 }}
        >
          <Logo />
        </Box>

        <Typography
          variant="h2"
          component="h1"
          className="animate-fade-in-up delay-100"
          sx={{
            fontSize: { xs: "2.2rem", sm: "3rem", md: "3.8rem" },
            fontWeight: 800,
            lineHeight: 1.1,
            mb: 2,
            letterSpacing: "-0.03em",
          }}
        >
          Your personal
          <br />
          <Box component="span" className="gradient-text">
            restaurant guide
          </Box>
        </Typography>

        <Typography
          variant="h6"
          component="p"
          className="animate-fade-in-up delay-200"
          sx={{
            color: "text.secondary",
            fontWeight: 400,
            fontSize: { xs: "1rem", sm: "1.2rem" },
            maxWidth: "500px",
            mb: 5,
            lineHeight: 1.6,
          }}
        >
          Discover. Taste. Remember. Track every meal, rate every bite, and
          never forget a great restaurant again.
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
          <Button
            component={Link}
            to="/signup"
            variant="contained"
            size="large"
            sx={{
              px: 5,
              py: 1.5,
              fontSize: "1.05rem",
            }}
          >
            Get Started
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
              color: "text.secondary",
            }}
          >
            Sign In
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
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(10px)",
                  transition: "all 0.3s ease",
                  height: "100%",
                  "&:hover": {
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    transform: "translateY(-4px)",
                  },
                }}
              >
                <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, mb: 1, fontSize: "1.1rem" }}
                >
                  {feature.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", lineHeight: 1.7 }}
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
          borderTop: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Built with love for food lovers everywhere.
        </Typography>
      </Box>
    </Box>
  );
}
