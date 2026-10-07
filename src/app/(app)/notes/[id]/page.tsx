import { Suspense } from 'react';
import NoteEditor from '@/components/NoteEditor';
export const metadata = { title: 'Note' };
export default function EditNote({ params }: { params: { id: string } }) { return <Suspense><NoteEditor id={params.id} /></Suspense>; }
