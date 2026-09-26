import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

async function test() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const { data: users } = await supabase.from('users').select('*').limit(1);
  if (!users || users.length === 0) return console.log("No users found");
  
  const user = users[0];
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  try {
    const res = await gmail.users.labels.create({
      userId: 'me',
      requestBody: {
        name: 'TestLabel123',
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show'
      }
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.log("Error creating label:", err.message, err.response?.data);
  }
}

test();
