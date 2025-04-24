import {
  createAuth0Client,
  type Auth0Client,
  type User,
} from "@auth0/auth0-spa-js";
import { base } from "astro:config/client";

let auth0Client: Auth0Client | null = null;

const auth0Domain = "https://dev-xt5nci8m2zxscg23.eu.auth0.com";
const auth0ClientId = "aum2VaJ1GHfp8CUJhnCMqLvdojKt66CU";

const getRedirectUri = () => {
  let origin: string;
  if (import.meta.env.PROD) {
    // Produktion: GitHub Pages Domain
    origin = "https://knuspermixx.github.io";
  } else {
    // Entwicklung: Lokale Domain
    origin = "http://localhost:4321";
  }
  const cleanBase = base.startsWith("/") ? base.substring(1) : base;
  const formattedBase =
    cleanBase && !cleanBase.endsWith("/") ? `${cleanBase}/` : cleanBase;
  return `${origin}/${formattedBase}`;
};

async function getClient(): Promise<Auth0Client> {
  if (auth0Client) {
    return auth0Client;
  }

  console.log("Initializing Auth0 client with redirect_uri:", getRedirectUri());

  try {
    auth0Client = await createAuth0Client({
      domain: auth0Domain,
      clientId: auth0ClientId,
      cacheLocation: "localstorage",
      authorizationParams: {
        redirect_uri: getRedirectUri(),
        scope: "repo",
      },
      useRefreshTokens: true,
    });
    console.log("Auth0 client initialized successfully.");
    return auth0Client;
  } catch (error) {
    console.error("Error initializing Auth0 client:", error);
    throw error;
  }
}

export async function login() {
  try {
    const client = await getClient();
    await client.loginWithRedirect();
  } catch (error) {
    console.error("Login failed:", error);
  }
}

export async function logout() {
  try {
    const client = await getClient();
    await client.logout({
      logoutParams: {
        returnTo: getRedirectUri(),
      },
    });
  } catch (error) {
    console.error("Logout failed:", error);
  }
}

export async function handleRedirectCallback(): Promise<boolean> {
  const client = await getClient();
  const params = new URLSearchParams(window.location.search);
  const hasCode = params.has("code");
  const hasState = params.has("state");

  if (hasCode && hasState) {
    console.log("Handling redirect callback...");
    try {
      await client.handleRedirectCallback();
      console.log("Redirect callback handled.");
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    } catch (error) {
      console.error("Error handling redirect callback:", error);
      window.history.replaceState({}, document.title, window.location.pathname);
      return false;
    }
  }
  return false;
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const client = await getClient();
    return await client.isAuthenticated();
  } catch (error) {
    console.error("Error checking authentication status:", error);
    return false;
  }
}

export async function getUser(): Promise<User | undefined> {
  try {
    const client = await getClient();
    return await client.getUser();
  } catch (error) {
    console.error("Error getting user profile:", error);
    return undefined;
  }
}

export async function getToken(): Promise<string | undefined> {
  try {
    const client = await getClient();
    return await client.getTokenSilently();
  } catch (error) {
    console.error("Error getting token silently:", error);

    return undefined;
  }
}

export async function initAuth(): Promise<{
  authenticated: boolean;
  user?: User;
}> {
  console.log("Starting Auth initialization...");
  await getClient();
  const handled = await handleRedirectCallback();
  if (handled) {
    console.log("Redirect handled, checking final auth state.");
  }
  const authenticated = await isAuthenticated();
  let user: User | undefined = undefined;
  if (authenticated) {
    user = await getUser();
  }
  console.log(
    "Auth initialization complete. Authenticated:",
    authenticated,
    "User:",
    user?.name
  );
  return { authenticated, user };
}
