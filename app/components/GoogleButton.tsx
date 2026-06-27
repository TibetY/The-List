import { useState } from "react";
import { Button, CircularProgress, Divider, Typography, Box, Alert } from "@mui/material";
import { useTranslation } from "react-i18next";
import { getSupabaseBrowserClient } from "~/supabase.client";

/** Multicolour Google "G", inline so we don't pull in a brand-icon dependency. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

/**
 * "Continue with Google" + an "or" divider for the auth pages. Runs Supabase
 * OAuth from the browser (a full-page redirect to Google), returning to
 * /auth/confirm which exchanges the code and forwards to `next`.
 */
export default function GoogleButton({ next }: { next: string }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (oauthError) throw oauthError;
      // Success redirects the page to Google; nothing else to do here.
    } catch (e) {
      console.error("Google sign-in failed:", e);
      setError(t("auth.googleFailed"));
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mb: 1 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} role="alert">
          {error}
        </Alert>
      )}
      <Button
        fullWidth
        variant="outlined"
        size="large"
        onClick={handleClick}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <GoogleIcon />}
        sx={{ py: 1.4, color: "text.primary" }}
      >
        {t("auth.continueWithGoogle")}
      </Button>
      <Divider sx={{ my: 3, "&::before, &::after": { borderColor: "divider" } }}>
        <Typography variant="caption" sx={{ color: "text.secondary", px: 1 }}>
          {t("auth.or")}
        </Typography>
      </Divider>
    </Box>
  );
}
