// Single source of truth for member fields shared by:
// - MemberFormPage (normal member registration form — the reference)
// - JoinPage (public registration link form)
// - MembersPage (Excel import preview + inline row editor)
//
// Option lists mirror the member form. MEMBER_IMPORT_FIELDS mirrors the
// backend utils/memberImportFields.js — keep the two aligned so the Excel
// template, validator, preview table and row editor stay in sync.

export const MEMBER_STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Dormant", value: "dormant" },
  { label: "Transferred", value: "transferred" },
  { label: "Left Church", value: "left_church" },
  { label: "Deceased", value: "deceased" },
  { label: "Temporarily Away", value: "temporarily_away" },
];

export const MEMBER_GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

export const MEMBER_AGE_GROUP_OPTIONS = [
  { label: "Children", value: "children" },
  { label: "Teenagers", value: "teenagers" },
  { label: "Youth", value: "youth" },
  { label: "Adult", value: "adult" },
  { label: "Elderly", value: "elderly" },
];

export const MEMBER_MARITAL_STATUS_OPTIONS = [
  { label: "Single", value: "single" },
  { label: "Married", value: "married" },
  { label: "Divorced", value: "divorced" },
  { label: "Widowed", value: "widowed" },
  { label: "Other", value: "other" },
];

// key: payload field name | raw: lowercase spreadsheet header key
// kind: "phone" | "date" | "org" | undefined (plain text)
export const MEMBER_IMPORT_FIELDS = [
  { key: "firstName", raw: "firstname", label: "First Name", required: true },
  { key: "lastName", raw: "lastname", label: "Last Name", required: true },
  { key: "phoneNumber", raw: "phonenumber", label: "Phone", required: true, kind: "phone" },
  { key: "email", raw: "email", label: "Email" },
  { key: "gender", raw: "gender", label: "Gender", options: MEMBER_GENDER_OPTIONS },
  { key: "occupation", raw: "occupation", label: "Occupation" },
  { key: "nationality", raw: "nationality", label: "Nationality" },
  { key: "status", raw: "status", label: "Status", options: MEMBER_STATUS_OPTIONS },
  { key: "ageGroup", raw: "agegroup", label: "Age Group", options: MEMBER_AGE_GROUP_OPTIONS },
  { key: "dateOfBirth", raw: "dateofbirth", label: "Date of Birth", kind: "date" },
  { key: "churchRole", raw: "churchrole", label: "Church Role" },
  { key: "dateJoined", raw: "datejoined", label: "Date Joined", kind: "date" },
  { key: "streetAddress", raw: "streetaddress", label: "Street Address" },
  { key: "city", raw: "city", label: "City" },
  { key: "region", raw: "region", label: "Region" },
  { key: "country", raw: "country", label: "Country" },
  { key: "maritalStatus", raw: "maritalstatus", label: "Marital Status", options: MEMBER_MARITAL_STATUS_OPTIONS },
  { key: "note", raw: "note", label: "Note" },
];
