
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
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing 'url' parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the raw iCal file
    const res = await fetch(targetUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch calendar: ${res.status} ${res.statusText}`);
    }
    const icsData = await res.text();

    const results = [];
    const lines = icsData.split(/\r?\n/);
    
    let inEvent = false;
    let currentEvent = {};

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Handle folded lines (iCal format wraps lines with a leading space)
      while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
        i++;
        line += lines[i].substring(1);
      }

      if (line === 'BEGIN:VEVENT') {
        inEvent = true;
        currentEvent = {};
      } else if (line === 'END:VEVENT') {
        inEvent = false;
        if (currentEvent.start) {
          results.push({
            summary: currentEvent.summary || 'Busy',
            date: currentEvent.start
          });
        }
      } else if (inEvent) {
        if (line.startsWith('SUMMARY:')) {
          currentEvent.summary = line.substring(8);
        } else if (line.startsWith('DTSTART')) {
          // Format could be DTSTART:20231024T120000Z or DTSTART;VALUE=DATE:20231024
          const parts = line.split(':');
          if (parts.length > 1) {
            const dateStr = parts[1].trim(); // e.g. 20231024T...
            if (dateStr.length >= 8) {
              const yyyy = dateStr.substring(0, 4);
              const mm = dateStr.substring(4, 6);
              const dd = dateStr.substring(6, 8);
              currentEvent.start = `${yyyy}-${mm}-${dd}`;
            }
          }
        }
      }
    }

    return new Response(JSON.stringify(results), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("ical-proxy error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
