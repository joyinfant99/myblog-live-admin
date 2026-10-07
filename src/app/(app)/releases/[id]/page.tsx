import ReleaseForm from '@/components/ReleaseForm';
export const metadata = { title: 'Edit release' };
export default function EditRelease({ params }: { params: { id: string } }) { return <ReleaseForm id={params.id} />; }
