import { Suspense } from 'react';
import NoteEditor from '@/components/NoteEditor';
export const metadata = { title: 'New note' };
export default function NewNote() { return <Suspense><NoteEditor /></Suspense>; }
