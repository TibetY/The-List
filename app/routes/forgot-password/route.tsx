import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Alert,
} from "@mui/material";
import { createSupabaseServerClient } from "~/supabase.server";
import { getSiteUrl } from "~/utils/siteUrl.server";
import i18nextServer from "~/i18next.server";

type ActionData = {
  error?: string;
  sent?: boolean;
};

export const loader: LoaderFunction = async ({ request }) => {
  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return redirect("/dashboard");
  return json({});
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = ((formData.get("email") as string) || "").trim();
  const { supabase, headers } = createSupabaseServerClient(request);
  const origin = getSiteUrl(request);

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // /auth/confirm verifies the recovery token (setting a session) then forwards
    // here so the user can choose a new password.
    redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(
      "/reset-password"
    )}`,
  });

  if (error) {
    console.error("Password reset request error:", error.message);
    const t = await i18nextServer.getFixedT(request);
    return json<ActionData>({ error: t("forgot.error") }, { headers });
  }

  // Always report success regardless of whether the address has an account, so
  // we don't leak which emails are registered.
  return json<ActionData>({ sent: true }, { headers });
};

export default function ForgotPasswordPage() {
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation();

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 3, sm: 4 },
        pt: 8,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 440,
          p: { xs: 3, sm: 5 },
          borderRadius: "24px",
          background: "#FFFFFF",
          border: "1px solid #EAE0CF",
          boxShadow: "0 22px 46px -28px rgba(35,25,16,.4)",
        }}
        className="animate-fade-in-up"
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, mb: 1, letterSpacing: "-0.01em" }}
        >
          {t("forgot.title")}
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
          {t("forgot.intro")}
        </Typography>

        {actionData?.error && (
          <Alert severity="error" sx={{ mb: 3 }} role="alert">
            {actionData.error}
          </Alert>
        )}

        {actionData?.sent ? (
          <Alert severity="success" sx={{ mb: 1 }} role="status">
            {t("forgot.sent")}
          </Alert>
        ) : (
          <Form method="post" noValidate>
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="email"
              name="email"
              label={t("forgot.email")}
              type="email"
              autoComplete="email"
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{ py: 1.5 }}
            >
              {t("forgot.submit")}
            </Button>
          </Form>
        )}

        <Typography variant="body2" sx={{ mt: 3, textAlign: "center" }}>
          <Box
            component={Link}
            to="/login"
            sx={{
              color: "primary.main",
              textDecoration: "none",
              fontWeight: 600,
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {t("forgot.backToLogin")}
          </Box>
        </Typography>
      </Box>
    </Container>
  );
}
