import { Box, Typography } from "@mui/material";

export default function Logo() {
  return (
    <Box
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <Typography
        variant="h4"
        style={{
          fontWeight: "bold",
          color: "#F59E0B",
          letterSpacing: "0.1em",
          textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        The
      </Typography>
      <Typography
        variant="h4"
        style={{
          fontWeight: "300",
          letterSpacing: "0.1em",
        }}
      >
        List
      </Typography>
    </Box>
  );
}
