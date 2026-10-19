'use client';import {useParams} from 'next/navigation';import QuestionEditor from '@/components/QuestionEditor';
export default function EditQuestion(){const {id}=useParams<{id:string}>();return <QuestionEditor id={id}/>;}
