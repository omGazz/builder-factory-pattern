/***************************************************************
 * BRAND DEFINITION:
 * We create a generic utility type `Brand<T, B>` which
 * merges the base type `T` with an extra hidden property
 * `__brand` (of type `B`).
 * This property prevents direct assignments to the branded
 * type outside the factory.
 ***************************************************************/
type Brand<T, B> = T & { __brand: B };

/***************************************************************
 * USER ENTITY:
 * We define a `UserEntity` as a branded object:
 * - Readonly fields: once created, a UserEntity is immutable
 * - The __brand key is only assigned internally in the factory
 *   so no one can create a valid `UserEntity` outside.
 ***************************************************************/
type UserEntity = Brand<
  {
    readonly name: string;
    readonly age: number;
  },
  "UserEntity"
>;

/***************************************************************
 * VALIDATION RESULT:
 * Used to return either success (valid) or a list of errors.
 ***************************************************************/
type ValidationResult = {
  valid: boolean;
  errors: string[];
};

/***************************************************************
 * USER BUILDER:
 * Provides chainable methods to set `name` and `age`.
 * Offers validation methods and a final `build()` to create
 * a valid UserEntity. If the data is invalid, `build()` throws.
 ***************************************************************/
type UserBuilder = {
  setName: (name: string) => UserBuilder;
  setAge: (age: number) => UserBuilder;
  isValid: () => boolean; // Quick check: returns true/false
  validate: () => ValidationResult; // Returns detailed validation errors
  build: () => UserEntity; // Generates the branded UserEntity
};

/***************************************************************
 * USER FACTORY:
 * Exposes methods to create a builder from primitive fields
 * or from an existing "plain" object, plus a method to convert
 * a UserEntity back to a plain object.
 ***************************************************************/
type UserFactory = {
  /**
   * create:
   *   Receives raw name and age, returning a `UserBuilder`.
   *   You can set additional fields using `setName`, `setAge`.
   */
  create: (name: string, age: number) => UserBuilder;

  /**
   * fromPrimitive:
   *   Similar to `create`, but takes a plain object.
   *   Useful to reconstruct an entity from external data.
   */
  fromPrimitive: (primitive: { name: string; age: number }) => UserBuilder;

  /**
   * toPrimitive:
   *   Converts a branded `UserEntity` into a plain object.
   *   Useful if you need to serialize the user data.
   */
  toPrimitive: (entity: UserEntity) => { name: string; age: number };
};

/***************************************************************
 * userFactory IMPLEMENTATION:
 * 1) We keep an internal (unbranded) state object in the builder
 * 2) We provide chainable setters
 * 3) We validate the data before building a final branded entity
 ***************************************************************/
const userFactory: UserFactory = {
  create(name: string, age: number) {
    // Internal state, not yet branded
    let internalUser = { name, age };

    // Basic validation logic for the user data
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

    // The builder object with chainable methods
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
        // Check validation
        const { valid, errors } = validateUser(internalUser);
        if (!valid) {
          throw new Error(
            `Cannot create UserEntity. Errors: ${errors.join(", ")}`
          );
        }
        // Create a branded UserEntity
        const finalUser = {
          name: internalUser.name,
          age: internalUser.age,
          // TS recognizes the brand via the `as` cast:
        } as UserEntity;

        return finalUser;
      },
    };

    return builder;
  },

  fromPrimitive(primitive) {
    return this.create(primitive.name, primitive.age);
  },

  toPrimitive(entity) {
    // Simply return a plain object with name and age
    return { name: entity.name, age: entity.age };
  },
};

/***************************************************************
 * EXAMPLES OF USAGE
 ***************************************************************/

// Example 1: Creating a valid UserEntity
const user1 = userFactory
  .create("John", 20)
  .setAge(30)
  .setName("John Smith")
  .build();

console.log("user1 =>", user1);
// Output: user1 => { name: "John Smith", age: 30 } (with a hidden brand)

// Example 2: Attempting to create a user with invalid data
try {
  const user2 = userFactory.create("Bob", -10).build();
  console.log("user2 =>", user2);
} catch (error) {
  console.error("Error creating user2:", (error as Error).message);
}

// Example 3: Using fromPrimitive
const builder3 = userFactory.fromPrimitive({ name: "Alice", age: 18 });
if (builder3.isValid()) {
  const user3 = builder3.build();
  console.log("user3 =>", user3);
} else {
  console.log("Validation errors in user3 =>", builder3.validate().errors);
}

/***************************************************************
 * TRYING TO CREATE A USER MANUALLY
 * This will fail in TypeScript, because `UserEntity` is branded:
 *
 *   const invalidUser: UserEntity = { name: "Tim", age: 25 };
 *
 * ERROR: Property '__brand' is missing.
 **************************************************************/

/***************************************************************
 * FINAL NOTES & EXPLANATION:
 *
 * 1) BRANDING:
 *    We use a special property `__brand` in the type definition to
 *    ensure that an object typed as `UserEntity` can only be created
 *    via the factory. TypeScript will not allow direct assignments
 *    to `UserEntity` because it lacks the hidden brand property.
 *
 * 2) BUILDER:
 *    The builder pattern allows us to gradually set user fields using
 *    chainable methods (`setName`, `setAge`) and then validate the data.
 *    We only finalize a `UserEntity` by calling `build()` which performs
 *    validation and produces a branded object.
 *
 * 3) FACTORY:
 *    The factory (`userFactory`) acts as the single entry point for
 *    creating or rebuilding user data. It encapsulates validation,
 *    ensures immutability, and prevents direct external creation of
 *    `UserEntity` objects. The factory also provides a `toPrimitive`
 *    method for easy serialization of the branded entity.
 ***************************************************************/
