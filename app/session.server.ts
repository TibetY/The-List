import { createCookieSessionStorage } from "@remix-run/node";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    secure: process.env.NODE_ENV === "production",
    secrets: ["super-secret-value"], // Replace with your own secret
    sameSite: "lax",
    path: "/",
    maxAge: 3600, // 3600 seconds = 1 hour
    httpOnly: true,
  },
});

export const getSession = (cookieHeader: string | null) =>
  sessionStorage.getSession(cookieHeader);

export const commitSession = (session: any) =>
  sessionStorage.commitSession(session);

export const destroySession = (session: any) =>
  sessionStorage.destroySession(session);
