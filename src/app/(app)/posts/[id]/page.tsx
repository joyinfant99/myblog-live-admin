import { Suspense } from 'react';
import PostForm from '@/components/PostForm';
export const metadata = { title: 'Edit post' };
export default function EditPost({ params }: { params: { id: string } }) { return <Suspense><PostForm id={params.id} /></Suspense>; }
