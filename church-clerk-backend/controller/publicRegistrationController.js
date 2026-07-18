import Church from "../models/churchModel.js";
import Member from "../models/memberModel.js";
import { validatePhoneNumber } from "../utils/validatePhoneNumber.js";
import { getChurchPrefix, generateMemberId, parseOptionalDate } from "../utils/memberHelpers.js";

export const getChurchByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const church = await Church.findOne({
      registrationToken: token,
      registrationTokenActive: true
    }).lean();

    if (!church) {
      return res.status(404).json({ message: "Registration link is invalid or has been revoked." });
    }

    return res.status(200).json({
      church: {
        name: church.name,
        pastor: church.pastor,
        city: church.city,
        country: church.country,
        type: church.type,
        currency: church.currency
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong. Please try again.", error: error.message });
  }
};

export const selfRegisterMember = async (req, res) => {
  try {
    const { token } = req.params;

    const church = await Church.findOne({
      registrationToken: token,
      registrationTokenActive: true
    });

    if (!church) {
      return res.status(404).json({ message: "Registration link is invalid or has been revoked." });
    }

    const {
      firstName,
      lastName,
      phoneNumber,
      email,
      gender,
      occupation,
      nationality,
      dateOfBirth,
      streetAddress,
      city,
      region,
      country,
      maritalStatus,
      churchRole,
      dateJoined
    } = req.body;

    if (!firstName || !String(firstName).trim()) {
      return res.status(400).json({ message: "First name is required." });
    }
    if (!lastName || !String(lastName).trim()) {
      return res.status(400).json({ message: "Last name is required." });
    }
    if (!phoneNumber || !String(phoneNumber).trim()) {
      return res.status(400).json({ message: "Phone number is required." });
    }

    let validatedPhone;
    try {
      validatedPhone = validatePhoneNumber(phoneNumber, "GH");
    } catch (e) {
      return res.status(400).json({ message: e?.message || "Invalid phone number." });
    }

    const duplicate = await Member.findOne({
      church: church._id,
      phoneNumber: validatedPhone
    }).lean();
    if (duplicate) {
      return res.status(409).json({ message: "A member with this phone number is already registered." });
    }

    const prefix = await getChurchPrefix(church._id);
    const updatedChurch = await Church.findByIdAndUpdate(
      church._id,
      { $inc: { memberSerial: 1 } },
      { new: true }
    );
    const memberId = generateMemberId(prefix || "CH", updatedChurch.memberSerial - 1);

    const { date: dob } = parseOptionalDate(dateOfBirth);
    const { date: joined } = parseOptionalDate(dateJoined);

    const createdBy = church.createdBy;

    const member = await Member.create({
      memberId,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: email ? String(email).trim().toLowerCase() : undefined,
      phoneNumber: validatedPhone,
      gender: gender || undefined,
      occupation: occupation || undefined,
      nationality: nationality || undefined,
      dateOfBirth: dob || undefined,
      streetAddress: streetAddress || undefined,
      city: city || undefined,
      region: region || undefined,
      country: country || "Ghana",
      maritalStatus: maritalStatus || undefined,
      churchRole: churchRole || undefined,
      dateJoined: joined || new Date(),
      status: "active",
      church: church._id,
      createdBy
    });

    const totalMembers = await Member.countDocuments({ church: church._id });
    await Church.findByIdAndUpdate(church._id, { memberCount: totalMembers });

    return res.status(201).json({
      message: "Registration successful! Welcome to the church.",
      memberId: member.memberId
    });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed. Please try again.", error: error.message });
  }
};
