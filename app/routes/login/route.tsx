import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Alert,
} from "@mui/material";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { Form, useActionData, redirect, Link } from "@remix-run/react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "~/firebase";
import { getSession, commitSession } from "~/session.server";
import GoogleIcon from "@mui/icons-material/Google";

type ActionData = {
  error?: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const token = session.get("token");
  if (token) {
    return redirect("/dashboard");
  }
  return {};
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const token = await userCredential.user.getIdToken();

    const session = await getSession(request.headers.get("Cookie"));
    session.set("token", token);
    session.set("userId", userCredential.user.uid);

    return redirect("/dashboard", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Login error:", err.message);
      return { error: err.message } as ActionData;
    } else {
      console.error("Login error:", err);
      return { error: "An unknown error occurred" } as ActionData;
    }
  }
};

export default function LoginPage() {
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
          Welcome back
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
          Don&apos;t have an account?{" "}
          <Box
            component={Link}
            to="/signup"
            sx={{
              color: "primary.main",
              textDecoration: "none",
              fontWeight: 600,
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Create one free
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
            autoComplete="current-password"
            aria-required="true"
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{ mb: 2, py: 1.5 }}
          >
            Sign In
          </Button>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              mb: 2,
            }}
          >
            <Box
              sx={{
                flex: 1,
                height: "1px",
                background: "rgba(255,255,255,0.1)",
              }}
              aria-hidden="true"
            />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              or
            </Typography>
            <Box
              sx={{
                flex: 1,
                height: "1px",
                background: "rgba(255,255,255,0.1)",
              }}
              aria-hidden="true"
            />
          </Box>

          <Button
            variant="outlined"
            fullWidth
            size="large"
            startIcon={<GoogleIcon />}
            disabled
            sx={{
              py: 1.5,
              color: "text.secondary",
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            Continue with Google
          </Button>
        </Form>
      </Box>
    </Container>
  );
}
