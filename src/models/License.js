import { Schema, model } from 'mongoose';

const licenseSchema = new Schema({
  licenseKey: {
    type: String,
    required: true,
    unique: true,
  },
  instanceId: {
    type: String,
    required: true,
    unique: true,
  },
  clientId: {
    type: String,
    required: true,
  },
  clientName: { type: String },
  clientEmail: { type: String },
  identiqaName: { type: String },
  identiqaEmail: { type: String },
  email: { // 👈 New field added here
    type: String,
    required: true,
    lowercase: true,
    match: [/.+@.+\..+/, 'Please enter a valid email address']
  },
  licenseType: {
    type: String,
    enum: ['trial', 'paid', 'perpetual'],
    default: 'trial',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active',
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  application: {
    type: String,
    required: true,
    enum: ['NMS', 'grafana', 'VAPT'],
  },
  // Monitoring sync fields (populated from NMS_monitoring.NMS_info)
  totalHosts: { type: Number, default: 0 },
  NMSVersion: { type: String },
  zabbixVersion: { type: String },
  version: { type: String },
  lastMonitoringSyncAt: { type: Date },
}, {
  timestamps: true // Adds createdAt and updatedAt fields automatically
});

export default model('License', licenseSchema);