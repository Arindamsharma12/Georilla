import { Office } from '../models/office.model.js';
import { User } from '../models/userSchema.model.js'; // Ensure this is correct

// ➕ Create a new office
const createOffice = async (req, res) => {
  try {
    const { branchName, officeCoordinates, companyName, radius } = req.body;

    const office = await Office.create({
      branchName,
      officeCoordinates,
      companyName,
      radius,
    });

    res.status(201).json({
      success: true,
      message: 'Office created successfully',
      office,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating office', error: error.message });
  }
};

// 📄 Get all offices with employee count
const getAllOffices = async (req, res) => {
  try {
    const offices = await Office.find();

    // Attach virtual field manually since virtuals with async require a workaround
    const officesWithEmployeeCount = await Promise.all(
      offices.map(async (office) => {
        const employeeCount = await User.countDocuments({
          companyName: office.companyName,
          branchName: office.branchName,
        });
        return { ...office.toObject(), employeeCount };
      })
    );

    res.status(200).json({ success: true, offices: officesWithEmployeeCount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching offices', error: error.message });
  }
};

// 🔍 Get single office by branch
const getEmployeesByBranch = async (req, res) => {
  try {
    const { branchName, companyName } = req.body;

    const employees = await User.find({ branchName, companyName });

    if (!employees || employees.length === 0) {
      return res.status(404).json({ success: false, message: "No employees found for this branch" });
    }

    const results = await Promise.all(
      employees.map(async (employee) => {
        const employeeCount = await User.countDocuments({
          companyName: employee.companyName,
          branchName: employee.branchName,
        });

        return {
          ...employee.toObject(),
          employeeCount,
        };
      })
    );

    res.status(200).json({ success: true, offices: results });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching offices", error: error.message });
  }
};

const getOfficesByCompany = async (req, res) => {
  try {
    const { companyName } = req.params;

    const offices = await Office.find({ companyName });

    if (!offices || offices.length === 0) {
      return res.status(404).json({ success: false, message: "No offices found for this company name" });
    }

    const results = await Promise.all(
      offices.map(async (office) => {
        const employeeCount = await User.countDocuments({
          companyName: office.companyName,
          branchName: office.branchName,
        });

        return {
          ...office.toObject(),
          employeeCount,
        };
      })
    );

    res.status(200).json({ success: true, offices: results });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching offices", error: error.message });
  }
};

// ❌ Delete office
const deleteOffice = async (req, res) => {
  try {
    const { id } = req.params;
    const office = await Office.findByIdAndDelete(id);

    if (!office) {
      return res.status(404).json({ success: false, message: 'Office not found' });
    }

    res.status(200).json({ success: true, message: 'Office deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting office', error: error.message });
  }
};

export {
  createOffice,
  getAllOffices,
  getEmployeesByBranch,
  getOfficesByCompany,
  deleteOffice
}