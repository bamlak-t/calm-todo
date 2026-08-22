import { supabase } from "../../services/supabase";

// Get sessions with their events

export async function getSessions() {
  const { data, error } = await supabase
    .from("todo_sessions")
    .select(
      `
            *,
            session_events (
                id,
                title,
                category,
                event_time,
                duration_mins,
                location,
                completed,
                sort_order
            )
        `,
    )
    .order("rank");

  if (error) {
    throw error;
  }

  return data;
}

export async function createSession(session) {
  const { data, error } = await supabase
    .from("todo_sessions")
    .insert(session)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateSession(id, updates) {
  const { data, error } = await supabase
    .from("todo_sessions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateEvent(id, updates) {
  const { data, error } = await supabase
    .from("session_events")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteSession(id) {
  const { error } = await supabase.from("todo_sessions").delete().eq("id", id);

  if (error) {
    throw error;
  }
}