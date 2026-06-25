import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Alert,
} from "@mui/material";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { createSupabaseServerClient } from "~/supabase.server";
import { safeRedirect } from "~/utils/safeRedirect";

type ActionData = {
  error?: string;
};

type LoaderData = {
  next: string;
  error: string | null;
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const next = safeRedirect(url.searchParams.get("next"));
  const error = url.searchParams.get("error");
  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    return redirect(next);
  }
  return json<LoaderData>({ next, error });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = safeRedirect(formData.get("next"));

  const { supabase, headers } = createSupabaseServerClient(request);
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Login error:", error.message);
    return json<ActionData>({ error: error.message });
  }

  return redirect(next, { headers });
};

export default function LoginPage() {
  const actionData = useActionData<ActionData>();
  const { next, error: loaderError } = useLoaderData<LoaderData>();
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
          background: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
        className="animate-fade-in-up"
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 800, mb: 1, letterSpacing: "-0.02em" }}
        >
          {t("login.title")}
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
          {t("login.noAccount")}{" "}
          <Box
            component={Link}
            to={`/signup?next=${encodeURIComponent(next)}`}
            sx={{
              color: "primary.main",
              textDecoration: "none",
              fontWeight: 600,
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {t("login.createFree")}
          </Box>
        </Typography>

        {(actionData?.error || loaderError) && (
          <Alert severity="error" sx={{ mb: 3 }} role="alert">
            {actionData?.error ?? loaderError}
          </Alert>
        )}

        <Form method="post" noValidate>
          <input type="hidden" name="next" value={next} />
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="email"
            name="email"
            label={t("login.email")}
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
            label={t("login.password")}
            type="password"
            autoComplete="current-password"
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{ py: 1.5 }}
          >
            {t("login.submit")}
          </Button>
        </Form>
      </Box>
    </Container>
  );
}
