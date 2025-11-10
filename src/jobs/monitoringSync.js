import mongoose from 'mongoose';
import License from '../models/License.js';

// Reads documents from monitoring databases and updates License docs
export async function runMonitoringSyncOnce() {
  const now = new Date();
  let totalUpdated = 0;
  let totalProcessed = 0;

  // Try to sync from NMS_monitoring.NMS_info
  try {
    const monitoringConn = mongoose.connection.useDb('NMS_monitoring');
    const infoCollection = monitoringConn.db.collection('NMS_info');

    const cursor = infoCollection.find({});
    let count = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      totalProcessed++;
      const instanceId = doc.instanceId || doc.instanceID || doc.instance_id;
      const licenseKey = doc.licenseKey || doc.license_key;

      if (!instanceId && !licenseKey) {
        continue;
      }

      const update = {
        totalHosts: typeof doc.totalHosts === 'number' ? doc.totalHosts : undefined,
        NMSVersion: doc.NMSVersion || undefined,
        zabbixVersion: doc.zabbixVersion || undefined,
        version: doc.version || undefined,
        lastMonitoringSyncAt: now,
      };

      // remove undefined keys to avoid overwriting
      Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

      if (Object.keys(update).length === 0) continue;

      // Try to find license by instanceId first, then licenseKey
      let query = {};
      if (instanceId) {
        query = { instanceId };
      } else if (licenseKey) {
        query = { licenseKey };
      } else {
        continue;
      }

      const result = await License.updateOne(query, { $set: update });
      
      if (result.modifiedCount > 0) {
        totalUpdated++;
        count++;
        console.log(`[monitoringSync] Updated license: ${instanceId || licenseKey}, totalHosts: ${update.totalHosts}, version: ${update.zabbixVersion || update.NMSVersion || update.version}`);
      } else if (result.matchedCount === 0) {
        console.log(`[monitoringSync] No matching license found for: ${instanceId || licenseKey}`);
      }
    }

    if (count > 0) {
      console.log(`[monitoringSync] Updated ${count} licenses from NMS_monitoring.NMS_info`);
    }
  } catch (err) {
    console.error('[monitoringSync] Error syncing from NMS_monitoring.NMS_info:', err.message);
  }

  // Try to sync from zabbix_monitoring database (if it exists)
  try {
    const zabbixConn = mongoose.connection.useDb('zabbix_monitoring');
    const zabbixInfoCollection = zabbixConn.db.collection('zabbix_info');
    
    const cursor = zabbixInfoCollection.find({});
    let count = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      totalProcessed++;
      const instanceId = doc.instanceId || doc.instanceID || doc.instance_id;
      const licenseKey = doc.licenseKey || doc.license_key;

      if (!instanceId && !licenseKey) {
        continue;
      }

      const update = {
        totalHosts: typeof doc.totalHosts === 'number' ? doc.totalHosts : undefined,
        zabbixVersion: doc.zabbixVersion || doc.version || undefined,
        version: doc.version || undefined,
        lastMonitoringSyncAt: now,
      };

      // remove undefined keys to avoid overwriting
      Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

      if (Object.keys(update).length === 0) continue;

      // Try to find license by instanceId first, then licenseKey
      let query = {};
      if (instanceId) {
        query = { instanceId };
      } else if (licenseKey) {
        query = { licenseKey };
      } else {
        continue;
      }

      const result = await License.updateOne(query, { $set: update });
      
      if (result.modifiedCount > 0) {
        totalUpdated++;
        count++;
        console.log(`[monitoringSync] Updated license: ${instanceId || licenseKey}, totalHosts: ${update.totalHosts}, version: ${update.zabbixVersion || update.NMSVersion || update.version}`);
      } else if (result.matchedCount === 0) {
        console.log(`[monitoringSync] No matching license found for: ${instanceId || licenseKey}`);
      }
    }

    if (count > 0) {
      console.log(`[monitoringSync] Updated ${count} licenses from zabbix_monitoring.zabbix_info`);
    }
  } catch (err) {
    // Silently fail if zabbix_monitoring database doesn't exist
    if (err.message && !err.message.includes('does not exist')) {
      console.error('[monitoringSync] Error syncing from zabbix_monitoring:', err.message);
    }
  }

  // Also check if there's a collection in the main database
  try {
    const mainDb = mongoose.connection.db;
    const collections = ['zabbix_info', 'monitoring_info', 'license_info'];
    
    for (const collectionName of collections) {
      try {
        const collection = mainDb.collection(collectionName);
        const cursor = collection.find({});
        let count = 0;

        while (await cursor.hasNext()) {
          const doc = await cursor.next();
          totalProcessed++;
          const instanceId = doc.instanceId || doc.instanceID || doc.instance_id;
          const licenseKey = doc.licenseKey || doc.license_key;

          if (!instanceId && !licenseKey) {
            continue;
          }

          const update = {
            totalHosts: typeof doc.totalHosts === 'number' ? doc.totalHosts : undefined,
            zabbixVersion: doc.zabbixVersion || doc.version || undefined,
            NMSVersion: doc.NMSVersion || undefined,
            version: doc.version || undefined,
            lastMonitoringSyncAt: now,
          };

          // remove undefined keys to avoid overwriting
          Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

          if (Object.keys(update).length === 0) continue;

          const query = instanceId ? { instanceId } : { licenseKey };
          const result = await License.updateOne(query, { $set: update });
          
          if (result.modifiedCount > 0) {
            totalUpdated++;
            count++;
          }
        }

        if (count > 0) {
          console.log(`[monitoringSync] Updated ${count} licenses from main database.${collectionName}`);
        }
      } catch (colErr) {
        // Collection doesn't exist, skip
        continue;
      }
    }
  } catch (err) {
    console.error('[monitoringSync] Error checking main database collections:', err.message);
  }

  if (totalUpdated > 0) {
    console.log(`[monitoringSync] Sync completed: ${totalUpdated} licenses updated out of ${totalProcessed} documents processed`);
  } else if (totalProcessed === 0) {
    console.log('[monitoringSync] No monitoring documents found to sync');
  }
}

export function startMonitoringSyncScheduler(intervalMs = 5 * 60 * 1000) {
  // run immediately once
  runMonitoringSyncOnce();
  // then on interval
  return setInterval(runMonitoringSyncOnce, intervalMs);
}


