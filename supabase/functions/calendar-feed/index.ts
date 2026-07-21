// Supabase Edge Function: calendar-feed
// Generates a live .ics calendar feed from your todo_sessions table.
//
// Deploy with:
//   supabase functions deploy calendar-feed --project-ref ipiuhnopkycycirspeky
//
// Then subscribe to this URL in Google/Apple Calendar:
//   https://ipiuhnopkycycirspeky.supabase.co/functions/v1/calendar-feed
//
// Environment: Deno (Supabase Edge Runtime)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all sessions that have been allocated to a date
    const { data: sessions, error: sessErr } = await supabase
      .from("todo_sessions")
      .select("*")
      .not("allocated_date", "is", null)
      .order("allocated_date", { ascending: true });

    if (sessErr) throw sessErr;

    // Fetch all sub-events
    const { data: events, error: evErr } = await supabase
      .from("session_events")
      .select("*");

    if (evErr) throw evErr;

    // Build iCalendar output
    let ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CalmTodo//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:CalmTodo",
      "X-WR-TIMEZONE:UTC",
    ];

    const now = new Date();
    const timestamp = formatICSTimestamp(now);

    for (const session of sessions || []) {
      const dateClean = session.allocated_date.replace(/-/g, "");

      // Parent session as an all-day event
      ics.push("BEGIN:VEVENT");
      ics.push(`UID:session-${session.id}@calmtodo`);
      ics.push(`DTSTAMP:${timestamp}`);
      ics.push(`DTSTART;VALUE=DATE:${dateClean}`);
      ics.push(`DTEND;VALUE=DATE:${dateClean}`);
      ics.push(`SUMMARY:${escapeICS(session.title)}`);
      if (session.notes) {
        ics.push(`DESCRIPTION:${escapeICS(session.notes)}`);
      }
      ics.push(`STATUS:${session.completed ? "COMPLETED" : "CONFIRMED"}`);
      ics.push("END:VEVENT");

      // Sub-events with specific times
      const subEvents = (events || []).filter(
        (e) => e.session_id === session.id
      );
      for (const sub of subEvents) {
        ics.push("BEGIN:VEVENT");
        ics.push(`UID:event-${sub.id}@calmtodo`);
        ics.push(`DTSTAMP:${timestamp}`);

        if (sub.event_time) {
          // Timed event
          const timeClean = sub.event_time.replace(/:/g, "");
          ics.push(`DTSTART:${dateClean}T${timeClean}00`);
          // Default 1hr duration
          const [h, m] = sub.event_time.split(":").map(Number);
          const endH = String(h + 1).padStart(2, "0");
          const endM = String(m).padStart(2, "0");
          ics.push(`DTEND:${dateClean}T${endH}${endM}00`);
        } else {
          // All-day sub-event
          ics.push(`DTSTART;VALUE=DATE:${dateClean}`);
          ics.push(`DTEND;VALUE=DATE:${dateClean}`);
        }

        ics.push(
          `SUMMARY:${escapeICS(sub.title)} (${escapeICS(session.title)})`
        );
        if (sub.location) {
          ics.push(`LOCATION:${escapeICS(sub.location)}`);
        }
        const catLabel = sub.category || "general";
        ics.push(`CATEGORIES:${catLabel.toUpperCase()}`);
        ics.push(`STATUS:${sub.completed ? "COMPLETED" : "CONFIRMED"}`);
        ics.push("END:VEVENT");
      }
    }

    ics.push("END:VCALENDAR");

    const icsBody = ics.join("\r\n");

    return new Response(icsBody, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="calmtodo.ics"',
        // Tell Google Calendar to re-fetch frequently
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("calendar-feed error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatICSTimestamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
}

function escapeICS(str: string): string {
  if (!str) return "";
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
