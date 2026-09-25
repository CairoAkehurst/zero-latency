import { z } from 'zod';
import { zAddress } from './api';

// 25 MB is Gmail's limit for a message; base64 inflates by 4/3.
const MAX_ATTACHMENT_B64 = 34_000_000;

export const zOutgoing = z.object({
  to: z.array(zAddress).max(100),
  cc: z.array(zAddress).max(100).default([]),
  bcc: z.array(zAddress).max(100).default([]),
  subject: z.string().max(998).default(''),
  html: z.string().max(5_000_000),
  text: z.string().max(5_000_000),
  attachments: z.array(z.object({
    filename: z.string().min(1).max(255),
    mimeType: z.string().max(255),
    data: z.string().regex(/^[A-Za-z0-9+/=\s]*$/, 'attachment data must be base64'),
  })).max(30).default([]),
  threadId: z.string().max(64).optional(),
  inReplyTo: z.string().max(998).optional(),
  references: z.string().max(8000).optional(),
}).refine((m) => m.attachments.reduce((n, a) => n + a.data.length, 0) <= MAX_ATTACHMENT_B64, 'Attachments exceed 25 MB.');
