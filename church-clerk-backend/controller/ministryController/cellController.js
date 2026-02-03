import cellModel from '../../models/ministryModel/cellModel.js'

const createCell = async (req, res) => {
    
    try {
        const { name, description, mainMeetingDay, meetingTime, meetingVenue, status } = req.body;

        if (!name) {
            return res.status(400).json({ message: "cell name is required" });
        }

        const existing = await cellModel.findOne({ name, church: req.activeChurch._id });
        if (existing) {
            return res.status(400).json({ message: "cell name already exist" });
        }

        const cell = await cellModel.create({
            church: req.activeChurch._id,
            createdBy: req.user._id,
            name,
            description,
            mainMeetingDay,
            meetingTime,
            meetingVenue,
            status
        });

        return res.status(201).json({ message: "cell created successfully", cell });
    } catch (error) {
        return res.status(400).json({ message: "cell could not be created", error: error.message });
    }
}



const getAllCells = async (req, res) => {
    
    try {
        const query = { church: req.activeChurch._id };

        const cells = await cellModel
            .find(query)
            .sort({ createdAt: -1 })
            .select("name description mainMeetingDay meetingTime meetingVenue status");

        if (!cells || cells.length === 0) {
            return res.status(200).json({ message: "No cells found", count: 0, cells: [] });
        }

        return res.status(200).json({ message: "cells found", count: cells.length, cells });
    } catch (error) {
        return res.status(400).json({ message: "cells could not be found", error: error.message });
    }
}

const getSingleCell = async (req, res) => {
    
    try {
        const { id } = req.params;
        const query = { _id: id, church: req.activeChurch._id };

        const cell = await cellModel.findOne(query);

        if (!cell) {
            return res.status(404).json({ message: "cell not found" });
        }

        return res.status(200).json({ message: "cell found", cell });
    } catch (error) {
        return res.status(400).json({ message: "cell could not be found", error: error.message });
    }
}


const updateCell = async (req, res) => {
    
    try {
        const { id } = req.params;
        const query = { _id: id, church: req.activeChurch._id };

        const cell = await cellModel.findOneAndUpdate(query, req.body, {
            new: true,
            runValidators: true
        });

        if (!cell) {
            return res.status(404).json({ message: "cell not found" });
        }

        return res.status(200).json({ message: "cell updated successfully", cell });
    } catch (error) {
        return res.status(400).json({ message: "cell could not be updated", error: error.message });
    }
}


const deleteCell = async (req, res) => {
    
    try {
        const { id } = req.params;
        const query = { _id: id, church: req.activeChurch._id };

        const cell = await cellModel.findOneAndDelete(query);
        if (!cell) {
            return res.status(404).json({ message: "cell not found" });
        }

        return res.status(200).json({ message: "cell deleted successfully", cell });
    } catch (error) {
        return res.status(400).json({ message: "cell could not be deleted", error: error.message });
    }
}



export { createCell, getAllCells, getSingleCell, updateCell, deleteCell }
