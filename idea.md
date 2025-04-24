Dieses CMS lässt sich nahtlos in bestehende Astro-Projekte integrieren und nutzt ausschließlich Astro-eigene Tools, um vollständig im Ökosystem integriert zu sein. Es funktioniert komplett im SSG-Modus (Static Site Generation) von Astro und benötigt kein separates Admin-Panel. Stattdessen erfolgt die Bearbeitung des Contents direkt auf der live Website. Das CMS ist entwicklerfreundlich, einfach aufgebaut, Open Source und erfordert keinerlei Server. Das Astro-Projekt wird einfach über GitHub Pages ausgeliefert.

## Technische Umsetzung

### Authentifizierung

Die Anwendung nutzt den Auth0 GitHub Flow. Dabei verwendet die Website clientseitig das Auth0 SPA SDK zur Verifizierung. Es kann die kostenlose Version von Auth0 genutzt werden, da diese über 7.000 Aufrufe pro Monat kostenfrei ermöglicht. Somit entfällt das Hosten eines eigenen Authentifizierungsdienstes.

### Astro-Integration

Das CMS unterstützt alle gängigen Astro-Content-Dateiformate. Falls eine astro content/config.ts vorhanden ist, arbeitet es mit dieser, um zu erkennen, wie die Daten validiert werden sollen. Dadurch kann das CMS genau bestimmen, welche Daten benötigt werden, und den Content direkt clientseitig validieren. Es nutzt die neuen loader()- und glob()-Funktionen von Astro (siehe [Astro-Dokumentation](https://docs.astro.build/en/guides/content-collections)).

### Entwicklung mit dem CMS

Der Entwickler hat beispielsweise eine einfache Landingpage mit index.astro (enthält Hero, AboutUs, Blog-Vorschau, Kontakt) und blog/[slug].astro (Blog-Eintrag). Die Blog-Einträge sind als Markdown-Dateien in content/blog/nudeln-mit-sahne.md gespeichert, und es gibt einen Ordner content/blog/_images mit zugehörigen Bildern. Zusätzlich gibt es globale Einträge wie den Hero-Titel oder Testimonials, die in JSON-Dateien hinterlegt sind.

Um mit dem CMS zu arbeiten, nutzt der Entwickler vom CMS bereitgestellte Astro-Komponenten, um alle editierbaren HTML-Elemente zu umschließen. Der Content wird dabei immer angezeigt, während die Bearbeitungslogik nur bei Bedarf (im Edit-Modus) geladen wird.

### Bei einfachen Daten

```tsx
import { getEntry } from 'astro:content';
const poodleData = await getEntry('dogs', 'poodle');

<div id="cms-entry">
<h1>{[poodleData.name](http://poodledata.name/)}</h1>
<img src={poodleData.image} alt="Poodle" />
</div>

{isAuthenticated() && isEditMode() && (
<script src="/path/to/edit-script.js" type="module" client:load></script>
)}
```

- Der Content (z. B. <h1> und <img>) wird immer angezeigt, unabhängig vom Login-Status.

---

- Das Bearbeitungs-JavaScript (edit-script.js) wird nur geladen, wenn der Nutzer angemeldet ist und sich im Edit-Modus befindet. Dadurch bleibt die Performance für normale Besucher optimiert.

### Bei Collections

```tsx
---
import { getCollection } from 'astro:content';
const posts = await getCollection('blog');
---

<h1>My posts</h1>
<div id="cms-collection">
  <ul>
    {posts.map(post => (
      <li><a href={`/blog/${post.id}`}>{post.data.title}</a></li>
    ))}
  </ul>
</div>

{isAuthenticated() && isEditMode() && (
  <script src="/path/to/collection-edit-script.js" type="module" client:load></script>
)}
```

- Ähnlich wie bei einfachen Daten wird der Content immer angezeigt, und die Bearbeitungslogik nur bei Bedarf geladen.

### Edit-Modus

Um in den Admin-Modus zu gelangen, gibt der Nutzer die /login-Route an und wird zur Auth0-Login-Maske weitergeleitet, falls er nicht angemeldet ist. Nach dem Login wird er zur Startseite der Astro-Anwendung zurückgeleitet. Angemeldete Nutzer sehen einen Button, um zwischen dem Edit-Modus und der Live-Ansicht zu wechseln. Im Edit-Modus erscheint eine Toolbar mit Funktionen wie "Letzte Änderung rückgängig machen", "Letzte Änderungen wiederholen" und "Publishen".

Die Änderungen am Content werden zunächst nur clientseitig gespeichert, sodass der Nutzer seine Edits direkt auf der Website sieht, ohne die Daten direkt zu ändern. Beim Klicken auf "Publishen" wird für jede geänderte Content-Datei ein Git-Commit erstellt und alles in den Main-Branch gepusht. Dadurch wird automatisch eine GitHub Action ausgelöst, die die GitHub Pages-Seite neu baut.

## Code Des CMS:

Minimaltisch und so verständlich wie möglich, aber voll Funktional mit Typescript und eine ordentliche file folder strukut. Mache nichts unnötig kompliziert. 

Hier schonmal meine voll funktionfähige auth.ts: 

```
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

```