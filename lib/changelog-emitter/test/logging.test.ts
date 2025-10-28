import { describe, it, expect } from "vitest";
import { Log, TargetType } from "../src/index.js";

describe("Logging utils", () => {
  describe("TargetType enum", () => {
    it("should have correct values for all target types", () => {
      expect(TargetType.Model).toBe("model");
      expect(TargetType.ModelProperty).toBe("field");
      expect(TargetType.Enum).toBe("enum");
      expect(TargetType.EnumMember).toBe("member");
      expect(TargetType.Operation).toBe("operation");
      expect(TargetType.Union).toBe("union");
      expect(TargetType.UnionVariant).toBe("variant");
      expect(TargetType.Scalar).toBe("scalar");
      expect(TargetType.Interface).toBe("interface");
    });
  });

  describe("Log.added", () => {
    it("should generate correct messages each target type", () => {
      expect(Log.added(TargetType.Model, "User")).toBe("Added `User` model");
      expect(Log.added(TargetType.Enum, "Status")).toBe("Added `Status` enum");
      expect(Log.added(TargetType.ModelProperty, "name")).toBe(
        "Added `name` field",
      );
      expect(Log.added(TargetType.EnumMember, "active")).toBe(
        "Added `active` member",
      );
      expect(Log.added(TargetType.Operation, "getUser")).toBe(
        "Added `getUser` operation",
      );
      expect(Log.added(TargetType.Union, "UserOrError")).toBe(
        "Added `UserOrError` union",
      );
      expect(Log.added(TargetType.UnionVariant, "success")).toBe(
        "Added `success` variant",
      );
      expect(Log.added(TargetType.Scalar, "UserId")).toBe(
        "Added `UserId` scalar",
      );
      expect(Log.added(TargetType.Interface, "UserService")).toBe(
        "Added `UserService` interface",
      );
    });
  });

  describe("Log.removed", () => {
    it("should generate correct messages each target type", () => {
      expect(Log.removed(TargetType.Model, "User")).toBe(
        "Removed `User` model",
      );
      expect(Log.removed(TargetType.Enum, "Status")).toBe(
        "Removed `Status` enum",
      );
      expect(Log.removed(TargetType.ModelProperty, "name")).toBe(
        "Removed `name` field",
      );
      expect(Log.removed(TargetType.EnumMember, "active")).toBe(
        "Removed `active` member",
      );
      expect(Log.removed(TargetType.Operation, "getUser")).toBe(
        "Removed `getUser` operation",
      );
      expect(Log.removed(TargetType.Union, "UserOrError")).toBe(
        "Removed `UserOrError` union",
      );
      expect(Log.removed(TargetType.UnionVariant, "success")).toBe(
        "Removed `success` variant",
      );
      expect(Log.removed(TargetType.Scalar, "UserId")).toBe(
        "Removed `UserId` scalar",
      );
      expect(Log.removed(TargetType.Interface, "UserService")).toBe(
        "Removed `UserService` interface",
      );
    });
  });

  describe("Log.madeRequired", () => {
    it("should generate correct messages for model properties", () => {
      expect(Log.madeRequired("email")).toBe("Made `email` field required");
      expect(Log.madeRequired("id")).toBe("Made `id` field required");
      expect(Log.madeRequired("name")).toBe("Made `name` field required");
    });
  });

  describe("Log.madeOptional", () => {
    it("should generate correct messages for model properties", () => {
      expect(Log.madeOptional("nickname")).toBe(
        "Made `nickname` field optional",
      );
      expect(Log.madeOptional("description")).toBe(
        "Made `description` field optional",
      );
      expect(Log.madeOptional("avatar")).toBe("Made `avatar` field optional");
    });
  });

  describe("Log.renamedFrom", () => {
    it("should generate correct messages for all target types", () => {
      expect(Log.renamedFrom(TargetType.Model, "OldUser", "NewUser")).toBe(
        "Renamed model from `OldUser` to `NewUser`",
      );
      expect(Log.renamedFrom(TargetType.Enum, "OldStatus", "NewStatus")).toBe(
        "Renamed enum from `OldStatus` to `NewStatus`",
      );
      expect(
        Log.renamedFrom(TargetType.ModelProperty, "oldName", "newName"),
      ).toBe("Renamed field from `oldName` to `newName`");
      expect(
        Log.renamedFrom(TargetType.EnumMember, "oldActive", "newActive"),
      ).toBe("Renamed member from `oldActive` to `newActive`");
      expect(
        Log.renamedFrom(TargetType.Operation, "oldGetUser", "newGetUser"),
      ).toBe("Renamed operation from `oldGetUser` to `newGetUser`");
      expect(Log.renamedFrom(TargetType.Union, "OldUnion", "NewUnion")).toBe(
        "Renamed union from `OldUnion` to `NewUnion`",
      );
      expect(
        Log.renamedFrom(TargetType.UnionVariant, "oldVariant", "newVariant"),
      ).toBe("Renamed variant from `oldVariant` to `newVariant`");
      expect(Log.renamedFrom(TargetType.Scalar, "OldScalar", "NewScalar")).toBe(
        "Renamed scalar from `OldScalar` to `NewScalar`",
      );
      expect(
        Log.renamedFrom(TargetType.Interface, "OldInterface", "NewInterface"),
      ).toBe("Renamed interface from `OldInterface` to `NewInterface`");
    });
  });

  describe("Log.typeChangedFrom", () => {
    it("should generate correct messages for model property type changes", () => {
      expect(Log.typeChangedFrom("age", "string", "int32")).toBe(
        "Changed `age` field type from `string` to `int32`",
      );
      expect(Log.typeChangedFrom("id", "int32", "string")).toBe(
        "Changed `id` field type from `int32` to `string`",
      );
      expect(Log.typeChangedFrom("email", "string", "EmailAddress")).toBe(
        "Changed `email` field type from `string` to `EmailAddress`",
      );
    });
  });

  describe("Log.returnTypeChangedFrom", () => {
    it("should generate correct messages for operation return type changes", () => {
      expect(Log.returnTypeChangedFrom("getUser", "User", "UserResponse")).toBe(
        "Changed `getUser` return type from `User` to `UserResponse`",
      );
      expect(Log.returnTypeChangedFrom("createUser", "void", "User")).toBe(
        "Changed `createUser` return type from `void` to `User`",
      );
      expect(Log.returnTypeChangedFrom("deleteUser", "boolean", "void")).toBe(
        "Changed `deleteUser` return type from `boolean` to `void`",
      );
    });
  });

  describe("Edge cases and special characters", () => {
    it("should handle names with special characters", () => {
      expect(Log.added(TargetType.ModelProperty, "user-name")).toBe(
        "Added `user-name` field",
      );
      expect(Log.added(TargetType.ModelProperty, "user_name")).toBe(
        "Added `user_name` field",
      );
      expect(Log.added(TargetType.ModelProperty, "user.name")).toBe(
        "Added `user.name` field",
      );
    });

    it("should handle empty strings", () => {
      expect(Log.added(TargetType.ModelProperty, "")).toBe("Added `` field");
      expect(Log.removed(TargetType.ModelProperty, "")).toBe(
        "Removed `` field",
      );
    });

    it("should handle very long names", () => {
      const longName = "a".repeat(100);
      expect(Log.added(TargetType.ModelProperty, longName)).toBe(
        `Added \`${longName}\` field`,
      );
    });
  });
});
