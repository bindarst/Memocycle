import { useLocalSearchParams } from "expo-router";
import { CourseForm } from "../../src/ui/CourseForm";
export default function NewCourse() {
  const p = useLocalSearchParams<{ subjectId?: string; moduleId?: string }>();
  return <CourseForm subjectId={p.subjectId} moduleId={p.moduleId} />;
}
