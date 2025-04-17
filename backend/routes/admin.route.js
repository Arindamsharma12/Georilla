import express from 'express'
import { createOffice, getEmployeesByBranch,  getOfficesByCompany } from '../controllers/admin.controller.js';
const route = express.Router();


route.post('/office-register',createOffice);
route.post('/get-employees',getEmployeesByBranch);
route.get('/get-offices/:companyName',getOfficesByCompany);
export default route;