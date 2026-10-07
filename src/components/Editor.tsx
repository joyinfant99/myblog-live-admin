'use client';

import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false, loading: () => <div className="card h-[420px] animate-pulse" /> });

const toolbar = (images: boolean) => ({
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    [{ script: 'sub' }, { script: 'super' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ color: [] }, { background: [] }],
    images ? ['link', 'image'] : ['link'],
    ['clean'],
  ],
  clipboard: { matchVisual: false },
});
const withImages = toolbar(true);
const textOnly = toolbar(false);

/** onChange also reports the source: 'user' for real typing, 'api' for Quill normalising loaded content. */
export default function Editor({ value, onChange, images = true, placeholder = 'Start writing…' }: { value: string; onChange: (v: string, source: string) => void; images?: boolean; placeholder?: string }) {
  return <ReactQuill theme="snow" value={value} onChange={(v, _delta, source) => onChange(v, source)} modules={images ? withImages : textOnly} placeholder={placeholder} />;
}
