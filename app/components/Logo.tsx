import { Box, Typography } from "@mui/material";

export default function Logo() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
        userSelect: "none",
      }}
    >
      <Typography
        variant="h5"
        component="span"
        sx={{
          fontWeight: 800,
          background: "linear-gradient(135deg, #E8734A, #F2956F)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "-0.02em",
        }}
      >
        The
      </Typography>
      <Typography
        variant="h5"
        component="span"
        sx={{
          fontWeight: 300,
          color: "text.primary",
          letterSpacing: "-0.02em",
        }}
      >
        List
      </Typography>
    </Box>
  );
}
