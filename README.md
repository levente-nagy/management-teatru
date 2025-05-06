# Management Teatru

Aplicație web pentru managementul activităților unui teatru, dezvoltată cu React, TypeScript, Vite, Ant Design și Firebase.

## Prezentare generală

Aplicația permite gestionarea artiștilor (angajați și colaboratori), programarea spectacolelor, managementul biletelor și urmărirea costurilor. Aceasta oferă diferite funcționalități bazate pe rolul utilizatorului (Administrator, Resurse umane, Casier, Coordonator, Artist).

## Tehnologii utilizate

*   **Frontend:** React, TypeScript, Vite
*   **UI Library:** Ant Design
*   **Backend & Autentificare:** Firebase (Firestore, Firebase Auth)
*   **Routing:** React Router DOM
*   **Linting:** ESLint, TypeScript ESLint
*   **Build Tool:** Vite

## Funcționalități principale

*   **Autentificare utilizatori:** Sistem de login și înregistrare cu roluri distincte.
*   **Management Artiști:** Adăugare, editare, ștergere și vizualizare artiști (angajați și colaboratori), inclusiv detalii contractuale și salariale (pentru rolurile cu permisiuni).
*   **Management Spectacole:** Programare, editare, ștergere spectacole, asignare distribuție (actori angajați și colaboratori), vizualizare detalii spectacol.
*   **Management Bilete:** Definire categorii de bilete per spectacol, prețuri, număr total de bilete. Actualizare număr bilete vândute.
*   **Management Costuri:** Vizualizare costuri salariale pentru angajați și costuri de colaborare per spectacol.
*   **Profil Utilizator:** Artiștii își pot vizualiza datele personale și istoricul colaborărilor.
*   **Export Date:** Posibilitatea de a exporta listele de artiști, spectacole și bilete în format Excel.
*   **Interfață Responsive:** Adaptabilă la diferite dimensiuni de ecran.
*   **Deconectare automată:** Utilizatorii sunt deconectați automat după o perioadă de inactivitate.

## Cerințe preliminare

*   Node.js (versiunea 18.x sau mai recentă recomandată)
*   npm (sau yarn)

## Configurare și Instalare

1.  **Clonați repository-ul:**
    ```bash
    git clone https://github.com/levente-nagy/management-teatru.git
    cd management-teatru
    ```

2.  **Instalați dependențele:**
    ```bash
    npm install
    ```

3.  **Configurare Firebase:**
    *   Creați un proiect Firebase la [https://console.firebase.google.com/](https://console.firebase.google.com/).
    *   Activați Firestore Database și Authentication (Email/Password).
    *   Obțineți configurația Firebase a proiectului dumneavoastră (API Key, Auth Domain, etc.).
    *   Actualizați fișierul `src/Firebase.tsx` cu datele de configurare Firebase:
        ```typescript
        // filepath: src/Firebase.tsx
        // ...existing code...
        const firebaseConfig = {
          apiKey: "YOUR_API_KEY",
          authDomain: "YOUR_AUTH_DOMAIN",
          projectId: "YOUR_PROJECT_ID",
          storageBucket: "YOUR_STORAGE_BUCKET",
          messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
          appId: "YOUR_APP_ID",
          measurementId: "YOUR_MEASUREMENT_ID" // opțional
        };
        // ...existing code...
        ```
    *   **Indexuri Firestore:** Pentru funcționalitățile de filtrare și sortare (de ex. căutarea artiștilor după data contractului, spectacolelor după dată), este posibil să fie necesar să creați manual indexuri compozite în consola Firestore. Aplicația va afișa erori în consola browser-ului cu link-uri directe pentru crearea indexurilor necesare dacă acestea lipsesc.

## Rularea aplicației

*   **Mod Dezvoltare:**
    Rulează aplicația în modul de dezvoltare.
    ```bash
    npm run dev
    ```
    Deschideți [http://localhost:5173](http://localhost:5173) (sau portul afișat în terminal) pentru a o vizualiza în browser. Pagina se va reîncărca automat la modificări.

*   **Build pentru Producție:**
    Compilează și optimizează aplicația pentru producție în directorul `dist`.
    ```bash
    npm run build
    ```

*   **Previzualizare Build:**
    Rulează local build-ul de producție.
    ```bash
    npm run preview
    ```

## Linting

Verifică și corectează problemele de stil și calitate a codului.
```bash
npm run lint
```

## Structura Proiectului

```
.
├── public/             # Fișiere statice
├── src/
│   ├── components/     # Componente React reutilizabile (Artisti, Bilete, etc.)
│   ├── App.css         # Stiluri globale pentru App
│   ├── App.tsx         # Componenta principală App (rute)
│   ├── Firebase.tsx    # Configurare și inițializare Firebase
│   ├── Home.tsx        # Componenta principală a layout-ului autentificat
│   ├── index.css       # Stiluri CSS globale
│   ├── main.tsx        # Punctul de intrare al aplicației
│   └── vite-env.d.ts   # Tipuri specifice Vite
├── .gitignore
├── eslint.config.js    # Configurare ESLint
├── index.html          # Fișierul HTML principal
├── package.json        # Dependențe și scripturi NPM
├── README.md           # Acest fișier
├── tsconfig.app.json   # Configurare TypeScript pentru aplicație
├── tsconfig.json       # Configurare TypeScript principală
├── tsconfig.node.json  # Configurare TypeScript pentru mediul Node (ex: vite.config.ts)
├── vercel.json         # Configurare pentru Vercel (rewrites)
└── vite.config.ts      # Configurare Vite
```

## Deployment

Proiectul include un fișier `vercel.json` pentru configurarea deployment-ului pe [Vercel](https://vercel.com/), gestionând rescrierile pentru rutarea single-page application.