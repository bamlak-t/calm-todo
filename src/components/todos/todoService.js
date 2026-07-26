import { supabase } from "../../services/supabase";

export async function getTodos() {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("created_at");

  if (error) {
    throw error;
  }

  return data;
}

export async function createTodo(todo) {
  const { data, error } = await supabase
    .from("todos")
    .insert(todo)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
