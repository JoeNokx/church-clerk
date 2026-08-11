import OutreachTeam from "../../models/outreachModel/outreachTeamModel.js";

const populateTeam = (query) =>
  query.populate("members.member", "firstName lastName photoUrl phoneNumber");

// ── Get all teams ─────────────────────────────────────────────────
export const getTeams = async (req, res) => {
  try {
    const churchId = req.activeChurch._id;
    const teams = await populateTeam(
      OutreachTeam.find({ church: churchId }).sort({ createdAt: -1 })
    );
    return res.status(200).json({ data: teams });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Get single team ───────────────────────────────────────────────
export const getTeamById = async (req, res) => {
  try {
    const team = await populateTeam(
      OutreachTeam.findOne({ _id: req.params.teamId, church: req.activeChurch._id })
    );
    if (!team) return res.status(404).json({ message: "Team not found" });
    return res.status(200).json({ data: team });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Create team ───────────────────────────────────────────────────
export const createTeam = async (req, res) => {
  try {
    const { name, description, members } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Team name is required" });

    const team = await OutreachTeam.create({
      church: req.activeChurch._id,
      name: name.trim(),
      description: description?.trim() || "",
      members: Array.isArray(members) ? members.filter((m) => m.member) : [],
      createdBy: req.user._id,
    });

    const populated = await populateTeam(OutreachTeam.findById(team._id));
    return res.status(201).json({ message: "Team created", data: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Update team ───────────────────────────────────────────────────
export const updateTeam = async (req, res) => {
  try {
    const { name, description, members } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (description !== undefined) update.description = description.trim();
    if (Array.isArray(members)) update.members = members.filter((m) => m.member);

    const team = await OutreachTeam.findOneAndUpdate(
      { _id: req.params.teamId, church: req.activeChurch._id },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!team) return res.status(404).json({ message: "Team not found" });

    const populated = await populateTeam(OutreachTeam.findById(team._id));
    return res.status(200).json({ message: "Team updated", data: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Delete team ───────────────────────────────────────────────────
export const deleteTeam = async (req, res) => {
  try {
    const team = await OutreachTeam.findOneAndDelete({ _id: req.params.teamId, church: req.activeChurch._id });
    if (!team) return res.status(404).json({ message: "Team not found" });
    return res.status(200).json({ message: "Team deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
