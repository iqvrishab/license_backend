import License from '../models/License.js';
import { createHmac, randomBytes } from 'crypto';
import { runMonitoringSyncOnce } from '../jobs/monitoringSync.js';
// Email notifications disabled for now

// Check license validity
export async function checkLicense(req, res) {
  try {
    const { licenseKey } = req.params;
    const license = await License.findOne({ licenseKey });

    if (!license) {
      return res.status(404).json({ valid: false, message: 'License not found' });
    }

    if (license.status === 'inactive') {
      return res.status(400).json({ valid: false, message: 'License is inactive' });
    }

    if (new Date() > new Date(license.expiryDate) || license.status === 'expired') {
      await License.updateOne({ licenseKey }, { status: 'expired' });
      return res.status(400).json({ valid: false, message: 'License has expired' });
    }

    // Generate HMAC for verification
    const data = `${licenseKey}|${license.clientId}|${new Date(license.expiryDate).toISOString()}`;
    const hmac = createHmac('sha256', process.env.HMAC_SECRET)
      .update(data)
      .digest('hex');

    res.json({
      valid: true,
      clientId: license.clientId,
      expiryDate: license.expiryDate,
      hmac,
      email: license.email, 
      instanceId: license.instanceId,
    });
  } catch (error) {
    console.error('License validation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// Generate or retrieve a license (for admin use)
export async function generateLicense(req, res) {
  try {
    const { 
      clientId, 
      expiryDate, 
      email, 
      application, 
      licenseType,
      clientName, 
      clientEmail, 
      identiqaName, 
      identiqaEmail 
    } = req.body;

    if (!clientId || !expiryDate || !email || !application) {
      return res.status(400).json({ message: 'clientId, expiryDate, email, and application are required' });
    }

    // Try to find existing active, non-expired license for this client and application
    let license = await License.findOne({ clientId, application, status: 'active' });
    if (license) {
      if (!license.instanceId) {
        license.instanceId = randomBytes(16).toString('hex');
        await license.save();
      }
      if (new Date() < new Date(license.expiryDate)) {
        const data = `${license.licenseKey}|${license.clientId}|${new Date(license.expiryDate).toISOString()}`;
        const hmac = createHmac('sha256', process.env.HMAC_SECRET)
          .update(data)
          .digest('hex');
        return res.json({
          licenseKey: license.licenseKey,
          instanceId: license.instanceId,
          clientId: license.clientId,
          expiryDate: license.expiryDate,
          hmac,
        });
      }
      // Expire the old one
      license.status = 'expired';
      await license.save();
    }

    // Create a new license
    const licenseKey = randomBytes(16).toString('hex');
    const instanceId = randomBytes(16).toString('hex');
    const isoExpiry = new Date(expiryDate).toISOString();
    const data = `${licenseKey}|${clientId}|${isoExpiry}`;
    const hmac = createHmac('sha256', process.env.HMAC_SECRET)
      .update(data)
      .digest('hex');

    license = new License({
      licenseKey,
      instanceId,
      clientId,
      clientName,
      clientEmail,
      identiqaName,
      identiqaEmail,
      expiryDate: new Date(expiryDate),
      status: 'active',
      email,
      application,
      licenseType: licenseType ? String(licenseType).toLowerCase() : undefined,
    });
    await license.save();

    // Email notifications removed

    res.status(201).json({
      licenseKey,
      instanceId,
      clientId,
      expiryDate,
      hmac,
      application,
      licenseType: license.licenseType,
    });
  } catch (error) {
    console.error('License generation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// Get all licenses
export async function getAllLicenses(req, res) {
  try {
    const licenses = await License.find();
    res.json(licenses);
  } catch (error) {
    console.error('Error fetching licenses:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

//Delete Licenses

// Delete license by licenseKey
export async function deleteLicense(req, res) {
  try {
    const { licenseKey } = req.params;

    const deleted = await License.findOneAndDelete({ licenseKey });

    if (!deleted) {
      return res.status(404).json({ message: 'License not found' });
    }

    res.json({ message: 'License deleted successfully' });
  } catch (error) {
    console.error('Error deleting license:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// Update license by licenseKey
export async function updateLicense(req, res) {
  try {
    const { licenseKey } = req.params;
    const cleanKey = licenseKey.trim();
    const { expiryDate, status } = req.body;

    const updateData = {};
    if (expiryDate) updateData.expiryDate = new Date(expiryDate);
    if (status) updateData.status = status;

    const updatedLicense = await License.findOneAndUpdate(
      { licenseKey },
      { $set: updateData },
      { new: true }
    );

    if (!updatedLicense) {
      return res.status(404).json({ message: 'License not found' });
    }

    res.json({
      message: 'License updated successfully',
      license: updatedLicense,
    });
  } catch (error) {
    console.error('Error updating license:', error);
    res.status(500).json({ message: 'Server error' });
  }
}


// POST /api/check-license (new version using both licenseKey + instanceId)
export async function checkLicensePost(req, res) {
  try {
    const { licenseKey, instanceId } = req.body;

    if (!licenseKey || !instanceId) {
      return res.status(400).json({ valid: false, message: 'licenseKey and instanceId are required' });
    }

    const license = await License.findOne({ licenseKey, instanceId });

    if (!license) {
      return res.status(404).json({ valid: false, message: 'License not found for this instance' });
    }

    if (license.status === 'inactive') {
      return res.status(400).json({ valid: false, message: 'License is inactive' });
    }

    if (new Date() > new Date(license.expiryDate) || license.status === 'expired') {
      await License.updateOne({ licenseKey }, { status: 'expired' });
      return res.status(400).json({ valid: false, message: 'License has expired' });
    }

    // HMAC with instanceId
    const expiryISO = new Date(license.expiryDate).toISOString();
    const data = `${licenseKey}|${instanceId}|${expiryISO}`;
    const hmac = createHmac('sha256', process.env.HMAC_SECRET)
      .update(data)
      .digest('hex');

    return res.json({
      valid: true,
      clientId: license.clientId,
      instanceId: license.instanceId,
      expiryDate: expiryISO,
      hmac,
    });
  } catch (error) {
    console.error('POST License validation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// Admin: trigger a one-off monitoring sync
export async function syncMonitoringNow(req, res) {
  try {
    await runMonitoringSyncOnce();
    res.json({ message: 'Monitoring sync executed' });
  } catch (error) {
    console.error('Manual monitoring sync error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}
