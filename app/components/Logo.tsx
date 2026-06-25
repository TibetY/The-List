import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function Logo() {
  const { t } = useTranslation();
  // Brand reads from i18n (e.g. "The Foodiedex"). Split on the first space so the
  // first word keeps the gradient treatment and the rest stays light-weight.
  const brand = t("brand");
  const firstSpace = brand.indexOf(" ");
  const lead = firstSpace === -1 ? brand : brand.slice(0, firstSpace);
  const rest = firstSpace === -1 ? "" : brand.slice(firstSpace + 1);

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
        {lead}
      </Typography>
      {rest && (
        <Typography
          variant="h5"
          component="span"
          sx={{
            fontWeight: 300,
            color: "text.primary",
            letterSpacing: "-0.02em",
          }}
        >
          {rest}
        </Typography>
      )}
    </Box>
  );
}
