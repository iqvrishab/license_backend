// src/routes/licenseRoutes.js
import { Router } from 'express';
const router = Router();
import {
  checkLicensePost,
  generateLicense,
  getAllLicenses,
  deleteLicense,
  updateLicense,
  checkLicense,
  syncMonitoringNow
} from '../controllers/licenseController.js';

router.get('/check-license/:licenseKey', checkLicense);
router.post('/check-license', checkLicensePost); // ← ✅ New POST version

router.post('/generate-license', generateLicense);
router.get('/all-licenses', getAllLicenses);
router.delete('/delete-license/:licenseKey', deleteLicense);
router.put('/update-license/:licenseKey', updateLicense); // ✅ This line is required
router.post('/sync-monitoring-now', syncMonitoringNow);


export default router;
