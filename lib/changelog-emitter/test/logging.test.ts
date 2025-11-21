import { describe, it, expect } from "vitest";
import { Log, TargetType, Action } from "../src/index.js";

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
      expect(Log.added(TargetType.Model, "User")).toEqual({
        message: "Added `User` model",
        action: Action.Added,
        targetKind: TargetType.Model,
        currTargetName: "User",
      });
      expect(Log.added(TargetType.Enum, "Status")).toEqual({
        message: "Added `Status` enum",
        action: Action.Added,
        targetKind: TargetType.Enum,
        currTargetName: "Status",
      });
      expect(Log.added(TargetType.ModelProperty, "name")).toEqual({
        message: "Added `name` field",
        action: Action.Added,
        targetKind: TargetType.ModelProperty,
        currTargetName: "name",
      });
      expect(Log.added(TargetType.EnumMember, "active")).toEqual({
        message: "Added `active` member",
        action: Action.Added,
        targetKind: TargetType.EnumMember,
        currTargetName: "active",
      });
      expect(Log.added(TargetType.Operation, "getUser")).toEqual({
        message: "Added `getUser` operation",
        action: Action.Added,
        targetKind: TargetType.Operation,
        currTargetName: "getUser",
      });
      expect(Log.added(TargetType.Union, "UserOrError")).toEqual({
        message: "Added `UserOrError` union",
        action: Action.Added,
        targetKind: TargetType.Union,
        currTargetName: "UserOrError",
      });
      expect(Log.added(TargetType.UnionVariant, "success")).toEqual({
        message: "Added `success` variant",
        action: Action.Added,
        targetKind: TargetType.UnionVariant,
        currTargetName: "success",
      });
      expect(Log.added(TargetType.Scalar, "UserId")).toEqual({
        message: "Added `UserId` scalar",
        action: Action.Added,
        targetKind: TargetType.Scalar,
        currTargetName: "UserId",
      });
      expect(Log.added(TargetType.Interface, "UserService")).toEqual({
        message: "Added `UserService` interface",
        action: Action.Added,
        targetKind: TargetType.Interface,
        currTargetName: "UserService",
      });
    });
  });

  describe("Log.removed", () => {
    it("should generate correct messages each target type", () => {
      expect(Log.removed(TargetType.Model, "User")).toEqual({
        message: "Removed `User` model",
        action: Action.Removed,
        targetKind: TargetType.Model,
        currTargetName: "User",
      });
      expect(Log.removed(TargetType.Enum, "Status")).toEqual({
        message: "Removed `Status` enum",
        action: Action.Removed,
        targetKind: TargetType.Enum,
        currTargetName: "Status",
      });
      expect(Log.removed(TargetType.ModelProperty, "name")).toEqual({
        message: "Removed `name` field",
        action: Action.Removed,
        targetKind: TargetType.ModelProperty,
        currTargetName: "name",
      });
      expect(Log.removed(TargetType.EnumMember, "active")).toEqual({
        message: "Removed `active` member",
        action: Action.Removed,
        targetKind: TargetType.EnumMember,
        currTargetName: "active",
      });
      expect(Log.removed(TargetType.Operation, "getUser")).toEqual({
        message: "Removed `getUser` operation",
        action: Action.Removed,
        targetKind: TargetType.Operation,
        currTargetName: "getUser",
      });
      expect(Log.removed(TargetType.Union, "UserOrError")).toEqual({
        message: "Removed `UserOrError` union",
        action: Action.Removed,
        targetKind: TargetType.Union,
        currTargetName: "UserOrError",
      });
      expect(Log.removed(TargetType.UnionVariant, "success")).toEqual({
        message: "Removed `success` variant",
        action: Action.Removed,
        targetKind: TargetType.UnionVariant,
        currTargetName: "success",
      });
      expect(Log.removed(TargetType.Scalar, "UserId")).toEqual({
        message: "Removed `UserId` scalar",
        action: Action.Removed,
        targetKind: TargetType.Scalar,
        currTargetName: "UserId",
      });
      expect(Log.removed(TargetType.Interface, "UserService")).toEqual({
        message: "Removed `UserService` interface",
        action: Action.Removed,
        targetKind: TargetType.Interface,
        currTargetName: "UserService",
      });
    });
  });

  describe("Log.madeRequired", () => {
    it("should generate correct messages for model properties", () => {
      expect(Log.madeRequired("email")).toEqual({
        message: "Made `email` field required",
        action: Action.MadeRequired,
        targetKind: TargetType.ModelProperty,
        currTargetName: "email",
      });
      expect(Log.madeRequired("id")).toEqual({
        message: "Made `id` field required",
        action: Action.MadeRequired,
        targetKind: TargetType.ModelProperty,
        currTargetName: "id",
      });
      expect(Log.madeRequired("name")).toEqual({
        message: "Made `name` field required",
        action: Action.MadeRequired,
        targetKind: TargetType.ModelProperty,
        currTargetName: "name",
      });
    });
  });

  describe("Log.madeOptional", () => {
    it("should generate correct messages for model properties", () => {
      expect(Log.madeOptional("nickname")).toEqual({
        message: "Made `nickname` field optional",
        action: Action.MadeOptional,
        targetKind: TargetType.ModelProperty,
        currTargetName: "nickname",
      });
      expect(Log.madeOptional("description")).toEqual({
        message: "Made `description` field optional",
        action: Action.MadeOptional,
        targetKind: TargetType.ModelProperty,
        currTargetName: "description",
      });
      expect(Log.madeOptional("avatar")).toEqual({
        message: "Made `avatar` field optional",
        action: Action.MadeOptional,
        targetKind: TargetType.ModelProperty,
        currTargetName: "avatar",
      });
    });
  });

  describe("Log.renamedFrom", () => {
    it("should generate correct messages for all target types", () => {
      expect(Log.renamedFrom(TargetType.Model, "OldUser", "NewUser")).toEqual({
        message: "Renamed model from `OldUser` to `NewUser`",
        action: Action.Renamed,
        targetKind: TargetType.Model,
        prevTargetName: "OldUser",
        currTargetName: "NewUser",
      });
      expect(
        Log.renamedFrom(TargetType.Enum, "OldStatus", "NewStatus"),
      ).toEqual({
        message: "Renamed enum from `OldStatus` to `NewStatus`",
        action: Action.Renamed,
        targetKind: TargetType.Enum,
        prevTargetName: "OldStatus",
        currTargetName: "NewStatus",
      });
      expect(
        Log.renamedFrom(TargetType.ModelProperty, "oldName", "newName"),
      ).toEqual({
        message: "Renamed field from `oldName` to `newName`",
        action: Action.Renamed,
        targetKind: TargetType.ModelProperty,
        prevTargetName: "oldName",
        currTargetName: "newName",
      });
      expect(
        Log.renamedFrom(TargetType.EnumMember, "oldActive", "newActive"),
      ).toEqual({
        message: "Renamed member from `oldActive` to `newActive`",
        action: Action.Renamed,
        targetKind: TargetType.EnumMember,
        prevTargetName: "oldActive",
        currTargetName: "newActive",
      });
      expect(
        Log.renamedFrom(TargetType.Operation, "oldGetUser", "newGetUser"),
      ).toEqual({
        message: "Renamed operation from `oldGetUser` to `newGetUser`",
        action: Action.Renamed,
        targetKind: TargetType.Operation,
        prevTargetName: "oldGetUser",
        currTargetName: "newGetUser",
      });
      expect(Log.renamedFrom(TargetType.Union, "OldUnion", "NewUnion")).toEqual(
        {
          message: "Renamed union from `OldUnion` to `NewUnion`",
          action: Action.Renamed,
          targetKind: TargetType.Union,
          prevTargetName: "OldUnion",
          currTargetName: "NewUnion",
        },
      );
      expect(
        Log.renamedFrom(TargetType.UnionVariant, "oldVariant", "newVariant"),
      ).toEqual({
        message: "Renamed variant from `oldVariant` to `newVariant`",
        action: Action.Renamed,
        targetKind: TargetType.UnionVariant,
        prevTargetName: "oldVariant",
        currTargetName: "newVariant",
      });
      expect(
        Log.renamedFrom(TargetType.Scalar, "OldScalar", "NewScalar"),
      ).toEqual({
        message: "Renamed scalar from `OldScalar` to `NewScalar`",
        action: Action.Renamed,
        targetKind: TargetType.Scalar,
        prevTargetName: "OldScalar",
        currTargetName: "NewScalar",
      });
      expect(
        Log.renamedFrom(TargetType.Interface, "OldInterface", "NewInterface"),
      ).toEqual({
        message: "Renamed interface from `OldInterface` to `NewInterface`",
        action: Action.Renamed,
        targetKind: TargetType.Interface,
        prevTargetName: "OldInterface",
        currTargetName: "NewInterface",
      });
    });
  });

  describe("Log.typeChangedFrom", () => {
    it("should generate correct messages for model property type changes", () => {
      expect(Log.typeChangedFrom("age", "string", "int32")).toEqual({
        message: "Changed `age` field type from `string` to `int32`",
        action: Action.TypeChanged,
        targetKind: TargetType.ModelProperty,
        currTargetName: "age",
        prevDataType: "string",
        currDataType: "int32",
      });
      expect(Log.typeChangedFrom("id", "int32", "string")).toEqual({
        message: "Changed `id` field type from `int32` to `string`",
        action: Action.TypeChanged,
        targetKind: TargetType.ModelProperty,
        currTargetName: "id",
        prevDataType: "int32",
        currDataType: "string",
      });
      expect(Log.typeChangedFrom("email", "string", "EmailAddress")).toEqual({
        message: "Changed `email` field type from `string` to `EmailAddress`",
        action: Action.TypeChanged,
        targetKind: TargetType.ModelProperty,
        currTargetName: "email",
        prevDataType: "string",
        currDataType: "EmailAddress",
      });
    });
  });

  describe("Log.returnTypeChangedFrom", () => {
    it("should generate correct messages for operation return type changes", () => {
      expect(
        Log.returnTypeChangedFrom("getUser", "User", "UserResponse"),
      ).toEqual({
        message: "Changed `getUser` return type from `User` to `UserResponse`",
        action: Action.TypeChanged,
        targetKind: TargetType.Operation,
        currTargetName: "getUser",
        prevDataType: "User",
        currDataType: "UserResponse",
      });
      expect(Log.returnTypeChangedFrom("createUser", "void", "User")).toEqual({
        message: "Changed `createUser` return type from `void` to `User`",
        action: Action.TypeChanged,
        targetKind: TargetType.Operation,
        currTargetName: "createUser",
        prevDataType: "void",
        currDataType: "User",
      });
      expect(
        Log.returnTypeChangedFrom("deleteUser", "boolean", "void"),
      ).toEqual({
        message: "Changed `deleteUser` return type from `boolean` to `void`",
        action: Action.TypeChanged,
        targetKind: TargetType.Operation,
        currTargetName: "deleteUser",
        prevDataType: "boolean",
        currDataType: "void",
      });
    });
  });

  describe("Edge cases and special characters", () => {
    it("should handle names with special characters", () => {
      expect(Log.added(TargetType.ModelProperty, "user-name")).toEqual({
        message: "Added `user-name` field",
        action: Action.Added,
        targetKind: TargetType.ModelProperty,
        currTargetName: "user-name",
      });
      expect(Log.added(TargetType.ModelProperty, "user_name")).toEqual({
        message: "Added `user_name` field",
        action: Action.Added,
        targetKind: TargetType.ModelProperty,
        currTargetName: "user_name",
      });
      expect(Log.added(TargetType.ModelProperty, "user.name")).toEqual({
        message: "Added `user.name` field",
        action: Action.Added,
        targetKind: TargetType.ModelProperty,
        currTargetName: "user.name",
      });
    });

    it("should handle empty strings", () => {
      expect(Log.added(TargetType.ModelProperty, "")).toEqual({
        message: "Added `` field",
        action: Action.Added,
        targetKind: TargetType.ModelProperty,
        currTargetName: "",
      });
      expect(Log.removed(TargetType.ModelProperty, "")).toEqual({
        message: "Removed `` field",
        action: Action.Removed,
        targetKind: TargetType.ModelProperty,
        currTargetName: "",
      });
    });

    it("should handle very long names", () => {
      const longName = "a".repeat(100);
      expect(Log.added(TargetType.ModelProperty, longName)).toEqual({
        message: `Added \`${longName}\` field`,
        action: Action.Added,
        targetKind: TargetType.ModelProperty,
        currTargetName: longName,
      });
    });
  });
});
