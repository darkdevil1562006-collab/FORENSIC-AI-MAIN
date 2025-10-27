
/**
 * Defines the structure of the backend configuration.
 */
interface BackendConfig {
  /**
   * Defines the core data models or entities used in the application.
   * These are general definitions, often used as the basis for Firestore documents or other data structures.
   */
  entities: {
    [entityName: string]: EntityDefinition;
  };
  /**
   * Describes the Firebase Authentication setup.
   */
  auth: AuthConfig;
  /**
   * Describes the structure of the Firestore database.
   * Note: This section might not always be present in the provided JSON.
   */
  firestore?: FirestoreConfig;
}

/**
 * Defines a single entity using JSON Schema (draft-07).
 */
interface EntityDefinition {
  /** The name of the entity. */
  title: string;
  /** Explains the purpose of the entity. */
  description: string;
  /** The type of the entity, usually "object". */
  type: "object";
  /** Defines the fields of the entity. */
  properties: {
    [propertyName: string]: PropertyDefinition;
  };
  /** Lists the mandatory properties for this entity. */
  required?: string[];
}

/**
 * Defines a single property of an entity.
 */
interface PropertyDefinition {
  /** The type of the property (e.g., "string", "number", "boolean"). */
  type: string;
  /** The format of the property (e.g., "date", "time", "email"). */
  format?: string;
  /** Explains the purpose of the property. */
  description?: string;
  /** An array of possible values for the property. */
  enum?: any[];
  /** A reference to another entity. */
  $ref?: string;
}

/**
 * Describes the Firebase Authentication setup.
 */
interface AuthConfig {
  /** A list of enabled Firebase Authentication providers. */
  providers: string[];
}

/**
 * Defines a single custom claim.
 */
interface ClaimDefinition {
  /** The type of the claim. */
  type?: string;
  /** An enum of possible values for the claim. */
  enum?: string[];
}

/**
 * Describes the structure of the Firestore database.
 */
interface FirestoreConfig {
  /**
   * An object where keys represent Firestore collection paths.
   * Paths can include variables representing document IDs (e.g., `/races/{raceId}/registrations/{registrationId}`).
   */
  [collectionPath: string]: PathDefinition;
}

/**
 * Defines the data stored at a Firestore path.
 */
interface PathDefinition {
  /** A reference to an entity defined in `backend.entities`. */
  schema: string | { $ref: string };
  /** Explains the purpose of this collection/path. */
  description: string;
}
