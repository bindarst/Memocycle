import { useLocalSearchParams } from "expo-router";
import { CourseForm } from "../../../src/ui/CourseForm";
export default function EditCourse() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CourseForm id={id} />;
}
