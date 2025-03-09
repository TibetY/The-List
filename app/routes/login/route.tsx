import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
} from "@mui/material";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { Form, useActionData, redirect } from "@remix-run/react";
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
    console.log("Logged in user:", userCredential.user);
    const token = await userCredential.user.getIdToken();

    const session = await getSession(request.headers.get("Cookie"));
    session.set("token", token);

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
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Box
        sx={{
          width: "400px",
          backgroundColor: "#2D3748", // Soft teal
          p: 4,
          borderRadius: 2,
          color: "white", // White text stands out on teal
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
          Welcome Back!
        </Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>
          Don’t have an account?{" "}
          <Link href="/signup" sx={{ color: "white" }}>
            Create a new one now
          </Link>
        </Typography>
        {actionData?.error && (
          <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
            {actionData.error}
          </Alert>
        )}
        <Form method="post">
          <TextField
            variant="filled"
            margin="normal"
            required
            fullWidth
            id="email"
            name="email"
            placeholder="Email Address"
            autoComplete="email"
            sx={{
              mb: 2,
              "& .MuiFilledInput-root": {
                backgroundColor: "rgba(255,255,255,0.1)",
                color: "white",
              },
              "& .MuiInputLabel-root": { color: "white" },
            }}
          />
          <TextField
            variant="filled"
            margin="normal"
            required
            fullWidth
            name="password"
            id="password"
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            sx={{
              mb: 2,
              "& .MuiFilledInput-root": {
                backgroundColor: "rgba(255,255,255,0.1)",
                color: "white",
              },
              "& .MuiInputLabel-root": { color: "white" },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              backgroundColor: "white",
              color: "#2D3748",
              fontWeight: "bold",
            }}
          >
            Login
          </Button>
          <Typography
            variant="body1"
            sx={{ textAlign: "center", mb: 2, mt: 2 }}
          >
            or
          </Typography>
          <Button
            variant="outlined"
            fullWidth
            size="large"
            startIcon={<GoogleIcon />}
            // onClick={handleGoogleSignIn}
            sx={{
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Login with Google
          </Button>
        </Form>
      </Box>
    </Container>
  );
}
