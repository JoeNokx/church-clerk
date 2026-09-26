import Program from "../../models/programModel.js";


// DELETE
const deleteProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: id };

    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }

    const program = await Program.findOneAndDelete(query);

    if (!program) {
      return res.status(404).json({ message: "Program not found or access denied" });
    }

    return res.status(200).json({ message: "Program deleted successfully" });
  } catch (error) {
    console.error("Delete program error:", error);
    return res.status(500).json({ message: "Failed to delete program", error: error.message });
  }
};

export default deleteProgram;