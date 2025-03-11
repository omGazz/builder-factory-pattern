**Guida: Creazione e Gestione di Entità in TypeScript con Factory, Builder e Branding**

---

## Introduzione

Quando sviluppiamo un’applicazione in TypeScript, spesso ci troviamo a dover gestire entità che rappresentano dati importanti (ad esempio, utenti, ordini, prodotti). Ci piacerebbe poter “controllare” la creazione di questi oggetti in modo centralizzato, applicare validazioni e assicurarci che nessuno li possa creare “manualmente” al di fuori delle nostre regole di business.

È qui che entra in gioco l’approccio **Factory + Builder + Branding**:

1. **Factory**: un “unico punto d’ingresso” per la creazione delle entità (User, Order, ecc.).
2. **Builder**: fornisce un modo fluente (metodi “chainable”) per impostare campi e validare progressivamente i dati.
3. **Branding**: impedisce di creare un’entità “fake” semplicemente usando `{ name: "Mario", age: 20 }`; costringe l’uso della factory (e quindi della validazione).

---

## Perché è utile e quali problemi risolve

1. **Validazione centralizzata**

   - Con questo approccio, tutte le regole di validazione sono nel builder. Nessun altro può creare l’entità aggirando i controlli.
   - Se domani vuoi aggiungere una nuova regola di validazione (ad esempio, `age` non deve superare 120), lo fai in un solo punto, e sei certo che tutte le entità future rispetteranno la regola.

2. **Creazione controllata**

   - L’entità `UserEntity` (o qualsiasi altra entità) non può essere costruita “a mano” con un semplice oggetto. TypeScript restituirebbe un errore perché mancherebbe un “brand” nascosto.
   - Questo garantisce che ogni `UserEntity` passi per la tua logica di business/validazione.

3. **Chiarezza del codice**

   - Avere un **builder** aiuta a capire immediatamente quali campi puoi impostare e in che modo (`.setName("...").setAge(20)`).
   - I metodi “chainable” rendono più leggibile il flusso: _creo un utente, imposto il nome, imposto l’età, valido, costruisco_.

4. **Manutenzione più facile**
   - Se in futuro cambiano i requisiti (es. un utente deve avere sempre un codice fiscale), lo aggiungi al builder e al factory senza dover cercare in tutto il codice dove venivano creati gli utenti.

---

## Come funziona la tecnica del “Branding”?

Nella pratica, si crea un tipo speciale:

```ts
type Brand<T, B> = T & { __brand: B };
```

Poi lo si usa per definire le proprie entità, ad esempio:

```ts
type UserEntity = Brand<
  {
    readonly name: string;
    readonly age: number;
  },
  "UserEntity"
>;
```

Il campo `__brand` è invisibile a runtime, ma è sufficiente a **TypeScript** per bloccare qualsiasi assegnamento diretto come:

```ts
// ERRORE in TypeScript
const user: UserEntity = { name: "Mario", age: 20 };
```

Perché mancherà sempre la proprietà `__brand` che TypeScript si aspetta. Questo costringe l’uso della factory.

---

## Struttura Generale

### 1. Definizione dell’Entità con Branding

```ts
type Brand<T, B> = T & { __brand: B };

type UserEntity = Brand<
  {
    readonly name: string;
    readonly age: number;
  },
  "UserEntity"
>;
```

- `readonly` rende i campi immutabili dopo la creazione.
- `__brand` impedisce la creazione manuale di un `UserEntity`.

### 2. Definizione del Builder

Il **builder** è un oggetto che ha metodi come `setName`, `setAge`, `isValid`, `validate`, `build`.

- **`setName` / `setAge`**: impostano i campi.
- **`validate`** / **`isValid`**: controllano eventuali errori (nome vuoto, età negativa, ecc.).
- **`build`**: alla fine crea l’oggetto `UserEntity` brandizzato.

```ts
type ValidationResult = {
  valid: boolean;
  errors: string[];
};

type UserBuilder = {
  setName: (name: string) => UserBuilder;
  setAge: (age: number) => UserBuilder;
  isValid: () => boolean;
  validate: () => ValidationResult;
  build: () => UserEntity;
};
```

