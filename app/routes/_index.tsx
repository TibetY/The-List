import { Box, Container, Typography, Link as MuiLink } from "@mui/material";
import { Link } from "@remix-run/react";
import Logo from "~/components/Logo";

export default function Index() {
  return (
    <Container
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "bg-dark",
        color: "white",
        textAlign: "center",
      }}
    >
      <Box>
        <Logo />
        <Typography
          variant="h5"
          sx={{
            fontWeight: 300,
            mb: 4,
            animation: "fadeIn 1s",
          }}
        >
          Discover. Taste. Remember.
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
          }}
        >
          <MuiLink
            component={Link}
            to="/login"
            sx={{
              fontSize: "1.25rem",
              textDecoration: "underline",
              color: "accent.main",
              transition: "color 200ms",
              "&:hover": { color: "accentHover.main" },
            }}
          >
            Login
          </MuiLink>
          <Typography sx={{ fontSize: "1.25rem" }}>|</Typography>
          <MuiLink
            component={Link}
            to="/signup"
            sx={{
              fontSize: "1.25rem",
              textDecoration: "underline",
              color: "accent.main",
              transition: "color 200ms",
              "&:hover": { color: "accentHover.main" },
            }}
          >
            Sign Up
          </MuiLink>
        </Box>
      </Box>
    </Container>
  );
}
