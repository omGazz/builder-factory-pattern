**Guide: Creating and Managing Entities in TypeScript with Factory, Builder, and Branding**

---

## Introduction

When developing a TypeScript application, we often deal with entities representing important data (e.g., users, orders, products). We want to “control” the creation of these objects in a centralized way, apply validations, and ensure that no one can create them “manually” outside our business rules.

This is where the **Factory + Builder + Branding** approach comes into play:

1. **Factory**: a “single entry point” for creating entities (User, Order, etc.).
2. **Builder**: provides a fluent way (chainable methods) to set fields and progressively validate data.
3. **Branding**: prevents creating a “fake” entity simply by using `{ name: "Mario", age: 20 }`; it forces the use of the factory (and thus validation).

---

## Why It’s Useful and Which Problems It Solves

1. **Centralized Validation**

   - With this approach, all validation rules live in the builder. Nobody else can create an entity bypassing those checks.
   - If, for example, you decide tomorrow that `age` must not exceed 120, you add that rule in one place, and you’re certain that all future entities will respect it.

2. **Controlled Creation**

   - The `UserEntity` (or any other entity) cannot be constructed “by hand” with a simple object. TypeScript would throw an error because a hidden “brand” is missing.
   - This guarantees that every `UserEntity` goes through your business/validation logic.

3. **Code Clarity**

   - Having a **builder** helps you immediately understand which fields you can set and how (`.setName("...").setAge(20)`).
   - Chainable methods make the flow more readable: _create a user, set the name, set the age, validate, build_.

4. **Easier Maintenance**
   - If in the future the requirements change (e.g., a user must always have a fiscal code), you add it to the builder and factory without having to search through the entire codebase for every user creation point.

---

## How the “Branding” Technique Works

In practice, you create a special type:

```ts
type Brand<T, B> = T & { __brand: B };
```

Then you use it to define your entities, for example:

```ts
type UserEntity = Brand<
  {
    readonly name: string;
    readonly age: number;
  },
  "UserEntity"
>;
```

The `__brand` field is invisible at runtime, but it’s enough for **TypeScript** to prevent any direct assignment like:

```ts
// ERROR in TypeScript
const user: UserEntity = { name: "Mario", age: 20 };
```

because it will always lack the `__brand` property that TypeScript expects. This forces the use of the factory.

---

## General Structure

### 1. Defining the Entity with Branding

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

- `readonly` makes the fields immutable after creation.
- `__brand` prevents manually constructing a `UserEntity`.

### 2. Defining the Builder

A **builder** is an object with methods like `setName`, `setAge`, `isValid`, `validate`, `build`.

- **`setName` / `setAge`**: set specific fields.
- **`validate`** / **`isValid`**: check for errors (empty name, negative age, etc.).
- **`build`**: finally creates the branded `UserEntity` object.

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

### 3. Defining the Factory

A **factory** is where we create the builder. It also provides:

- `fromPrimitive`: creates a builder starting from a “plain” object (e.g., `{ name, age }` received from an API).
- `toPrimitive`: does the opposite, converting a `UserEntity` back into a plain `{ name, age }` object.

```ts
type UserFactory = {
  create: (name: string, age: number) => UserBuilder;
  fromPrimitive: (primitive: { name: string; age: number }) => UserBuilder;
  toPrimitive: (entity: UserEntity) => { name: string; age: number };
};
```

### 4. Complete (Simplified) Implementation

```ts
const userFactory: UserFactory = {
  create(name, age) {
    let internalUser = { name, age };

    function validateUser(u: typeof internalUser): ValidationResult {
      const errors: string[] = [];
      if (!u.name || u.name.trim() === "") {
        errors.push("Name cannot be empty.");
      }
      if (u.age < 0) {
        errors.push("Age cannot be negative.");
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
          throw new Error(`Validation errors: ${result.errors.join(", ")}`);
        }
        // "Branding" the object
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

## Additional Simplified Examples

### Example 1: Creating a Valid User

```ts
// Starting with create, then adjusting fields
const user1 = userFactory.create("Mario", 20).setAge(25).build();

console.log("user1 =>", user1);
// Output: { name: "Mario", age: 25 } (branded)
```

### Example 2: Attempt to Create a User with Invalid Data

```ts
try {
  // Creating a user with an empty name -> invalid
  const user2 = userFactory.create("", 30).build();
} catch (error) {
  // Throws an exception with a list of errors
  console.error("Error creating user2:", (error as Error).message);
}
```

### Example 3: Using fromPrimitive (e.g., with data from an API)

```ts
// Receiving an object from an API endpoint
const dataFromApi = { name: "Luigi", age: 40 };

const builder = userFactory.fromPrimitive(dataFromApi);
if (builder.isValid()) {
  const user3 = builder.build();
  console.log("User3 =>", user3);
} else {
  console.log("Validation errors:", builder.validate().errors);
}
```

---

## Conclusions

1. **Branding**

   - Used to “mark” the object so that it cannot be “passed off” as a `UserEntity` without going through the factory.
   - Ensures that every created entity follows validation rules.

2. **Builder**

   - Provides a fluent approach to define fields, add checks, and finally create a valid object.
   - The `build()` method handles validation and throws errors for non-compliant data.

3. **Factory**
   - The single entry point for creating a `UserEntity`.
   - Hides implementation details (branding, validation) and centralizes construction logic.
   - `fromPrimitive` and `toPrimitive` simplify conversion from/to plain objects (e.g., JSON).

In short, this pattern helps you **keep a strong grip** on how your application’s main entities are created and managed, reducing the chance of errors and making maintenance easier.
