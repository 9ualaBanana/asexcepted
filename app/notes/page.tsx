import { createClient } from '@/lib/supabase/server';
import { Suspense } from "react";

async function NotesContent() {
  const supabase = await createClient();
  const { data: notes } = await supabase.from("notes").select();

  return <pre>{JSON.stringify(notes, null, 2)}</pre>
}

export default function Notes() {
  return (
    <Suspense fallback={<p>Loading notes...</p>}>
      <NotesContent />
    </Suspense>
  );
}