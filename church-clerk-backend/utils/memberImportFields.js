import Member from "../models/memberModel.js";

// Single source of truth for the member fields shared by:
// - the Excel import template (downloadMembersImportTemplate)
// - the import validator (memberImportService)
// - the public self-registration payload (publicRegistrationController)
// Enum lists are pulled from the Member schema so model changes flow everywhere.
export const memberFieldEnum = (path) =>
  Member.schema.path(path)?.enumValues || Member.schema.path(path)?.options?.enum || [];

// key:   payload/model field name
// raw:   lowercase spreadsheet header key produced by the parser
// aliases: extra header spellings accepted on upload
// kind:  "phone" | "date" | "org" | undefined (plain text)
// lower: lowercase the value during normalization
// required / enum / example drive validation + template generation
export const MEMBER_IMPORT_FIELDS = [
  { key: "firstName", raw: "firstname", aliases: ["first"], label: "First Name", required: true, example: "John" },
  { key: "lastName", raw: "lastname", aliases: ["last"], label: "Last Name", required: true, example: "Doe" },
  { key: "phoneNumber", raw: "phonenumber", aliases: ["phone"], label: "Phone", required: true, kind: "phone", example: "0240000000" },
  { key: "email", raw: "email", label: "Email", lower: true, example: "john@example.com" },
  { key: "gender", raw: "gender", label: "Gender", enum: "gender", lower: true, example: "male" },
  { key: "occupation", raw: "occupation", label: "Occupation", example: "Teacher" },
  { key: "nationality", raw: "nationality", label: "Nationality", example: "Ghanaian" },
  { key: "status", raw: "status", label: "Status", enum: "status", lower: true, example: "active" },
  { key: "ageGroup", raw: "agegroup", label: "Age Group", enum: "ageGroup", lower: true, example: "adult" },
  { key: "dateOfBirth", raw: "dateofbirth", aliases: ["dob"], label: "Date of Birth", kind: "date", example: "1990-01-15" },
  { key: "churchRole", raw: "churchrole", aliases: ["role"], label: "Church Role", example: "Member" },
  { key: "dateJoined", raw: "datejoined", label: "Date Joined", kind: "date", example: "2025-01-05" },
  { key: "streetAddress", raw: "streetaddress", aliases: ["address"], label: "Street Address", example: "" },
  { key: "city", raw: "city", label: "City", example: "Accra" },
  { key: "region", raw: "region", label: "Region", example: "Greater Accra" },
  { key: "country", raw: "country", label: "Country", example: "Ghana" },
  { key: "maritalStatus", raw: "maritalstatus", label: "Marital Status", enum: "maritalStatus", lower: true, example: "single" },
  { key: "note", raw: "note", label: "Note", example: "" }
];