### 3. Definizione della Factory

La **factory** è il luogo in cui creiamo il builder. Abbiamo anche metodi:

- `fromPrimitive`: crea un builder partendo da un oggetto “plain” (es. `{ name, age }` presi da una API).
- `toPrimitive`: fa l’inverso, trasforma un `UserEntity` in un semplice `{ name, age }`.

```ts
type UserFactory = {
  create: (name: string, age: number) => UserBuilder;
  fromPrimitive: (primitive: { name: string; age: number }) => UserBuilder;
  toPrimitive: (entity: UserEntity) => { name: string; age: number };
};
```

### 4. Implementazione Completa (semplificata)

```ts
const userFactory: UserFactory = {
  create(name, age) {
    let internalUser = { name, age };

    function validateUser(u: typeof internalUser): ValidationResult {
      const errors: string[] = [];
      if (!u.name || u.name.trim() === "") {
        errors.push("Il nome non può essere vuoto.");
      }
      if (u.age < 0) {
        errors.push("L'età non può essere negativa.");
      }
      return {
        valid: errors.length === 0,
        errors,
      };
    }

    const builder: UserBuilder = {
      setName(newName) {
        internalUser.name = newName;
        return builder;
      },
      setAge(newAge) {
        internalUser.age = newAge;
        return builder;
      },
      isValid() {
        return validateUser(internalUser).valid;
      },
      validate() {
        return validateUser(internalUser);
      },
      build() {
        const result = validateUser(internalUser);
        if (!result.valid) {
          throw new Error(`Errori di validazione: ${result.errors.join(", ")}`);
        }
        // "Brandizziamo" l'oggetto
        return {
          name: internalUser.name,
          age: internalUser.age,
        } as UserEntity;
      },
    };

    return builder;
  },

  fromPrimitive(primitive) {
    return this.create(primitive.name, primitive.age);
  },

  toPrimitive(entity) {
    return { name: entity.name, age: entity.age };
  },
};
```

---

## Altri esempi semplificati

### Esempio 1: Creazione di un utente valido

```ts
// Parto con create, poi aggiusto i campi
const user1 = userFactory.create("Mario", 20).setAge(25).build();

console.log("user1 =>", user1);
// Output: { name: "Mario", age: 25 } (brandizzato)
```

### Esempio 2: Tentativo di creare un utente con dati non validi

```ts
try {
  // Creo un utente con nome vuoto -> non valido
  const user2 = userFactory.create("", 30).build();
} catch (error) {
  // Lancia eccezione con la lista di errori
  console.error(
    "Errore durante la creazione di user2:",
    (error as Error).message
  );
}
```

### Esempio 3: Uso di fromPrimitive (ad es. per dati presi da un’API)

```ts
// Ricevo un oggetto da un endpoint di un'API
const dataFromApi = { name: "Luigi", age: 40 };

const builder = userFactory.fromPrimitive(dataFromApi);
if (builder.isValid()) {
  const user3 = builder.build();
  console.log("User3 =>", user3);
} else {
  console.log("Erori di validazione:", builder.validate().errors);
}
```

---

## Conclusioni

1. **Branding**

   - Serve a “marchiare” l’oggetto in modo che non sia “spacciabile” per `UserEntity` senza passare dalla factory.
   - Garantisce che ogni entità creata segua le regole di validazione.

2. **Builder**

   - Offre un approccio fluente per definire i campi, aggiungere controlli e infine creare un oggetto valido.
   - Il metodo `build()` si occupa di validare e lanciare errori in caso di dati non conformi.

3. **Factory**
   - È l’unico punto di entrata per creare un `UserEntity`.
   - Nasconde i dettagli d’implementazione (branding, validazione) e centralizza la logica di costruzione.
   - `fromPrimitive` e `toPrimitive` semplificano la conversione da/a oggetti “plain” (ad es. JSON).

In sostanza, questo pattern permette di **mantenere un controllo forte** su come le entità principali della tua app vengono create e gestite, riducendo la probabilità di errori e semplificando la manutenzione.
