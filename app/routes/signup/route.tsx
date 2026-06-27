import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { createSupabaseServerClient } from "~/supabase.server";
import { safeRedirect } from "~/utils/safeRedirect";
import i18nextServer from "~/i18next.server";
import GoogleButton from "~/components/GoogleButton";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Alert,
} from "@mui/material";

type LoaderData = {
  next: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const next = safeRedirect(new URL(request.url).searchParams.get("next"));
  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    return redirect(next);
  }
  return json<LoaderData>({ next });
};

type ActionData = {
  error?: string;
  message?: string;
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const next = safeRedirect(formData.get("next"));
  const t = await i18nextServer.getFixedT(request);

  if (password !== confirmPassword) {
    return json<ActionData>({ error: t("signup.passwordsNoMatch") });
  }

  const { supabase, headers } = createSupabaseServerClient(request);
  const origin = new URL(request.url).origin;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Where the confirmation email link returns to. Our /auth/confirm route
      // verifies the token and signs the user in, then forwards to `next`.
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    console.error("Signup error:", error.message);
    return json<ActionData>({ error: error.message });
  }

  // When email confirmation is enabled, no session is returned yet. Return the
  // headers so any auth cookies set during sign-up are persisted.
  if (!data.session) {
    return json<ActionData>(
      {
        message: t("signup.checkEmail"),
      },
      { headers }
    );
  }

  return redirect(next, { headers });
};

export default function SignUpPage() {
  const actionData = useActionData<ActionData>();
  const { next } = useLoaderData<LoaderData>();
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
          background: "rgba(243, 234, 217, 0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(243, 234, 217, 0.12)",
        }}
        className="animate-fade-in-up"
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 800, mb: 1, letterSpacing: "-0.02em" }}
        >
          {t("signup.title")}
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
          {t("signup.haveAccount")}{" "}
          <Box
            component={Link}
            to={`/login?next=${encodeURIComponent(next)}`}
            sx={{
              color: "primary.main",
              textDecoration: "none",
              fontWeight: 600,
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {t("signup.signin")}
          </Box>
        </Typography>

        {actionData?.error && (
          <Alert severity="error" sx={{ mb: 3 }} role="alert">
            {actionData.error}
          </Alert>
        )}

        {actionData?.message && (
          <Alert severity="success" sx={{ mb: 3 }} role="status">
            {actionData.message}
          </Alert>
        )}

        <GoogleButton next={next} />

        <Form method="post" noValidate>
          <input type="hidden" name="next" value={next} />
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="email"
            name="email"
            label={t("signup.email")}
            type="email"
            autoComplete="email"
            sx={{ mb: 2 }}
          />
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="password"
            id="password"
            label={t("signup.password")}
            type="password"
            autoComplete="new-password"
            sx={{ mb: 2 }}
          />
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            id="confirmPassword"
            label={t("signup.confirmPassword")}
            type="password"
            autoComplete="new-password"
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{ py: 1.5 }}
          >
            {t("signup.submit")}
          </Button>
        </Form>

        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: "center",
            mt: 3,
            color: "text.secondary",
            lineHeight: 1.6,
          }}
        >
          {t("signup.disclaimer")}
        </Typography>
      </Box>
    </Container>
  );
}
