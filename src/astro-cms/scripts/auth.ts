import {
  createAuth0Client,
  type Auth0Client,
  type User,
} from "@auth0/auth0-spa-js";


let auth0Client: Auth0Client | null = null;

const auth0Domain = import.meta.env.PUBLIC_AUTH0_DOMAIN;
const auth0ClientId = import.meta.env.PUBLIC_AUTH0_CLIENT_ID;
const redirectUri = import.meta.env.PUBLIC_AUTH0_CALLBACK_URL;
const logoutUri = import.meta.env.PUBLIC_AUTH0_LOGOUT_URL;
 

async function getClient(): Promise<Auth0Client> {
  if (auth0Client) {
    return auth0Client;
  }

  console.log("Initializing Auth0 client with redirect_uri:", redirectUri);

  try {
    auth0Client = await createAuth0Client({
      domain: auth0Domain,
      clientId: auth0ClientId,
      cacheLocation: "localstorage",
      authorizationParams: {
        redirect_uri: redirectUri,
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
    await client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: redirectUri,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);
  }
}

export async function logout() {
  try {
    const client = await getClient();
    await client.logout({
      logoutParams: {
        returnTo: logoutUri,
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
