import { Suspense } from 'react';
import PostForm from '@/components/PostForm';
export const metadata = { title: 'New post' };
export default function NewPost() { return <Suspense><PostForm /></Suspense>; }
