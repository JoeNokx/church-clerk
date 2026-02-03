import departmentModel from "../../models/ministryModel/departmentModel.js";

const createDepartment = async (req, res) => {
    
    try {
        const { name, description, mainMeetingDay, meetingTime, meetingVenue, roles, status } = req.body;

        if (!name) {
            return res.status(400).json({ message: "department name is required" });
        }

        const existing = await departmentModel.findOne({ name, church: req.activeChurch._id });
        if (existing) {
            return res.status(400).json({ message: "department name already exist" });
        }

        const department = await departmentModel.create({
            church: req.activeChurch._id,
            createdBy: req.user._id,
            name,
            description,
            mainMeetingDay,
            meetingTime,
            meetingVenue,
            roles,
            status
        });

        return res.status(201).json({ message: "department created successfully", department });
    } catch (error) {
        return res.status(400).json({ message: "department could not be created", error: error.message });
    }
}


const getAllDepartments = async (req, res) => {
    
    try {
        const query = { church: req.activeChurch._id };

        const departments = await departmentModel
            .find(query)
            .sort({ createdAt: -1 })
            .select("name description mainMeetingDay meetingTime meetingVenue roles status");

        if (!departments || departments.length === 0) {
            return res.status(200).json({ message: "No departments found", count: 0, departments: [] });
        }

        return res.status(200).json({ message: "departments found", count: departments.length, departments });
    } catch (error) {
        return res.status(400).json({ message: "departments could not be found", error: error.message });
    }
}


const getSingleDepartment = async (req, res) => {
    
    try {
        const { id } = req.params;
        const query = { _id: id, church: req.activeChurch._id };

        const department = await departmentModel.findOne(query);

        if (!department) {
            return res.status(404).json({ message: "department not found" });
        }

        return res.status(200).json({ message: "department found", department });
    } catch (error) {
        return res.status(400).json({ message: "department could not be found", error: error.message });
    }
}


const updateDepartment = async (req, res) => {
    
    try {
        const { id } = req.params;
        const query = { _id: id, church: req.activeChurch._id };

        const department = await departmentModel.findOneAndUpdate(query, req.body, {
            new: true,
            runValidators: true
        });

        if (!department) {
            return res.status(404).json({ message: "department not found" });
        }

        return res.status(200).json({ message: "department updated successfully", department });
    } catch (error) {
        return res.status(400).json({ message: "department could not be updated", error: error.message });
    }
}


const deleteDepartment = async (req, res) => {
    
    try {
        const { id } = req.params;
        const query = { _id: id, church: req.activeChurch._id };

        const department = await departmentModel.findOneAndDelete(query);

        if (!department) {
            return res.status(404).json({ message: "department not found" });
        }

        return res.status(200).json({ message: "department deleted successfully", department });
    } catch (error) {
        return res.status(400).json({ message: "department could not be deleted", error: error.message });
    }
}

export { createDepartment, getAllDepartments, getSingleDepartment, updateDepartment, deleteDepartment }