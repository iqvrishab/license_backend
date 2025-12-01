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
  syncMonitoringNow,
  updateMonitoringUsage   // ⬅️ new import
} from '../controllers/licenseController.js';

router.get('/check-license/:licenseKey', checkLicense);
router.post('/check-license', checkLicensePost);

router.post('/generate-license', generateLicense);
router.get('/all-licenses', getAllLicenses);
router.delete('/delete-license/:licenseKey', deleteLicense);
router.put('/update-license/:licenseKey', updateLicense);
router.post('/sync-monitoring-now', syncMonitoringNow);

// ⬅️ new endpoint that receives host count + version
router.post('/check-license/usage', updateMonitoringUsage);

export default router;

