import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: String },
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'GRAPHQL'] },
    endpoint: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    statusCode: { type: Number },
    status: { type: String, enum: ['success', 'failure', 'warning'], default: 'success' },
    details: { type: mongoose.Schema.Types.Mixed },
    duration: { type: Number },
    errorMessage: { type: String },
  },
  {
    timestamps: true,
    // Audit logs are append-only — never modify
    strict: true,
  }
);

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
