import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "./prisma.js";
import { encrypt, decrypt } from "./crypto.js";
import * as logger from "./logger.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_CALENDAR_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI || "";

// ─────────────────────────────────────────────
// OAuth2 client factory
// ─────────────────────────────────────────────

export function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_CALENDAR_REDIRECT_URI
  );
}

// ─────────────────────────────────────────────
// Token management
// ─────────────────────────────────────────────

export async function getAuthedClient(sellerId: string): Promise<OAuth2Client | null> {
  const integration = await prisma.googleIntegration.findUnique({
    where: { sellerId },
  });
  if (!integration) return null;

  const oauth2Client = createOAuth2Client();

  try {
    const refreshToken = decrypt(integration.refreshToken);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // Force a token refresh to get a fresh access token
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    // Update token expiry in DB if changed
    if (credentials.expiry_date) {
      await prisma.googleIntegration.update({
        where: { sellerId },
        data: { tokenExpiresAt: new Date(credentials.expiry_date) },
      });
    }

    return oauth2Client;
  } catch (err) {
    logger.error(`[Google Calendar] Échec refresh token pour sellerId=${sellerId}`, err);
    return null;
  }
}

// ─────────────────────────────────────────────
// Create Google Calendar event with Meet
// ─────────────────────────────────────────────

interface CreateMeetingParams {
  title: string;
  startTime: Date;
  durationMinutes: number;
  location?: string;
  attendees: { email: string }[];
  reference: string; // Used as requestId for Meet auto-creation
  sellerTimezone?: string;
}

interface MeetingResult {
  meetingUrl: string | null;
  eventId: string;
  htmlLink: string;
}

export async function createMeetingEvent(
  sellerId: string,
  params: CreateMeetingParams
): Promise<MeetingResult | null> {
  const oauth2Client = await getAuthedClient(sellerId);
  if (!oauth2Client) {
    logger.log(`[Google Calendar] Pas de client OAuth pour sellerId=${sellerId}, skip Meet`);
    return null;
  }

  const integration = await prisma.googleIntegration.findUnique({
    where: { sellerId },
    select: { calendarId: true },
  });

  const calendarId = integration?.calendarId || "primary";

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const endTime = new Date(params.startTime.getTime() + params.durationMinutes * 60 * 1000);

  try {
    const event = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      requestBody: {
        summary: params.title,
        location: params.location || "Google Meet",
        start: {
          dateTime: params.startTime.toISOString(),
          timeZone: params.sellerTimezone || "Africa/Dakar",
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: params.sellerTimezone || "Africa/Dakar",
        },
        attendees: params.attendees,
        conferenceData: {
          createRequest: {
            requestId: params.reference,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 60 },
            { method: "popup", minutes: 15 },
          ],
        },
      },
    });

    const rawMeetUrl = event.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === "video"
    )?.uri || event.data.hangoutLink || null;

    // Sanitize: only accept https URLs (prevent javascript: or other protocol injection)
    const meetingUrl = rawMeetUrl?.startsWith("https://") ? rawMeetUrl : null;

    logger.log(`[Google Calendar] Event créé — eventId=${event.data.id}, meetUrl=${meetingUrl}`);

    return {
      meetingUrl,
      eventId: event.data.id || "",
      htmlLink: event.data.htmlLink || "",
    };
  } catch (err) {
    logger.error(`[Google Calendar] Erreur création event pour sellerId=${sellerId}`, err);
    return null;
  }
}

// ─────────────────────────────────────────────
// Cancel a Google Calendar event
// ─────────────────────────────────────────────

export async function cancelCalendarEvent(
  sellerId: string,
  eventId: string
): Promise<boolean> {
  const oauth2Client = await getAuthedClient(sellerId);
  if (!oauth2Client) {
    logger.log(`[Google Calendar] Pas de client OAuth pour sellerId=${sellerId}, skip cancel`);
    return false;
  }

  const integration = await prisma.googleIntegration.findUnique({
    where: { sellerId },
    select: { calendarId: true },
  });

  const calendarId = integration?.calendarId || "primary";
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    // sendUpdates: "all" → Google envoie un email d'annulation aux participants
    await calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: "all",
    });

    logger.log(`[Google Calendar] Event supprimé — eventId=${eventId}, sellerId=${sellerId}`);
    return true;
  } catch (err) {
    logger.error(`[Google Calendar] Erreur suppression event eventId=${eventId}`, err);
    return false;
  }
}
