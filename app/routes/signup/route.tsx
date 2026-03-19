import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useActionData, Link } from "@remix-run/react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "~/firebase";
import { getSession, commitSession } from "~/session.server";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Alert,
} from "@mui/material";

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const token = session.get("token");
  if (token) {
    return redirect("/dashboard");
  }
  return {};
};

type ActionData = {
  error?: string;
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" } as ActionData;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const token = await userCredential.user.getIdToken();

    const session = await getSession(request.headers.get("Cookie"));
    session.set("token", token);
    session.set("userId", userCredential.user.uid);

    return redirect("/dashboard", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Signup error:", err.message);
      return { error: err.message } as ActionData;
    } else {
      console.error("Signup error:", err);
      return { error: "An unknown error occurred" } as ActionData;
    }
  }
};

export default function SignUpPage() {
  const actionData = useActionData<ActionData>();

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
          Create account
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
          Already have an account?{" "}
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
            Sign in
          </Box>
        </Typography>

        {actionData?.error && (
          <Alert severity="error" sx={{ mb: 3 }} role="alert">
            {actionData.error}
          </Alert>
        )}

        <Form method="post" noValidate>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="email"
            name="email"
            label="Email Address"
            type="email"
            autoComplete="email"
            autoFocus
            aria-required="true"
            sx={{ mb: 2 }}
          />
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="password"
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            aria-required="true"
            sx={{ mb: 2 }}
          />
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            aria-required="true"
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{ py: 1.5 }}
          >
            Create Account
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
          By creating an account, you agree to keep your restaurant opinions
          honest and your taste buds adventurous.
        </Typography>
      </Box>
    </Container>
  );
}
